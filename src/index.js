// Since we declared the script as type=module in the HTML file,
// we can use ES Modules (adapted from the Vue 2 Introduction
// https://vuejs.org/v2/guide/#Declarative-Rendering

// Alternatively, omit the .min from the path for Vue debugging purposes.
import Vue from '../node_modules/vue/dist/vue.esm.browser.min.js';

let api = window.muspnpapi;
dayjs.extend(dayjs_plugin_duration);

/**
 * Convert a duration string to an dayjs duration object.
 *
 * @param {string} strDuration e.g. "0:00:55" or "00:00:55"
 * @returns {*}
 */
function toDuration(strDuration) {
    return dayjs.duration({
        hours: parseInt(strDuration.substr(0, strDuration.indexOf(':'))),
        minutes: parseInt(strDuration.slice(-5, -3)),
        seconds: parseInt(strDuration.slice(-2)),
    });
}

window.app = new Vue({
    el: '#app',
    data: {
        showSpinner: true,
        error: null,
        refreshErrors: 0,
        libraryObjectsCache: null,
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
        search: null,
        searchResults: null,
    },
    watch: {
        currentMediaServer: function (device) {
            this.libraryObjectsCache = null;
            this.selectedItem = [];
            this.showSpinner = true;
            api.selectServer({usn: device.usn})
                .then(() => this.browse({id: 0, start: 0, count: 0}))
                .then(() => api.getSearchCapabilities())
                .then((searchCapabilities) => {
                    this.searchCapabilities = searchCapabilities.split(',').filter((prop) => ['dc:title','upnp:album','upnp:artist'].includes(prop))
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
        search: function (search) {
            const searchStr = this.searchCapabilities.map(sc => `${sc} contains "${search}"`).join(' or ')
            this.searchResults = null;
            return api
                .search({id: 0, start: 0, count: 0, search: searchStr})
                .then(result => this.searchResults = result)
        }
    },
    created: function () {
        const app = this;
        const handler = {
            get(target, propKey) {
                // Proxy API for automatic error cleanup
                // NB: api is a frozen object so we're a bit restricted here...
                app.error = null;
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
            if (this.search && this.searchResults) {
                return this.searchResults.Result;
            }
            if (this.currentContainer == null) {
                return this.libraryObjectsCache?.data?.[0]?.Result;
            }
            return this.libraryObjectsCache?.data?.[this.currentContainer['@_id']]?.Result
        }
    },
    methods: {
        browse: function ({id, start, count}) {
            this.showSpinner = true;
            return api.browse({id, start, count})
                .then(res => {
                    if (!this.libraryObjectsCache?.data) {
                        this.libraryObjectsCache = {
                            data: {},
                            fifo: [],
                        }
                    }
                    // Update cache if cache miss or UpdateID changed
                    if (res.UpdateID == null || this.libraryObjectsCache.data?.[id]?.UpdateID !== res.UpdateID) {
                        // Also freeze res because we don't need reactivity on this potentially big structure
                        this.$set(this.libraryObjectsCache.data, id, Object.freeze(res));
                    }
                    // Always keep track of effective cache use & remove old entries
                    // This is suboptimal because we will fill the fifo with duplicates, but it should work well enough in most cases
                    this.libraryObjectsCache.fifo.push(String(id));
                    if (this.libraryObjectsCache.fifo.length > 20) {
                        const removeId = this.libraryObjectsCache.fifo.shift();
                        if (!this.libraryObjectsCache.fifo.includes(removeId)) {
                            this.$delete(this.libraryObjectsCache.data, removeId);
                        }
                    }
                })
                .catch(err => this.error = err)
                .then(() => this.showSpinner = false);
        },
        back: function () {
            const popped = this.selectedItem.pop();
            this.browse({id: popped['@_parentID'], start: 0, count: 0});
        },
        selectItem: function (item) {
            if (item['upnp:class'].startsWith('object.container')) {
                this.search = null;
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
            this._refresh();
            if (this.refreshTimer) {
                clearInterval(this.refreshTimer);
            }
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
        seek: function (e) {
            if (this._currentPosition_duration == null || this._currentPosition_currentPosition == null) {
                return;
            }
            this.stopRefresh();
            const x = e.pageX - e.target.offsetLeft
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
            const x = e.pageX - e.target.offsetLeft;
            const volumePercent = Math.round(x * e.target.max / e.target.offsetWidth);
            this.currentVolume = volumePercent;
            api.setVolume({desiredVolume: volumePercent});
        }
    },
    filters: {
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
})

