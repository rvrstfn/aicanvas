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
        top: parseFloat(tile.style.top) || 0,
        unloaded: tile.dataset.unloaded === 'true'
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
  updateMinimap(); // Update minimap when canvas moves/zooms
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
  
  const backBtn = document.createElement('button');
  backBtn.className = 'tile-btn';
  backBtn.innerHTML = '←';
  backBtn.title = 'Go back';
  backBtn.onclick = (e) => {
    e.stopPropagation();
    const webview = tile.querySelector('webview');
    if (webview && webview.canGoBack()) {
      webview.goBack();
    }
  };
  
  const reloadBtn = document.createElement('button');
  reloadBtn.className = 'tile-btn';
  reloadBtn.innerHTML = '↻';
  reloadBtn.title = 'Reload';
  reloadBtn.onclick = (e) => {
    e.stopPropagation();
    const webview = tile.querySelector('webview');
    if (webview) webview.reload();
  };
  
  const unloadBtn = document.createElement('button');
  unloadBtn.className = 'tile-btn';
  unloadBtn.innerHTML = '⊟';
  unloadBtn.title = 'Unload page (save memory)';
  unloadBtn.onclick = (e) => {
    e.stopPropagation();
    toggleTileLoad(tile);
  };
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'tile-btn';
  closeBtn.innerHTML = '×';
  closeBtn.title = 'Close';
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    removeTile(tile);
  };
  
  controls.appendChild(backBtn);
  controls.appendChild(reloadBtn);
  controls.appendChild(unloadBtn);
  controls.appendChild(closeBtn);
  header.appendChild(urlDisplay);
  header.appendChild(controls);
  
  // Create webview
  console.log('Creating webview for:', url);
  const webview = document.createElement('webview');
  webview.setAttribute('allowpopups', ''); // Enable new-window events
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

  // Note: New window handling is now done at the main process level
  // via setWindowOpenHandler to prevent actual popups and create tiles instead
  
  console.log('Event listeners attached to webview');
  
  
  world.appendChild(tile);
  makeDraggable(tile);
  
  // Handle unloaded state if loading from saved data
  if (savedData && savedData.unloaded) {
    setTimeout(() => toggleTileLoad(tile), 100);
  }
  
  // Save state after creating new tile (but not when loading saved tiles)
  if (!savedData) {
    saveTileState();
  }
  
  // Update minimap when new tile is added
  updateMinimap();
  
  return tile;
}

function removeTile(tile) {
  if (selectedTile === tile) {
    selectedTile = null;
  }
  tile.remove();
  saveTileState(); // Save state after removal
  updateMinimap(); // Update minimap after tile removal
}

