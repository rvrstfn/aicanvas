# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Electron-based infinite canvas web browser that allows users to drag, zoom, resize, and freely place multiple web pages in a single interface. The project combines header-stripping techniques with a Figma-style infinite canvas.

## Architecture

The application consists of four main layers:

1. **Electron shell** - Runs Chromium with `webSecurity: false` and strips frame-blocking headers
2. **Renderer window** - Hosts a `<div id="world">` containing all tiles (webview + screenshot images)
3. **Pan/zoom controller** - Applies single transform to `#world` using `translate()` and `scale()`
4. **Interact.js** - Handles per-tile drag and resize functionality

## Key Files Structure

- `main.js` - Electron main process, handles header stripping and screenshot capture
- `index.html` - Main renderer HTML with viewport and world containers
- `renderer.js` - Canvas interaction logic, tile management, pan/zoom controls
- `preload.js` - IPC bridge for secure communication between main and renderer

## Core Features

- **Infinite canvas** - Pure translate transforms for unbounded panning
- **Hardware-accelerated zoom** - Single scale() transform affects entire subtree
- **Resource optimization** - Only focused webview consumes CPU, others become static PNGs
- **Cross-origin support** - Header stripping bypasses frame restrictions
- **Minimal dependencies** - Uses only Interact.js (23kB) for drag/resize

## Key Implementation Details

- Uses `webSecurity: false` in Electron for bypassing same-origin policy
- Strips `X-Frame-Options` and `CSP frame-ancestors` headers via webRequest API
- Focus/blur events swap between live webview and PNG screenshot
- Transform origin set to (0,0) for consistent scaling behavior
- Tiles use absolute positioning with Interact.js for manipulation

## Security Considerations

- `webSecurity: false` disables same-origin policy - treat as local tool only
- Never expose over network or use with sensitive sites
- All web content runs in same Chromium process with elevated privileges