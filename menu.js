const {app, shell} = require('electron');
const isMac = process.platform === 'darwin';
const helpUrl = 'https://electronjs.org';// TODO set correct url

module.exports = [
    // { role: 'appMenu' }
    ...(isMac ? [{
        label: app.name,
        submenu: [
            {
                role: 'about',
                click: async () => {
                    await shell.openExternal(helpUrl)
                }
            },
            {type: 'separator'},
            {role: 'hide'},
            {role: 'hideothers'},
            {role: 'unhide'},
            {type: 'separator'},
            {role: 'quit'}
        ]
    }] : []),
    // { role: 'fileMenu' }
    {
        label: 'File',
        submenu: [
            isMac ? {role: 'close'} : {role: 'quit'}
        ]
    },
    {
        role: 'help',
        label: 'About',
        click: async () => {
            await shell.openExternal(helpUrl)
        }
    }
];