function toggleTileLoad(tile) {
  const webview = tile.querySelector('webview');
  const placeholder = tile.querySelector('.tile-placeholder');
  const unloadBtn = tile.querySelector('.tile-btn[title*="Unload"]');
  
  if (webview && webview.style.display !== 'none') {
    // Unload: hide webview, show placeholder
    const url = webview.src;
    let title = url;
    
    // Try to get page title from webview
    try {
      webview.executeJavaScript('document.title').then(pageTitle => {
        if (pageTitle && pageTitle.trim()) {
          const titleElement = tile.querySelector('.placeholder-title');
          if (titleElement) titleElement.textContent = pageTitle;
        }
      }).catch(() => {});
    } catch (e) {}
    
    webview.style.display = 'none';
    
    // Create placeholder if it doesn't exist
    if (!placeholder) {
      const placeholderDiv = document.createElement('div');
      placeholderDiv.className = 'tile-placeholder';
      placeholderDiv.innerHTML = `
        <div class="placeholder-content">
          <div class="placeholder-icon">⊟</div>
          <div class="placeholder-title">${title}</div>
          <div class="placeholder-url">${url}</div>
          <div class="placeholder-note">Click to reload</div>
        </div>
      `;
      
      placeholderDiv.onclick = () => toggleTileLoad(tile);
      tile.appendChild(placeholderDiv);
    } else {
      placeholder.style.display = 'flex';
    }
    
    unloadBtn.innerHTML = '⊞';
    unloadBtn.title = 'Reload page';
    tile.dataset.unloaded = 'true';
    
  } else {
    // Reload: show webview, hide placeholder
    if (webview) {
      webview.style.display = 'block';
      webview.reload();
    }
    
    if (placeholder) {
      placeholder.style.display = 'none';
    }
    
    unloadBtn.innerHTML = '⊟';
    unloadBtn.title = 'Unload page (save memory)';
    delete tile.dataset.unloaded;
  }
  
  saveTileState();
  updateMinimap(); // Update minimap after load/unload
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
          updateMinimap(); // Update minimap after tile move
        }
      }
    })
    .resizable({
      edges: { right: true, bottom: true }, // Only bottom-right corner
      listeners: {
        move(event) {
          // Adjust resize dimensions for zoom scale
          const scaledWidth = event.rect.width / scale;
          const scaledHeight = event.rect.height / scale;
          
          Object.assign(event.target.style, {
            width: scaledWidth + 'px',
            height: scaledHeight + 'px'
          });
        }
      },
      modifiers: [
        interact.modifiers.restrictSize({
          min: { width: 200, height: 150 }
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
      updateMinimap(); // Update minimap after tile resize
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
  
  // Toggle minimap with 'M' key
  if (e.key === 'm' || e.key === 'M') {
    e.preventDefault();
    const minimapToggle = document.getElementById('minimapToggle');
    if (minimapToggle) minimapToggle.click();
  }
});

// Function to fix existing webviews missing allowpopups attribute
function fixExistingWebviews() {
  document.querySelectorAll('.tile webview').forEach(webview => {
    if (!webview.hasAttribute('allowpopups')) {
      console.log('🔧 Adding allowpopups to existing webview:', webview.src);
      webview.setAttribute('allowpopups', '');
    }
  });
}

// Initialize with saved tiles or demo tiles
setTimeout(() => {
  const savedTiles = loadTileState();
  
  if (savedTiles && savedTiles.length > 0) {
    // Load saved tiles
    savedTiles.forEach(tileData => {
      addTile(tileData.url, tileData.left, tileData.top, tileData.width, tileData.height, tileData);
    });
    
    // Fix any existing webviews that might be missing allowpopups
    setTimeout(fixExistingWebviews, 1000);
  } else {
    // Initialize with demo tiles if no saved state
    addTile('https://news.ycombinator.com', 100, 100);
    addTile('https://www.wikipedia.org', 700, 150);
    addTile('https://github.com', 300, 500);
  }
}, 500);

// Initialize zoom indicator
updateZoomIndicator();

// Minimap functionality
let minimapCanvas, minimapCtx, minimapViewport, minimapBounds = null;
let minimapUpdateScheduled = false;

function initializeMinimap() {
  minimapCanvas = document.getElementById('minimapCanvas');
  minimapCtx = minimapCanvas.getContext('2d');
  minimapViewport = document.getElementById('minimapViewport');
  
  // Set actual canvas resolution for crisp rendering
  const rect = minimapCanvas.getBoundingClientRect();
  minimapCanvas.width = rect.width * window.devicePixelRatio;
  minimapCanvas.height = rect.height * window.devicePixelRatio;
  minimapCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
  
  updateMinimap();
}

function calculateMinimapBounds() {
  const tiles = document.querySelectorAll('.tile');
  if (tiles.length === 0) {
    return { minX: -500, minY: -300, maxX: 500, maxY: 300, width: 1000, height: 600 };
  }
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  tiles.forEach(tile => {
    const tileX = parseFloat(tile.style.left) + (parseFloat(tile.dataset.x) || 0);
    const tileY = parseFloat(tile.style.top) + (parseFloat(tile.dataset.y) || 0);
    const tileWidth = tile.offsetWidth;
    const tileHeight = tile.offsetHeight;
    
    minX = Math.min(minX, tileX);
    minY = Math.min(minY, tileY);
    maxX = Math.max(maxX, tileX + tileWidth);
    maxY = Math.max(maxY, tileY + tileHeight);
  });
  
  // Add padding around content
  const padding = 200;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;
  
  return {
    minX, minY, maxX, maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

function updateMinimap() {
  if (!minimapCanvas || minimapUpdateScheduled) return;
  
  minimapUpdateScheduled = true;
  requestAnimationFrame(() => {
    minimapUpdateScheduled = false;
    renderMinimap();
  });
}

function renderMinimap() {
  const rect = minimapCanvas.getBoundingClientRect();
  const canvasWidth = rect.width;
  const canvasHeight = rect.height;
  
  // Calculate bounds and scale
  minimapBounds = calculateMinimapBounds();
  const scaleX = canvasWidth / minimapBounds.width;
  const scaleY = canvasHeight / minimapBounds.height;
  const minimapScale = Math.min(scaleX, scaleY) * 0.9; // 90% to leave some margin
  
  // Clear canvas
  minimapCtx.clearRect(0, 0, canvasWidth, canvasHeight);
  
  // Calculate center offset
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const worldCenterX = minimapBounds.minX + minimapBounds.width / 2;
  const worldCenterY = minimapBounds.minY + minimapBounds.height / 2;
  
  // Draw tiles
  const tiles = document.querySelectorAll('.tile');
  tiles.forEach(tile => {
    const tileX = parseFloat(tile.style.left) + (parseFloat(tile.dataset.x) || 0);
    const tileY = parseFloat(tile.style.top) + (parseFloat(tile.dataset.y) || 0);
    const tileWidth = tile.offsetWidth;
    const tileHeight = tile.offsetHeight;
    const isUnloaded = tile.dataset.unloaded === 'true';
    
    // Convert world coordinates to minimap coordinates
    const minimapX = centerX + (tileX - worldCenterX) * minimapScale;
    const minimapY = centerY + (tileY - worldCenterY) * minimapScale;
    const minimapW = tileWidth * minimapScale;
    const minimapH = tileHeight * minimapScale;
    
    // Draw tile rectangle
    minimapCtx.fillStyle = isUnloaded ? 'rgba(200, 200, 200, 0.6)' : 'rgba(100, 150, 255, 0.7)';
    minimapCtx.fillRect(minimapX, minimapY, minimapW, minimapH);
    
    minimapCtx.strokeStyle = isUnloaded ? '#999' : '#333';
    minimapCtx.lineWidth = 0.5;
    minimapCtx.strokeRect(minimapX, minimapY, minimapW, minimapH);
  });
  
  // Update viewport indicator
  updateMinimapViewport();
}

function updateMinimapViewport() {
  if (!minimapBounds || !minimapViewport) return;
  
  const rect = minimapCanvas.getBoundingClientRect();
  const canvasWidth = rect.width;
  const canvasHeight = rect.height;
  
  const scaleX = canvasWidth / minimapBounds.width;
  const scaleY = canvasHeight / minimapBounds.height;
  const minimapScale = Math.min(scaleX, scaleY) * 0.9;
  
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const worldCenterX = minimapBounds.minX + minimapBounds.width / 2;
  const worldCenterY = minimapBounds.minY + minimapBounds.height / 2;
  
  // Calculate current viewport in world coordinates
  const viewportWidth = viewport.clientWidth / scale;
  const viewportHeight = viewport.clientHeight / scale;
  const viewportX = -origin.x / scale;
  const viewportY = -origin.y / scale;
  
  // Convert to minimap coordinates
  const minimapViewportX = centerX + (viewportX - worldCenterX) * minimapScale;
  const minimapViewportY = centerY + (viewportY - worldCenterY) * minimapScale;
  const minimapViewportW = viewportWidth * minimapScale;
  const minimapViewportH = viewportHeight * minimapScale;
  
  // Position the viewport indicator
  minimapViewport.style.left = `${10 + minimapViewportX}px`;
  minimapViewport.style.top = `${10 + minimapViewportY}px`;
  minimapViewport.style.width = `${minimapViewportW}px`;
  minimapViewport.style.height = `${minimapViewportH}px`;
}

function handleMinimapClick(event) {
  if (!minimapBounds) return;
  
  const rect = minimapCanvas.getBoundingClientRect();
  const canvasWidth = rect.width;
  const canvasHeight = rect.height;
  const clickX = event.clientX - rect.left;
  const clickY = event.clientY - rect.top;
  
  // Calculate minimap scale and center
  const scaleX = canvasWidth / minimapBounds.width;
  const scaleY = canvasHeight / minimapBounds.height;
  const minimapScale = Math.min(scaleX, scaleY) * 0.9;
  
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const worldCenterX = minimapBounds.minX + minimapBounds.width / 2;
  const worldCenterY = minimapBounds.minY + minimapBounds.height / 2;
  
  // Convert minimap coordinates to world coordinates
  const worldX = worldCenterX + (clickX - centerX) / minimapScale;
  const worldY = worldCenterY + (clickY - centerY) / minimapScale;
  
  // Navigate to clicked position (center the viewport on the clicked point)
  navigateToPosition(worldX, worldY);
}

function navigateToPosition(worldX, worldY, smooth = true) {
  const targetOriginX = -(worldX * scale) + viewport.clientWidth / 2;
  const targetOriginY = -(worldY * scale) + viewport.clientHeight / 2;
  
  if (smooth) {
    // Smooth animation to new position
    animateToPosition(targetOriginX, targetOriginY);
  } else {
    origin.x = targetOriginX;
    origin.y = targetOriginY;
    updateWorldTransform();
    updateMinimap();
  }
}

function animateToPosition(targetX, targetY) {
  const startX = origin.x;
  const startY = origin.y;
  const deltaX = targetX - startX;
  const deltaY = targetY - startY;
  const duration = 300; // ms
  const startTime = Date.now();
  
  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing function (ease-out)
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    
    origin.x = startX + deltaX * easeProgress;
    origin.y = startY + deltaY * easeProgress;
    
    updateWorldTransform();
    updateMinimap();
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }
  
  animate();
}

// Minimap hover effects and tooltips
let minimapTooltip = null;

function handleMinimapHover(event) {
  if (!minimapBounds) return;
  
  const rect = minimapCanvas.getBoundingClientRect();
  const canvasWidth = rect.width;
  const canvasHeight = rect.height;
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;
  
  // Calculate minimap scale and center
  const scaleX = canvasWidth / minimapBounds.width;
  const scaleY = canvasHeight / minimapBounds.height;
  const minimapScale = Math.min(scaleX, scaleY) * 0.9;
  
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const worldCenterX = minimapBounds.minX + minimapBounds.width / 2;
  const worldCenterY = minimapBounds.minY + minimapBounds.height / 2;
  
  // Check if mouse is over any tile
  const tiles = document.querySelectorAll('.tile');
  let hoveredTile = null;
  
  for (const tile of tiles) {
    const tileX = parseFloat(tile.style.left) + (parseFloat(tile.dataset.x) || 0);
    const tileY = parseFloat(tile.style.top) + (parseFloat(tile.dataset.y) || 0);
    const tileWidth = tile.offsetWidth;
    const tileHeight = tile.offsetHeight;
    
    // Convert to minimap coordinates
    const minimapX = centerX + (tileX - worldCenterX) * minimapScale;
    const minimapY = centerY + (tileY - worldCenterY) * minimapScale;
    const minimapW = tileWidth * minimapScale;
    const minimapH = tileHeight * minimapScale;
    
    // Check if mouse is inside this tile's rectangle
    if (mouseX >= minimapX && mouseX <= minimapX + minimapW &&
        mouseY >= minimapY && mouseY <= minimapY + minimapH) {
      hoveredTile = tile;
      break;
    }
  }
  
  if (hoveredTile) {
    showMinimapTooltip(event, hoveredTile);
    minimapCanvas.style.cursor = 'pointer';
  } else {
    hideMinimapTooltip();
    minimapCanvas.style.cursor = 'pointer';
  }
}

function showMinimapTooltip(event, tile) {
  const webview = tile.querySelector('webview');
  if (!webview) return;
  
  const url = webview.src;
  const isUnloaded = tile.dataset.unloaded === 'true';
  
  if (!minimapTooltip) {
    minimapTooltip = document.createElement('div');
    minimapTooltip.className = 'minimap-tooltip';
    document.body.appendChild(minimapTooltip);
  }
  
  minimapTooltip.textContent = `${isUnloaded ? '[Unloaded] ' : ''}${url}`;
  minimapTooltip.style.display = 'block';
  minimapTooltip.style.left = `${event.clientX + 10}px`;
  minimapTooltip.style.top = `${event.clientY - 30}px`;
}

function hideMinimapTooltip() {
  if (minimapTooltip) {
    minimapTooltip.style.display = 'none';
  }
}

// Initialize minimap when DOM is ready
setTimeout(() => {
  initializeMinimap();
  
  // Add event listeners for minimap functionality
  minimapCanvas.addEventListener('click', handleMinimapClick);
  minimapCanvas.addEventListener('mousemove', handleMinimapHover);
  minimapCanvas.addEventListener('mouseleave', hideMinimapTooltip);
  
  // Add minimap toggle functionality
  const minimapToggle = document.getElementById('minimapToggle');
  minimapToggle.addEventListener('click', () => {
    const minimap = document.getElementById('minimap');
    minimap.classList.toggle('collapsed');
    minimapToggle.textContent = minimap.classList.contains('collapsed') ? '+' : '−';
  });
}, 600);

// Listen for new tile creation requests from main process (popup URLs)
if (window.electronAPI) {
  window.electronAPI.onCreateNewTile((event, url) => {
    console.log('🔗 Received create-new-tile request for:', url);
    
    // Find the center of the current viewport to place the new tile
    const centerX = (-origin.x + viewport.clientWidth / 2) / scale - 250;
    const centerY = (-origin.y + viewport.clientHeight / 2) / scale - 150;
    
    // Create the new tile at viewport center
    addTile(url, centerX, centerY);
  });
}