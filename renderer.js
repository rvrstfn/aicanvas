const world = document.getElementById('world');
const viewport = document.getElementById('viewport');
const urlInput = document.getElementById('urlInput');
const addTileBtn = document.getElementById('addTileBtn');
const zoomIndicator = document.getElementById('zoomIndicator');

// Canvas state
let scale = 1;
let origin = { x: 0, y: 0 };
let dragging = false;
let selectedTile = null;
let tileCounter = 0;

// Persistence functions
function saveTileState() {
  const tiles = [];
  document.querySelectorAll('.tile').forEach(tile => {
    const webview = tile.querySelector('webview');
    if (webview) {
      tiles.push({
        id: tile.dataset.id,
        url: webview.src,
        x: parseFloat(tile.dataset.x) || 0,
        y: parseFloat(tile.dataset.y) || 0,
        width: tile.offsetWidth,
        height: tile.offsetHeight,
        left: parseFloat(tile.style.left) || 0,
        top: parseFloat(tile.style.top) || 0
      });
    }
  });
  localStorage.setItem('aicanvas-tiles', JSON.stringify(tiles));
}

function loadTileState() {
  const saved = localStorage.getItem('aicanvas-tiles');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved tiles:', e);
    }
  }
  return null;
}

// Pan & zoom controls
viewport.addEventListener('wheel', (e) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const newScale = Math.max(0.1, Math.min(4, scale * delta));
  
  // Zoom towards mouse position
  const rect = viewport.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  const factor = newScale / scale;
  origin.x = mouseX - (mouseX - origin.x) * factor;
  origin.y = mouseY - (mouseY - origin.y) * factor;
  
  scale = newScale;
  updateWorldTransform();
  updateZoomIndicator();
});

viewport.addEventListener('mousedown', (e) => {
  if (e.target === viewport || e.target === world) {
    dragging = true;
    viewport.classList.add('dragging');
    e.preventDefault();
  }
});

window.addEventListener('mouseup', () => {
  dragging = false;
  viewport.classList.remove('dragging');
});

window.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  origin.x += e.movementX;
  origin.y += e.movementY;
  updateWorldTransform();
});

function updateWorldTransform() {
  world.style.transform = `translate(${origin.x}px, ${origin.y}px) scale(${scale})`;
}

function updateZoomIndicator() {
  zoomIndicator.textContent = Math.round(scale * 100) + '%';
}

// Tile management
function addTile(url, x = 0, y = 0, width = 500, height = 300, savedData = null) {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  
  const tileId = savedData ? savedData.id : ++tileCounter;
  if (savedData && parseInt(savedData.id) > tileCounter) {
    tileCounter = parseInt(savedData.id);
  }
  
  const tile = document.createElement('div');
  tile.className = 'tile';
  tile.style.width = width + 'px';
  tile.style.height = height + 'px';
  tile.style.left = x + 'px';
  tile.style.top = y + 'px';
  tile.dataset.id = tileId;
  
  // Restore saved position if available
  if (savedData) {
    tile.dataset.x = savedData.x.toString();
    tile.dataset.y = savedData.y.toString();
    tile.style.transform = `translate(${savedData.x}px, ${savedData.y}px)`;
  } else {
    tile.dataset.x = '0';
    tile.dataset.y = '0';
  }
  
  // Create header
  const header = document.createElement('div');
  header.className = 'tile-header';
  
  const urlDisplay = document.createElement('div');
  urlDisplay.className = 'tile-url';
  urlDisplay.textContent = url;
  
  const controls = document.createElement('div');
  controls.className = 'tile-controls';
  
  const reloadBtn = document.createElement('button');
  reloadBtn.className = 'tile-btn';
  reloadBtn.innerHTML = '↻';
  reloadBtn.title = 'Reload';
  reloadBtn.onclick = (e) => {
    e.stopPropagation();
    const webview = tile.querySelector('webview');
    if (webview) webview.reload();
  };
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'tile-btn';
  closeBtn.innerHTML = '×';
  closeBtn.title = 'Close';
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    removeTile(tile);
  };
  
  controls.appendChild(reloadBtn);
  controls.appendChild(closeBtn);
  header.appendChild(urlDisplay);
  header.appendChild(controls);
  
  // Create webview
  console.log('Creating webview for:', url);
  const webview = document.createElement('webview');
  webview.src = url;
  webview.setAttribute('disableblinkfeatures', 'Auxclick');
  console.log('Webview created, src set to:', webview.src);
  
  // Set webview dimensions using HTML attributes (Electron webviews prefer this)
  const updateWebviewDimensions = () => {
    const width = tile.offsetWidth;
    const height = tile.offsetHeight - 30; // subtract header height
    console.log(`Tile dimensions: ${tile.offsetWidth}x${tile.offsetHeight}, Webview will be: ${width}x${height}`);
    webview.style.width = width + 'px';
    webview.style.height = height + 'px';
    webview.setAttribute('style', `width: ${width}px; height: ${height}px; position: absolute; top: 30px; left: 0;`);
  };
  
  tile.appendChild(header);
  tile.appendChild(webview);
  
  // Set initial dimensions
  setTimeout(updateWebviewDimensions, 0);
  
  // Handle focus/blur for screenshot swapping
  webview.addEventListener('dom-ready', () => {
    console.log('🟢 Webview dom-ready for:', url);
    updateWebviewDimensions(); // Ensure proper size when content loads
    console.log('Webview dimensions after dom-ready:', webview.style.width, 'x', webview.style.height);
    
    // Force webview to recognize its viewport size (Electron bug workaround)
    try {
      webview.executeJavaScript(`
        console.log('🔍 Injected JS for ${url}: window size is', window.innerWidth, 'x', window.innerHeight);
        console.log('🔍 Injected JS for ${url}: document size is', document.documentElement.clientWidth, 'x', document.documentElement.clientHeight);
        console.log('🔍 Injected JS for ${url}: body size is', document.body.clientWidth, 'x', document.body.clientHeight);
        
        // Force resize event to make webview recalculate its viewport
        window.dispatchEvent(new Event('resize'));
        
        // Log viewport meta tag if present
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          console.log('🔍 Viewport meta:', viewport.content);
        } else {
          console.log('🔍 No viewport meta tag found');
        }
      `);
    } catch (e) {
      console.log('Could not inject JS:', e);
    }
    
    setTimeout(() => {
      webview.focus();
    }, 100);
  });

  webview.addEventListener('did-start-loading', () => {
    console.log('🔄 Webview started loading:', url);
  });

  webview.addEventListener('did-stop-loading', () => {
    console.log('✅ Webview finished loading:', url);
  });

  webview.addEventListener('did-fail-load', (event) => {
    console.error('❌ Webview failed to load:', url, event);
  });
  
  console.log('Event listeners attached to webview');
  
  
  world.appendChild(tile);
  makeDraggable(tile);
  
  // Save state after creating new tile (but not when loading saved tiles)
  if (!savedData) {
    saveTileState();
  }
  
  return tile;
}

