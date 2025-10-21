# AI Canvas - Infinite Web Browser

An Electron-based infinite canvas web browser that allows you to drag, zoom, resize, and freely place multiple web pages in a single interface. Think Figma meets web browsing - organize your web content spatially instead of in tabs.

## Features

### 🎨 Infinite Canvas
- **Unlimited workspace** - Pan and zoom through an infinite 2D canvas
- **Hardware-accelerated rendering** - Smooth 60fps interactions using CSS transforms
- **Visual grid background** - Helps orient yourself in the infinite space

### 🪟 Multi-Window Browsing
- **Draggable tiles** - Each website lives in its own resizable window
- **Independent navigation** - Each tile has its own back button, reload, and controls
- **Smart positioning** - New windows appear intelligently positioned relative to existing ones

### 🔧 Window Management
- **Resize from corners** - Scale-aware resizing that works at any zoom level
- **Unload/reload pages** - Save memory by unloading pages while keeping their position
- **Cross-origin support** - Bypass frame restrictions to embed any website

### ⚡ Performance & Memory
- **Memory optimization** - Unload pages you're not actively using
- **Resource-efficient** - Only focused windows consume CPU resources
- **Minimal dependencies** - Lightweight architecture using only Interact.js for interactions

### 🔗 Smart Link Handling
- **Popup prevention** - Links that try to open new windows become new canvas tiles instead
- **Seamless integration** - Works with Outlook, chatbots, and any site using `target="_blank"`
- **No popup clutter** - All navigation stays within your organized canvas

## Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (version 16 or higher)
- npm (comes with Node.js)

### Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/aicanvas.git
cd aicanvas

# Install dependencies
npm install

# Start the application
npm start
```

## Usage

### Basic Controls

#### Navigation
- **Mouse wheel** - Zoom in/out (towards cursor position)
- **Click + drag** (on empty space) - Pan around the canvas
- **Ctrl/Cmd + N** - Add a new website tile

#### Adding Websites
1. Click the **+** button (bottom-right)
2. Enter any URL in the input field
3. Press Enter to create a new tile

#### Window Controls
Each tile has a header with control buttons:
- **←** Back - Navigate to previous page in this tile's history
- **↻** Reload - Refresh the current page
- **⊟** Unload - Remove from memory (saves resources, shows placeholder)
- **×** Close - Remove the tile entirely

#### Moving & Resizing
- **Drag header** - Move tiles around the canvas
- **Drag bottom-right corner** - Resize tiles
- **Click anywhere on unloaded tiles** - Reload them

### Tips & Tricks

1. **Organize by topic** - Group related websites spatially (work sites on the left, social on the right, etc.)
2. **Use unload for memory** - Keep rarely-used sites unloaded but positioned for quick access
3. **Zoom levels** - Zoom out for overview, zoom in for detailed work
4. **Link following** - Click links that open new windows - they'll become new tiles automatically

## Architecture

The application uses a clean 4-layer architecture:

1. **Electron Shell** - Handles popup prevention and header stripping for cross-origin support
2. **Canvas Renderer** - Manages the infinite 2D workspace with pan/zoom
3. **Tile System** - Individual webview containers with drag/resize functionality  
4. **Interaction Layer** - Uses Interact.js for smooth drag and resize operations

## Technical Details

- **Framework**: Electron 36.4.0 (latest stable)
- **Interaction Library**: Interact.js (23kB, handles drag/resize)
- **Security**: `webSecurity: false` for cross-origin embedding (local use only)
- **Header Stripping**: Removes `X-Frame-Options` and CSP headers via webRequest API
- **IPC Communication**: Popup URLs are sent from main process to renderer for tile creation

## Security Considerations

⚠️ **Important**: This application disables web security features to allow embedding any website. It should be treated as a local development tool only:

- Never expose this application over a network
- Avoid logging into sensitive accounts
- Use only for browsing and research purposes
- All websites run with elevated privileges in the same process

## Development

### File Structure
```
├── main.js          # Electron main process, popup handling
├── renderer.js      # Canvas logic, tile management
├── index.html       # Main UI and CSS styles
├── preload.js       # IPC bridge for secure communication
├── package.json     # Dependencies and scripts
└── CLAUDE.md       # Development guidelines
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Known Limitations

- **Single process**: All webviews share the same Chromium process
- **Memory usage**: Each tile loads a full browser engine
- **Platform**: Desktop only (Electron limitation)
- **Security**: Disabled web security means elevated privileges for all content

## Future Ideas

- [ ] Tile grouping and workspace management
- [ ] Bookmarks and favorite layouts
- [ ] Export/import workspace configurations
- [ ] Collaborative workspaces
- [ ] Mobile companion app
- [ ] Plugin system for custom tile types

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- Built with [Electron](https://electronjs.org/)
- Interactions powered by [Interact.js](https://interactjs.io/)
- Inspired by infinite canvas tools like Figma and Miro