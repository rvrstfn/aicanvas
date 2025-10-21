const { BrowserWindow, session, ipcMain, app, webContents } = require('electron');

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 1600, 
    height: 900,
    webPreferences: { 
      webSecurity: false, 
      preload: __dirname + '/preload.js',
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true
    }
  });

  // Remove frame-blocking headers
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    delete details.responseHeaders['x-frame-options'];
    delete details.responseHeaders['content-security-policy'];
    callback({ 
      cancel: false, 
      responseHeaders: details.responseHeaders 
    });
  });

  // Prevent webview popups from creating new BrowserWindows
  // Instead, send the URL to the renderer to create a new tile
  app.on('web-contents-created', (event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      console.log('🔗 Popup blocked, sending URL to renderer:', url);
      // Send the URL to the main window to create a new tile
      win.webContents.send('create-new-tile', url);
      return { action: 'deny' }; // Prevent popup window
    });
  });

  win.loadFile('index.html');
});


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});