function removeTile(tile) {
  if (selectedTile === tile) {
    selectedTile = null;
  }
  tile.remove();
  saveTileState(); // Save state after removal
}

function selectTile(tile) {
  if (selectedTile) {
    selectedTile.classList.remove('selected');
  }
  selectedTile = tile;
  tile.classList.add('selected');
}

function makeDraggable(target) {
  interact(target)
    .draggable({
      inertia: false,
      allowFrom: '.tile-header', // Only allow dragging from header
      listeners: {
        move(event) {
          // Adjust for zoom scale
          const scaledDx = event.dx / scale;
          const scaledDy = event.dy / scale;
          
          const x = (parseFloat(target.getAttribute('data-x')) || 0) + scaledDx;
          const y = (parseFloat(target.getAttribute('data-y')) || 0) + scaledDy;
          
          target.style.transform = `translate(${x}px, ${y}px)`;
          target.setAttribute('data-x', x);
          target.setAttribute('data-y', y);
        },
        end() {
          saveTileState(); // Save position after drag
        }
      }
    })
    .resizable({
      edges: { right: true, bottom: true }, // Only bottom-right corner
      listeners: {
        move(event) {
          // Adjust for zoom scale
          const scaledDeltaLeft = event.deltaRect.left / scale;
          const scaledDeltaTop = event.deltaRect.top / scale;
          const scaledWidth = event.rect.width / scale;
          const scaledHeight = event.rect.height / scale;
          
          let { x, y } = event.target.dataset;
          x = (parseFloat(x) || 0) + scaledDeltaLeft;
          y = (parseFloat(y) || 0) + scaledDeltaTop;

          Object.assign(event.target.style, {
            width: scaledWidth + 'px',
            height: scaledHeight + 'px',
            transform: `translate(${x}px, ${y}px)`
          });

          Object.assign(event.target.dataset, { x, y });
        }
      },
      modifiers: [
        interact.modifiers.restrictSize({
          min: { width: 200 / scale, height: 150 / scale }
        })
      ]
    })
    .on('resizestart', () => {
      target.querySelector('webview').style.pointerEvents = 'none';
    })
    .on('resizeend', () => {
      const webview = target.querySelector('webview');
      webview.style.pointerEvents = 'auto';
      
      // Update webview size after resize (Electron-specific approach)
      const width = target.offsetWidth;
      const height = target.offsetHeight - 30;
      webview.style.width = width + 'px';
      webview.style.height = height + 'px';
      webview.setAttribute('style', `width: ${width}px; height: ${height}px; position: absolute; top: 30px; left: 0;`);
      
      saveTileState(); // Save size after resize
    });
}

// UI event handlers
addTileBtn.addEventListener('click', () => {
  urlInput.style.display = 'block';
  urlInput.focus();
});

urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const url = urlInput.value.trim();
    if (url) {
      // Add tile at center of viewport
      const centerX = (-origin.x + viewport.clientWidth / 2) / scale - 250;
      const centerY = (-origin.y + viewport.clientHeight / 2) / scale - 150;
      addTile(url, centerX, centerY);
      urlInput.value = '';
      urlInput.style.display = 'none';
    }
  } else if (e.key === 'Escape') {
    urlInput.value = '';
    urlInput.style.display = 'none';
  }
});

urlInput.addEventListener('blur', () => {
  setTimeout(() => {
    urlInput.style.display = 'none';
  }, 100);
});

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
  if (e.key === 'n' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    addTileBtn.click();
  }
});

// Initialize with saved tiles or demo tiles
setTimeout(() => {
  const savedTiles = loadTileState();
  
  if (savedTiles && savedTiles.length > 0) {
    // Load saved tiles
    savedTiles.forEach(tileData => {
      addTile(tileData.url, tileData.left, tileData.top, tileData.width, tileData.height, tileData);
    });
  } else {
    // Initialize with demo tiles if no saved state
    addTile('https://news.ycombinator.com', 100, 100);
    addTile('https://www.wikipedia.org', 700, 150);
    addTile('https://github.com', 300, 500);
  }
}, 500);

// Initialize zoom indicator
updateZoomIndicator();