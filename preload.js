const { contextBridge, ipcRenderer } = require('electron');

// Expose IPC functionality for creating new tiles from popup URLs
contextBridge.exposeInMainWorld('electronAPI', {
  onCreateNewTile: (callback) => ipcRenderer.on('create-new-tile', callback)
});