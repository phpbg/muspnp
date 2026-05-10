const {ipcMain} = require('electron');

/**
 * A local MediaRenderer that plays audio through Electron's BrowserWindow.
 * Implements the same interface as MediaRenderer so it can be used interchangeably.
 */
class LocalRenderer {
    constructor() {
        this._mainWindow = null;
        this._name = 'This Computer';
    }

    /**
     * Set the BrowserWindow reference for IPC communication
     * @param {Electron.BrowserWindow} mainWindow
     */
    setMainWindow(mainWindow) {
        this._mainWindow = mainWindow;
    }

    getName() {
        return this._name;
    }

    _send(channel, ...args) {
        if (!this._mainWindow || this._mainWindow.isDestroyed()) {
            return Promise.reject(new Error('No window available for local playback'));
        }
        this._mainWindow.webContents.send(channel, ...args);
        return Promise.resolve();
    }

    /**
     * Send a request to the renderer process and wait for the reply
     */
    _query(channel) {
        if (!this._mainWindow || this._mainWindow.isDestroyed()) {
            return Promise.reject(new Error('No window available for local playback'));
        }
        return new Promise((resolve) => {
            ipcMain.once(`${channel}:reply`, (event, data) => {
                resolve(data);
            });
            this._mainWindow.webContents.send(channel);
        });
    }

    setAVTransportURI({instanceID, currentURI, currentUriMetadata}) {
        return this._send('localSetURI', currentURI);
    }

    play({instanceID, speed}) {
        return this._send('localPlay');
    }

    pause({instanceID}) {
        return this._send('localPause');
    }

    stop({instanceID}) {
        return this._send('localStop');
    }

    seek({instanceID, unit, target}) {
        return this._send('localSeek', target);
    }

    getPositionInfo({instanceID}) {
        return this._query('localGetPositionInfo');
    }

    getTransportInfo({instanceID}) {
        return this._query('localGetTransportInfo');
    }

    getVolume({instanceID}) {
        return this._query('localGetVolume');
    }

    setVolume({instanceID, desiredVolume}) {
        return this._send('localSetVolume', desiredVolume);
    }

    setMute({instanceID, desiredMute}) {
        return this._send('localSetMute', desiredMute);
    }

    getVolumeDBRange({instanceID}) {
        return Promise.resolve({ MinValue: -6000, MaxValue: 0 });
    }

    getVolumeDB({instanceID}) {
        return this._query('localGetVolume').then(v => Math.round(-6000 + (v / 100) * 6000));
    }
}

module.exports = LocalRenderer;

