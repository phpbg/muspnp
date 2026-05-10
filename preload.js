const {contextBridge} = require('electron')
const ipcRenderer = require('electron').ipcRenderer;

// --- Local audio playback engine ---
// This runs in the renderer process and controls an <audio> element
window.addEventListener('DOMContentLoaded', () => {
    const audio = document.getElementById('localAudio');
    if (!audio) return;

    function formatTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    // Parse "HH:mm:ss" to seconds
    function parseTime(str) {
        if (!str) return 0;
        const parts = str.split(':').map(Number);
        return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
    }

    // Handle query requests from main process via IPC invoke
    ipcRenderer.on('localGetPositionInfo', (event) => {
        event.sender.send('localGetPositionInfo:reply', {
            Track: 1,
            TrackDuration: formatTime(audio.duration || 0),
            TrackMetaData: '',
            TrackURI: audio.src || '',
            RelTime: formatTime(audio.currentTime || 0),
            AbsTime: '00:00:00',
            RelCount: 2147483647,
            AbsCount: 2147483647
        });
    });

    ipcRenderer.on('localGetTransportInfo', (event) => {
        let state = 'STOPPED';
        if (!audio.src) state = 'NO_MEDIA_PRESENT';
        else if (audio.ended) state = 'STOPPED';
        else if (!audio.paused) state = 'PLAYING';
        else if (audio.paused && audio.currentTime > 0) state = 'PAUSED_PLAYBACK';
        event.sender.send('localGetTransportInfo:reply', {
            CurrentTransportState: state,
            CurrentTransportStatus: 'OK',
            CurrentSpeed: 1
        });
    });

    ipcRenderer.on('localGetVolume', (event) => {
        event.sender.send('localGetVolume:reply', Math.round(audio.volume * 100));
    });

    ipcRenderer.on('localSetURI', (event, uri) => {
        audio.src = uri;
        audio.load();
    });
    ipcRenderer.on('localPlay', () => {
        audio.play().catch(() => {});
    });
    ipcRenderer.on('localPause', () => {
        audio.pause();
    });
    ipcRenderer.on('localStop', () => {
        audio.pause();
        audio.currentTime = 0;
        audio.removeAttribute('src');
        audio.load();
    });
    ipcRenderer.on('localSeek', (event, target) => {
        audio.currentTime = parseTime(target);
    });
    ipcRenderer.on('localSetVolume', (event, volume) => {
        audio.volume = Math.max(0, Math.min(1, volume / 100));
    });
    ipcRenderer.on('localSetMute', (event, mute) => {
        audio.muted = !!mute;
    });
});

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