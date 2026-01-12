# MD Viewer - AI Coding Agent Instructions

## Project Overview

MD Viewer is a dual-mode Markdown reader/editor with a **server-based** version (Node.js + Express) and a **standalone** version (pure frontend using File System Access API). The standalone version is the recommended approach - it requires no server and directly accesses the local file system.

## Architecture & Key Components

### Two Operating Modes

1. **Standalone Mode** (`standalone.html` + `standalone-app.js`) - **RECOMMENDED**
   - Pure frontend, no dependencies required
   - Uses File System Access API (Chrome 86+, Edge 86+)
   - Direct file system access with persistent folder handles via IndexedDB
   - Default view: Split mode (editor + preview)

2. **Server Mode** (`server.js` + `public/index.html` + `app.js`)
   - Node.js HTTP server with Express-style API routes
   - Serves files from `docs/` directory by default
   - Custom directory: `node server.js "C:/path/to/folder"`
   - Minimal dependencies: express, marked, highlight.js

### File Structure Pattern

```
public/
  ├── js/
  │   ├── app.js              # Server mode app logic
  │   └── standalone-app.js   # Standalone mode app (larger, ~1100 lines)
  ├── css/
  │   ├── style.css           # UI/layout styles
  │   └── markdown.css        # Markdown rendering + Mermaid styles
  └── index.html              # Server mode UI

standalone.html               # Standalone mode (self-contained)
server.js                     # HTTP server with REST-like API
```

## Critical Features & Implementation

### Mermaid Diagram Rendering

- **Integration**: Mermaid loaded via CDN, initialized in both `app.js` and `standalone-app.js`
- **Theme Switching**: Diagrams automatically re-render when toggling dark/light mode
  - Dark mode uses `'dark'` theme
  - Light mode uses `'default'` theme
  - Configuration in `initMarked()` method
- **Custom Renderer**: Marked's code block renderer detects `language === 'mermaid'` and wraps in `<div class="mermaid">` instead of `<pre><code>`

### Diagram Zoom Feature (v1.6.0)

**Location**: `standalone-app.js` lines ~865-1000, `markdown.css` lines ~450-550

- Double-click any Mermaid diagram to open full-screen zoom modal
- Controls: `+`/`-`/`0` keys, mouse wheel, toolbar buttons
- Zoom range: 50%-300%
- Implementation: `initDiagramZoom()` attaches event listeners AFTER Mermaid rendering completes
- **Critical**: Must call `attachDiagramZoomEvents()` after `mermaid.run()` to bind double-click handlers

### Folder Memory (IndexedDB Persistence)

**Location**: `standalone-app.js` lines ~45-130

- Stores folder handle in IndexedDB (`md-viewer-db` database)
- Auto-restores on page load via `restoreLastFolder()`
- Permission handling: checks `queryPermission()` → requests if needed
- **Key point**: File System Access API permissions can expire; gracefully prompts user to re-authorize

### Split View with Resizable Panes

- Drag separator between editor/preview to adjust ratio
- Saved to `localStorage` key: `md-viewer-split-ratio`
- Default: 50/50 split
- Implementation: Mouse events on `.resizer` element, CSS `flex-basis` updates

### Multi-Encoding Support

- Standalone mode: Manual encoding selector (UTF-8, GBK, GB2312, Big5, etc.)
- Server mode: Server reads as UTF-8 by default (Node.js `fs.readFileSync`)
- Encoding applied when reading file via `TextDecoder` in standalone

## Development Workflows

### Starting the Server

```bash
node server.js                          # Uses docs/ folder
node server.js "C:/custom/path"         # Custom directory
```

Or use VS Code task: "Start MD Viewer" (runs `node server.js` in background)

### Testing Standalone Mode

1. Open `standalone.html` directly in Chrome/Edge (no server needed)
2. Click "打开文件夹" (Open Folder) button
3. Grant file system access permissions
4. Test features: editing, split view, Mermaid rendering, diagram zoom

### Debugging Zoom Issues

- Check console for `[Zoom]` prefixed logs
- Verify modal element IDs exist: `diagramZoomModal`, `zoomContent`, `zoomClose`, etc.
- Ensure `attachDiagramZoomEvents()` is called AFTER diagrams render
- Reference: `docs/zoom-debug-guide.md`

## Code Conventions

### Class Structure

Both `app.js` and `standalone-app.js` use single class pattern:
- `MDViewer` (server mode) / `MDViewerStandalone` (standalone mode)
- Constructor initializes: `initElements()` → `initMarked()` → `bindEvents()` → `loadTheme()`
- File operations: `loadFile()`, `saveFile()`, `updatePreview()`

### State Management

- **View mode**: `this.viewMode` - 'view', 'split' (edit mode removed in v1.4.0)
- **Current file**: `this.currentFileHandle` (standalone) / `this.currentFile` (server)
- **Modified flag**: `this.isModified` - tracked for save prompts

### Theme Switching

- CSS custom properties in `:root` and `[data-theme="dark"]`
- `localStorage.getItem('md-viewer-theme')` persists choice
- Mermaid re-initialization required on theme change

### API Endpoints (Server Mode)

```
GET  /api/files          → List all .md files recursively
GET  /api/file?path=X    → Read file content
POST /api/file           → Save file (body: {path, content})
POST /api/file/create    → Create new file (body: {path})
DELETE /api/file?path=X  → Delete file
```

## Common Pitfalls

1. **Mermaid not rendering**: Check `mermaid.run()` is called after preview content updates
2. **Zoom not working**: Ensure zoom event attachment happens AFTER Mermaid rendering, not before
3. **Split mode broken**: Verify `localStorage` key `md-viewer-split-ratio` exists and is valid number
4. **Folder memory fails**: IndexedDB may be blocked in private browsing or cross-origin contexts
5. **File save fails (standalone)**: Must request write permission via `requestPermission({mode: 'readwrite'})`

## When Modifying

- **Adding Mermaid config**: Update both `app.js` and `standalone-app.js` → `mermaid.initialize()` calls
- **New CSS for diagrams**: Add to `markdown.css` under Mermaid section (~line 388+)
- **Changing view modes**: Update `setViewMode()` method and toolbar button bindings
- **API changes (server)**: Modify both `server.js` routes AND corresponding `fetch()` calls in `app.js`

## Documentation

- User-facing docs in `docs/` folder (written in Chinese)
- Key guides: `folder-memory.md`, `zoom-feature-ready.md`, `split-mode-guide.md`, `encoding-support.md`
- Changelog maintained in `CHANGELOG.md` with emoji-prefixed sections
