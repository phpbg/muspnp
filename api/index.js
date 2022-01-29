'use strict';

const logger = require('./src/loggerFactory')();
const Client = require('node-ssdp').Client;
const client = new Client({reuseAddr: false, explicitSocketBind: true, customLogger: logger});
const Server = require('node-ssdp').Server;
const server = new Server({suppressRootDeviceAdvertisements: true});
const axios = require('./src/axios');
const EventEmitter = require('events');
const eventEmitter = new EventEmitter();
const deviceFactory = require('./src/DeviceFactory');
const MediaServer = require('./src/MediaServer');
const MediaRenderer = require('./src/MediaRenderer');

const ssdpDevices = {};
let currentMediaServer;
let currentMediaRenderer;

server.on('advertise-alive', function (headers) {
    logger('SSDP event:\n%s', JSON.stringify(headers, null, '  '))
    addDeviceFromSsdpHeaders(headers);
});
server.on('advertise-bye', function (headers) {
    logger('SSDP event:\n%s', JSON.stringify(headers, null, '  '))
    if (ssdpDevices[headers.USN]) {
        if (currentMediaServer && currentMediaServer === ssdpDevices[headers.USN]) {
            currentMediaServer = null;
        }
        if (currentMediaRenderer && currentMediaRenderer === ssdpDevices[headers.USN]) {
            currentMediaRenderer = null;
        }
        delete ssdpDevices[headers.USN];
        eventEmitter.emit('device')
    }
});
server.start();
process.on('exit', function () {
    server.stop();
})

client.on('notify', function () {
    logger('Got a notification.')
})

client.on('response', function (headers, statusCode, rinfo) {
    if (statusCode !== 200) {
        return
    }
    logger('Got a response to an m-search:\n%d\n%s\n%s', statusCode, JSON.stringify(headers, null, '  '), JSON.stringify(rinfo, null, '  '))
    addDeviceFromSsdpHeaders(headers);
});

function addDeviceFromSsdpHeaders(headers) {
    if (!headers.LOCATION) {
        return
    }
    if (ssdpDevices[headers.USN]) {
        return;
    }
    if (!headers.USN || !(/MediaServer:[0-5]$/.test(headers.USN) || /MediaRenderer:[0-5]$/.test(headers.USN))) {
        return
    }
    ssdpDevices[headers.USN] = axios.get(headers.LOCATION)
        .then(function (response) {
            const device = deviceFactory.createFromXml(response.data, headers.LOCATION)
            ssdpDevices[headers.USN] = device;
            eventEmitter.emit('device', device)
            return device;
        })
        .catch(function (error) {
            // handle error
            logger(error);
            ssdpDevices[headers.USN] = null;
        });
}

const ssdpStart = function () {
    return client.start();
}

const ssdpStop = function () {
    return client.stop();
}

const ssdpSearch = function () {
    //client.search('urn:schemas-upnp-org:service:ContentDirectory:1');
    client.search('ssdp:all');
}

const _getDevices = function (type) {
    return Object.keys(ssdpDevices)
        .filter(usn => ssdpDevices[usn] instanceof type)
        .map(usn => {
            return {
                usn,
                name: ssdpDevices[usn].getName()
            }
        })
}

/**
 * Return discovered renderers
 * @returns {{usn: *, name: *}[]}
 */
const getRenderers = function () {
    return _getDevices(MediaRenderer);
}

/**
 * Return discovered renderers
 * @returns {{usn: *, name: *}[]}
 */
const getServers = function () {
    return _getDevices(MediaServer);
}

/**
 * Set current active renderer
 * @param {string} usn
 */
const selectRenderer = function ({usn}) {
    if (ssdpDevices[usn] == null) {
        throw new Error(`No such device ${usn}`);
    }
    currentMediaRenderer = ssdpDevices[usn]
}

/**
 * Set current active server
 * @param {string} usn
 */
const selectServer = function ({usn}) {
    if (ssdpDevices[usn] == null) {
        throw new Error(`No such device ${usn}`);
    }
    currentMediaServer = ssdpDevices[usn]
}

const browse = function ({id, start, count}) {
    if (currentMediaServer == null) {
        return Promise.reject(new Error('No media server selected'));
    }
    return currentMediaServer.browse({id, start, count});
}

const getSearchCapabilities = function () {
    if (currentMediaServer == null) {
        return Promise.reject(new Error('No media server selected'));
    }
    return currentMediaServer.getSearchCapabilities();
}

/**
 *
 * @param id
 * @param [uri] Optional URI (allows fallback if getting metadata fails)
 */
