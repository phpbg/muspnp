// Since we declared the script as type=module in the HTML file,
// we can use ES Modules

// Alternatively, omit the .prod from the path for Vue debugging purposes.
import {createApp, nextTick} from '../node_modules/vue/dist/vue.esm-browser.prod.js';
import debounce from '../node_modules/lodash-es/debounce.js'

let api = window.muspnpapi;
dayjs.extend(dayjs_plugin_duration);

/**
 * Create an object that can be used as a cache and that remain observable
 * @param {number} sizeHint Limit to prevent unlimited growth
 * @returns {{}}
 */
function createObservableCache(sizeHint = 20) {
    const cache = {};
    const fifo = [];
    const handler = {
        get: function(obj, prop) {
            return obj[prop];
        },
        set: function(obj, prop, value) {
            obj[prop] = value;
            // Always keep track of effective cache use & remove old entries
            // This is suboptimal because we will fill the fifo with duplicates, but it should work well enough in most cases
            fifo.push(String(prop));
            if (fifo.length > sizeHint) {
                const removeId = fifo.shift();
                if (!fifo.includes(removeId)) {
                    delete obj[removeId];
                }
            }
            return true;
        }
    };
    return new Proxy(cache, handler);
}

/**
 * Convert a duration string to an dayjs duration object.
 *
 * @param {string} strDuration e.g. "0:00:55" or "00:00:55", or even "0:00:00.000" (Rygel)
 * @returns {*}
 */
const toDurationRegex = /([0-9]+):([0-9]+):([0-9]+)/;
function toDuration(strDuration) {
    const res = toDurationRegex.exec(strDuration);
    if (! res || res.length < 4) {
        return null;
    }
    return dayjs.duration({
        hours: parseInt(res[1]),
        minutes: parseInt(res[2]),
        seconds: parseInt(res[3]),
    });
}

