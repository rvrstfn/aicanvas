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

  win.loadFile('index.html');
});

// Handle screenshot capture
ipcMain.handle('grab', async (_event, id) => {
  const wc = webContents.fromId(id);
  if (!wc) return null;
  try {
    const image = await wc.capturePage();
    return image.toDataURL();   // PNG -> data URL
  } catch (error) {
    console.error('Screenshot capture failed:', error);
    return null;
  }
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