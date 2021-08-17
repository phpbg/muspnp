const {app, ipcMain, BrowserWindow, Menu, powerSaveBlocker} = require('electron');
const path = require('path');

let powerSaver = null;

function stopPowerSaver() {
    if (powerSaver != null && powerSaveBlocker.isStarted(powerSaver)) {
        powerSaveBlocker.stop(powerSaver);
        powerSaver = null;
    }
}

function startPowerSaver() {
    if (powerSaver == null) {
        powerSaver = powerSaveBlocker.start('prevent-app-suspension')
    }
}

const getUpnpApi = () => require('./api/index');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
    app.quit();
}

const createWindow = () => {
    Menu.setApplicationMenu(Menu.buildFromTemplate(require('./menu')));

    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: `${__dirname}/preload.js`,
            backgroundThrottling: false
        }
    });

    // and load the index.html of the app.
    mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

    // Open the DevTools.
    if (process.env.NODE_ENV === 'dev') {
        mainWindow.webContents.openDevTools();
    }

    ipcMain.handle('ssdpSearch', async () => {
        const upnp = getUpnpApi();
        upnp.eventEmitter.on('device', () => mainWindow.webContents.send('device'))
        return upnp.ssdpStart()
            .then(() => upnp.ssdpSearch())
    });
    ipcMain.handle('browse', async (event, args) => {
        return getUpnpApi().browse(args);
    });
    ipcMain.handle('play', async (event, args) => {
        return getUpnpApi()
            .play(args)
            .then(() => startPowerSaver())
    });
    ipcMain.handle('resume', async () => {
        return getUpnpApi().resume();
    });
    ipcMain.handle('pause', async () => {
        return getUpnpApi().pause();
    });
    ipcMain.handle('stop', async () => {
        return getUpnpApi().stop().then(() => {
            stopPowerSaver();
        })
    });
    ipcMain.handle('search', async (event, args) => {
        return getUpnpApi().search(args);
    });
    ipcMain.handle('seek', async (event, args) => {
        return getUpnpApi().seek(args);
    });
    ipcMain.handle('getRenderers', async () => {
        return getUpnpApi().getRenderers();
    });
    ipcMain.handle('getSearchCapabilities', async () => {
        return getUpnpApi().getSearchCapabilities();
    });
    ipcMain.handle('getServers', async () => {
        return getUpnpApi().getServers();
    });
    ipcMain.handle('getPositionInfo', async () => {
        return getUpnpApi().getPositionInfo();
    });
    ipcMain.handle('getTransportInfo', async () => {
        return getUpnpApi().getTransportInfo();
    });
    ipcMain.handle('selectServer', async (event, args) => {
        return getUpnpApi().selectServer(args)
    });
    ipcMain.handle('selectRenderer', async (event, args) => {
        return getUpnpApi().selectRenderer(args)
    });
    ipcMain.handle('getVolumeDBRange', async (event, args) => {
        return getUpnpApi().getVolumeDBRange(args)
    });
    ipcMain.handle('getVolumeDB', async (event, args) => {
        return getUpnpApi().getVolumeDB(args)
    });
    ipcMain.handle('getVolume', async (event, args) => {
        return getUpnpApi().getVolume(args)
    });
    ipcMain.handle('setVolume', async (event, args) => {
        return getUpnpApi().setVolume(args)
    });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    const upnp = getUpnpApi();
    upnp.ssdpStop(); //TODO only stop what we actually started...
    upnp.stop().catch(() => null).finally(() => {
        stopPowerSaver();
        if (process.platform !== 'darwin') {
            app.quit();
        }
    })
});

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