window.app = createApp({
    data: function() {
        return {
            showSpinner: true,
            error: null,
            refreshErrors: 0,
            libraryObjectsCache: createObservableCache(),
            selectedItem: [],
            playlist: null,
            currentPlayingItem: null,
            currentPositionInfo: null,
            currentMediaServer: '',
            currentMediaRenderer: '',
            availableMediaServers: null,
            availableMediaRenderers: null,
            refreshTimer: null,
            transportInfo: null,
            currentVolume: null,
            searchCapabilities: null,
            searchTerm: null,
            searchCache: createObservableCache()
        }
    },
    watch: {
        currentMediaServer: function (device) {
            this.showSpinner = true;
            this.libraryObjectsCache = createObservableCache();
            this.searchTerm = null;
            this.searchCache = createObservableCache()
            this.selectedItem = [];
            this.searchCapabilities = null;
            api.selectServer({usn: device.usn})
                .then(() => this.browse({id: 0, start: 0, count: 0}))
                .then(() => api.getSearchCapabilities().catch(() => null))
                .then((searchCapabilities) => {
                    if (searchCapabilities) {
                        this.searchCapabilities = searchCapabilities.split(',').filter((prop) => ['dc:title','upnp:album','upnp:artist'].includes(prop))
                    }
                })
                .then(() => this.showSpinner = false)
                .catch(err => this.error = err);
        },
        currentMediaRenderer: function (device, oldDevice) {
            (oldDevice == null || oldDevice === '' ? Promise.resolve() : this.stop())
                .catch(() => null)
                .then(() => api.selectRenderer({usn: device.usn}))
                .then(() => this.startRefresh(5000))
                .then(() => {
                    return api.getVolume()
                        .then((currentVolume) => this.currentVolume = currentVolume)
                        .catch(() => this.currentVolume = null)
                })
                .catch(err => this.error = err);
        },
        isStopped: function (stopped) {
            // Autoplay if we have more objects within same parent, and not of image type
            if (stopped && this.currentPlayingItem != null && this.playlist != null && !(this.currentPlayingItem['upnp:class'] || '').startsWith('object.item.imageItem')) {
                const currIdx = this.playlist.indexOf(this.currentPlayingItem);
                if (currIdx + 1 < this.playlist.length) {
                    this._play(this.playlist[currIdx + 1]);
                } else {
                    this.currentPlayingItem = null;
                }
            }
        },
        searchTerm: function (search) {
            this.search(search);
        },
    },
    created: function () {
        const app = this;
        const handler = {
            get(target, propKey) {
                // Proxy API for automatic error cleanup
                // NB: api is a frozen object so we're a bit restricted here...
                if (! ['getPositionInfo', 'getTransportInfo'].includes(propKey)) {
                    app.error = null;
                }
                return target[propKey];
            }
        };
        api = new Proxy(api, handler);

        api.onDevice(() => {
            Promise.all([
                api.getRenderers().then(renderers => this.availableMediaRenderers = renderers),
                api.getServers().then(servers => this.availableMediaServers = servers),
            ])
                .then(() => this.showSpinner = false)
                .catch(err => this.error = err);
        });
        api
            .ssdpSearch()
            .catch(err => this.error = err);

        this.search = debounce(this._search, 400);
    },
    computed: {
        currentContainer: function () {
            if (this.selectedItem.length === 0) {
                return null;
            }
            return this.selectedItem[this.selectedItem.length - 1];
        },
        isPaused: function () {
            return this.transportInfo?.CurrentTransportState === 'PAUSED_PLAYBACK';
        },
        isStopped: function () {
            return this.transportInfo?.CurrentTransportState === 'STOPPED';
        },
        isPlaying: function () {
            return this.transportInfo?.CurrentTransportState === 'PLAYING';
        },
        isPending: function () {
            return [undefined, null, 'TRANSITIONING', 'NO_MEDIA_PRESENT', 'RECORDING', 'PAUSED_RECORDING'].includes(this.transportInfo?.CurrentTransportState);
        },
        _currentPosition_duration: function () {
            if (this.currentPositionInfo == null) {
                return null;
            }
            return toDuration(this.currentPositionInfo.TrackDuration);
        },
        _currentPosition_currentPosition: function () {
            if (this.currentPositionInfo == null) {
                return null;
            }
            return toDuration(this.currentPositionInfo.RelTime);
        },
        currentPositionPercent: function () {
            if (this._currentPosition_currentPosition == null || this._currentPosition_duration == null) {
                return 0;
            }
            if (this._currentPosition_duration.asSeconds() === 0) {
                return 0;
            }
            return Math.round(100 * this._currentPosition_currentPosition.asSeconds() / this._currentPosition_duration.asSeconds());
        },
        currentPositionRemaining: function () {
            if (this._currentPosition_currentPosition == null || this._currentPosition_duration == null) {
                return null;
            }
            return this._currentPosition_duration.subtract(this._currentPosition_currentPosition).format('HH:mm:ss')
        },
        currentPositionProgress: function () {
            if (this._currentPosition_currentPosition == null) {
                return '00:00:00';
            }
            return this._currentPosition_currentPosition.format('HH:mm:ss')
        },
        libraryObjects: function () {
            if (this.searchTerm) {
                return this.searchCache[this.searchTerm]?.Result;
            }
            if (this.currentContainer == null) {
                return this.libraryObjectsCache?.[0]?.Result;
            }
            return this.libraryObjectsCache?.[this.currentContainer['@_id']]?.Result
        }
    },
    methods: {
        browse: function ({id, start, count}) {
            this.showSpinner = true;
            return api.browse({id, start, count})
                .then(res => {
                    // Update cache if cache miss or UpdateID changed
                    if (res.UpdateID == null || this.libraryObjectsCache?.[id]?.UpdateID !== res.UpdateID) {
                        // Also freeze res because we don't need reactivity on this potentially big structure
                        this.libraryObjectsCache[id] = Object.freeze(res);
                    }
                })
                .catch(err => this.error = err)
                .then(() => this.showSpinner = false);
        },
        back: function () {
            const popped = this.selectedItem.pop();
            return nextTick()
                .then(() => {
                    if (popped._scrollTop) {
                        // We can scroll because we waited for nextTick and contents should have been loaded from cache
                        window.scrollTo(0, popped._scrollTop);
                        popped._scrollTop = null;
                    }
                })
                .then(() => this.browse({id: popped['@_parentID'], start: 0, count: 0})); // refresh cache anyway
        },
        selectItem: function (item) {
            if (item['upnp:class'].startsWith('object.container')) {
                if (! this.searchTerm) {
                    item._scrollTop = document.documentElement.scrollTop
                }
                this.searchTerm = null;
                this.selectedItem.push(item);
                this.browse({id: item['@_id'], start: 0, count: 0});
                return;
            }
            if (item['upnp:class'].startsWith('object.item')) {
                this.playlist = this.libraryObjects;
                this._play(item);
                return;
            }
            this.error = `Unable to play item : ${item['upnp:class']}`;
        },
        _play(item) {
            this.currentPlayingItem = item;
            return api
                .play({id: item['@_id'], uri: item?.res?.['#text']})
                .then(() => this.startRefresh())
                .catch(err => {
                    this.currentPlayingItem = null;
                    this.error = err;
                });
        },
        _refresh() {
            return Promise.all([
                api.getPositionInfo().then((positionInfo) => this.currentPositionInfo = positionInfo),
                api.getTransportInfo().then((transportInfo) => this.transportInfo = transportInfo),
            ])

        },
        startRefresh: function (timeout = 1000) {
            this.refreshErrors = 0;
            if (this.refreshTimer) {
                clearInterval(this.refreshTimer);
            }
            this._refresh();
            this.refreshTimer = setInterval(() => {
                this._refresh()
                    .catch(err => {
                        this.refreshErrors++;
                        if (this.refreshErrors >= 5) {
                            this.error = err;
                            this.stopRefresh();
                        }
                    });
            }, timeout);
        },
        stopRefresh: function () {
            if (this.refreshTimer) {
                clearInterval(this.refreshTimer);
                this.refreshTimer = null;
            }
        },
        resume: function () {
            return api
                .resume()
                .then(() => this.startRefresh())
                .catch(err => this.error = err);
        },
        pause: function () {
            return api
                .pause()
                .then(() => this.startRefresh(2000))
                .catch(err => this.error = err);
        },
        stop: function () {
            this.currentPositionInfo = null;
            this.currentPlayingItem = null;
            return api
                .stop()
                .then(() => this.startRefresh(5000))
                .catch(err => this.error = err);
        },
        _search: function (searchTerm) {
            const search = (searchTerm || '').trim();
            if (search.length === 0) {
                return;
            }
            this.showSpinner = true;
            const searchStr = this.searchCapabilities.map(sc => `${sc} contains "${search}"`).join(' or ')
            return api
                .search({id: 0, start: 0, count: 0, search: searchStr})
                .then(result => {
                    // If no results found, try harder to find
                    if (parseInt(result.TotalMatches) === 0 && search.indexOf(' ') >= 0) {
                        const searchStr = search
                            .split(' ')
                            .filter(term => term.length>0)
                            .map((term) => '( ' + this.searchCapabilities.map(sc => `${sc} contains "${term}"`).join(' or ') + ' )')
                            .join(' and ')
                        return api
                            .search({id: 0, start: 0, count: 0, search: searchStr})
                    }
                    if (result.UpdateID == null || this.searchCache?.[searchTerm]?.UpdateID !== result.UpdateID) {
                        this.searchCache[searchTerm] = result;
                    }
                    return null;
                })
                .then(result => {
                    if (result === null) {
                        return;
                    }
                    if (result.UpdateID == null || this.searchCache?.[searchTerm]?.UpdateID !== result.UpdateID) {
                        this.searchCache[searchTerm] = result;
                    }
                })
                .then(() => this.showSpinner = false)
        },
        seek: function (e) {
            if (this._currentPosition_duration == null || this._currentPosition_currentPosition == null) {
                return;
            }
            this.stopRefresh();
            const x = e.pageX - e.target.offsetLeft - e.target.offsetParent.offsetLeft;
            const seekPercent = x * e.target.max / e.target.offsetWidth;
            const seekToSecond = Math.round(seekPercent * this._currentPosition_duration.asSeconds() / 100);
            return api
                .seek({
                    at: dayjs.duration(1000 * seekToSecond).format('HH:mm:ss'),
                })
                .then(() => this.startRefresh())
                .catch(err => this.error = err);
        },
        setVolume: function (e) {
            const x = e.pageX - e.target.offsetLeft - e.target.offsetParent.offsetLeft;
            const volumePercent = Math.round(x * e.target.max / e.target.offsetWidth);
            this.currentVolume = volumePercent;
            api.setVolume({desiredVolume: volumePercent});
        },
        toIcon: function (item) {
            if (item['upnp:class'].startsWith('object.container')) {
                return '📁';
            }
            if (item['upnp:class'].startsWith('object.item.audioItem')) {
                return '🎵';
            }
            if (item['upnp:class'].startsWith('object.item.videoItem')) {
                return '📹';
            }
            if (item['upnp:class'].startsWith('object.item.imageItem')) {
                return '🖼';
            }
            return '[]';
        }
    }
}).mount('#app')