const play = function ({id, uri}) {
    if (currentMediaRenderer == null) {
        return Promise.reject(new Error('No renderer selected'));
    }
    return currentMediaRenderer.getTransportInfo({instanceID: 0})
        .then((transportInfo) => {
            if ([undefined, null, 'NO_MEDIA_PRESENT', 'STOPPED'].includes(transportInfo?.CurrentTransportState)) {
                return Promise.resolve();
            }
            // We need to stop before playing new media (some renderers don't support changing URI while playing)
            return currentMediaRenderer.stop({instanceID: 0});
        })
        .then(() => {
            return currentMediaServer
                .getMetadata({id})
                .catch((err) => {
                    // Allows for a fallback if getting metadata fails (PlainUPnP server)
                    if (uri == null) {
                        throw err;
                    }
                    return {object: {res: {'#text': uri}}}
                })
        })
        .then((metadata) => {
            let res = metadata?.object?.res;
            if (Array.isArray(res) && res.length > 0) {
                /**
                 * Multiple values are allowed for resource description
                 * Arbitrary take the first one
                 * TODO see if there is a better choice here
                 * Example :
                 * [
                 *   {"#text":"http://192.168.1.1:38719/foo.mp3","@_size":"5289384","@_duration":"0:02:12.000","@_bitrate":"40000","@_nrAudioChannels":"2","@_sampleFrequency":"44100","@_protocolInfo":"http-get:*:audio/mpeg:DLNA.ORG_PN=MP3;DLNA.ORG_OP=01;DLNA.ORG_FLAGS=01700000000000000000000000000000"},
                 *   {"#text":"http://192.168.1.1:38719/foo.lpcm","@_duration":"0:02:12.000","@_bitrate":"176400","@_bitsPerSample":"16","@_nrAudioChannels":"2","@_sampleFrequency":"44100","@_protocolInfo":"http-get:*:audio/L16;rate=44100;channels=2:DLNA.ORG_PN=LPCM;DLNA.ORG_OP=10;DLNA.ORG_CI=1;DLNA.ORG_FLAGS=01700000000000000000000000000000"},
                 *   {"#text":"http://192.168.1.1:38719/foo.adts","@_duration":"0:02:12.000","@_sampleFrequency":"256","@_protocolInfo":"http-get:*:audio/vnd.dlna.adts:DLNA.ORG_PN=AAC_ADTS_320;DLNA.ORG_OP=10;DLNA.ORG_CI=1;DLNA.ORG_FLAGS=01700000000000000000000000000000"}
                 * ]
                 */
                res = res[0];
            }
            if (res == null || res['#text'] == null) {
                throw new Error("Unable to understand resource");
            }
            return currentMediaRenderer.setAVTransportURI({
                instanceID: 0,
                currentURI: res['#text'],
                currentUriMetadata: metadata.xml
            })
        })
        .then(() => currentMediaRenderer.play({instanceID: 0, speed: 1}));
}

const getPositionInfo = function () {
    return currentMediaRenderer.getPositionInfo({instanceID: 0});
}

const getTransportInfo = function () {
    return currentMediaRenderer.getTransportInfo({instanceID: 0});
}

const resume = function () {
    if (currentMediaRenderer == null) {
        return Promise.reject(new Error('No renderer selected'));
    }
    return currentMediaRenderer.play({instanceID: 0, speed: 1});
}

const pause = function () {
    if (currentMediaRenderer == null) {
        return Promise.reject(new Error('No renderer selected'));
    }
    return currentMediaRenderer.pause({instanceID: 0});
}

const stop = function () {
    if (currentMediaRenderer == null) {
        return Promise.reject(new Error('No renderer selected'));
    }
    return currentMediaRenderer.stop({instanceID: 0});
}

const seek = function ({at}) {
    if (currentMediaRenderer == null) {
        return Promise.reject(new Error('No renderer selected'));
    }
    return currentMediaRenderer.seek({instanceID: 0, unit: 'REL_TIME', target: at})
}

const search = function ({id, start, count, search}) {
    if (currentMediaServer == null) {
        return Promise.reject(new Error('No media server selected'));
    }
    return currentMediaServer.search({id, start, count, search})
}

const getVolumeDBRange = function () {
    if (currentMediaRenderer == null) {
        return Promise.reject(new Error('No renderer selected'));
    }
    return currentMediaRenderer.getVolumeDBRange({instanceID: 0});
}

const getVolumeDB = function () {
    if (currentMediaRenderer == null) {
        return Promise.reject(new Error('No renderer selected'));
    }
    return currentMediaRenderer.getVolumeDB({instanceID: 0});
}

const getVolume = function () {
    if (currentMediaRenderer == null) {
        return Promise.reject(new Error('No renderer selected'));
    }
    return currentMediaRenderer.getVolume({instanceID: 0});
}

const setVolume = function ({desiredVolume}) {
    if (currentMediaRenderer == null) {
        return Promise.reject(new Error('No renderer selected'));
    }
    return currentMediaRenderer
        .setMute({instanceID: 0, desiredMute: false}) // Try to unmute first but catch any error on this
        .catch(() => null)
        .then(() => currentMediaRenderer.setVolume({instanceID: 0, desiredVolume}));
}

module.exports = {
    browse,
    play,
    resume,
    pause,
    stop,
    search,
    seek,
    ssdpStart,
    ssdpSearch,
    ssdpStop,
    getRenderers,
    getServers,
    selectRenderer,
    selectServer,
    eventEmitter,
    getPositionInfo,
    getSearchCapabilities,
    getTransportInfo,
    getVolumeDBRange,
    getVolumeDB,
    getVolume,
    setVolume,
}