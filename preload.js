const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bridge', {
  grabScreenshot: (id) => ipcRenderer.invoke('grab', id)
});