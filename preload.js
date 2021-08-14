const {contextBridge} = require('electron')
const ipcRenderer = require('electron').ipcRenderer;

contextBridge.exposeInMainWorld('muspnpapi', {
    onDevice: (cb) => {
        ipcRenderer.on('device', (event, ...args) => cb(...args))
    },
    ssdpSearch: () => {
        return ipcRenderer.invoke('ssdpSearch')
    },
    browse: ({id, start, count}) => {
        return ipcRenderer.invoke('browse', {id, start, count})
    },
    play: (args) => {
        return ipcRenderer.invoke('play', args)
    },
    resume: () => {
        return ipcRenderer.invoke('resume')
    },
    pause: () => {
        return ipcRenderer.invoke('pause')
    },
    stop: () => {
        return ipcRenderer.invoke('stop')
    },
    search: (args) => {
        return ipcRenderer.invoke('search', args)
    },
    seek: (args) => {
        return ipcRenderer.invoke('seek', args)
    },
    getRenderers: () => {
        return ipcRenderer.invoke('getRenderers')
    },
    getSearchCapabilities: () => {
        return ipcRenderer.invoke('getSearchCapabilities')
    },
    getServers: () => {
        return ipcRenderer.invoke('getServers')
    },
    getPositionInfo: () => {
        return ipcRenderer.invoke('getPositionInfo')
    },
    getTransportInfo: () => {
        return ipcRenderer.invoke('getTransportInfo')
    },
    selectServer: ({usn}) => {
        return ipcRenderer.invoke('selectServer', {usn})
    },
    selectRenderer: ({usn}) => {
        return ipcRenderer.invoke('selectRenderer', {usn})
    },
    getVolumeDBRange: () => {
        return ipcRenderer.invoke('getVolumeDBRange')
    },
    getVolumeDB: () => {
        return ipcRenderer.invoke('getVolumeDB')
    },
    getVolume: () => {
        return ipcRenderer.invoke('getVolume')
    },
    setVolume: (args) => {
        return ipcRenderer.invoke('setVolume', args)
    },
});