# EdgySnapper 📷

A Progressive Web App for camera photography with edge detection overlay, perfect for precise alignment and creative photography.

## Features

✅ **Live Camera Preview**
- Multi-camera support with device selection
- High-resolution capture capabilities
- Real-time camera switching

✅ **Edge Detection Overlay**
- OpenCV.js-powered edge detection
- Overlay previous photo edges on live preview
- Toggle on/off for precise alignment

✅ **Project Management**
- Create and manage multiple photo projects
- Organize photos in series/sequences
- Delete projects with all associated photos

✅ **Series Navigation**
- Browse through photo sequences
- Keyboard navigation (arrow keys)
- Visual preview with counter

✅ **Movie Playback**
- Play photo series as stop-motion movies
- Adjustable playback speed (1-10 FPS)
- Full-screen movie player with controls

✅ **PWA Features**
- Install on mobile devices
- Offline capability with service worker
- Native app-like experience

## Getting Started

1. **Open in Browser**: Navigate to the app in a modern web browser
2. **Allow Camera Access**: Grant camera permissions when prompted
3. **Create Project**: Create your first project or use the default one
4. **Start Shooting**: Take your first photo to establish reference edges
5. **Align & Capture**: Use edge overlay to align subsequent shots perfectly

## Usage

### Camera Controls
- **Camera Selection**: Choose between available cameras (front/back)
- **Capture**: Press the camera button or spacebar to take photos
- **Edge Toggle**: Show/hide edge overlay from previous photo

### Project Management
- **New Project**: Create projects for different photo series
- **Switch Projects**: Select different projects from dropdown
- **Delete Project**: Remove projects and all associated photos

### Series Navigation
- **Navigation**: Use arrow buttons or keyboard arrows to browse photos
- **Movie Mode**: Play series as animation with speed control
- **Counter**: Track position in photo sequence

### Keyboard Shortcuts
- `Space` / `Enter`: Capture photo or play/pause movie
- `←` / `→`: Navigate through photo series
- `Escape`: Close movie player

## Technical Details

- **Frontend**: Vanilla JavaScript with modern Web APIs
- **Storage**: IndexedDB for photos and project data
- **Edge Detection**: OpenCV.js (WebAssembly)
- **Camera**: getUserMedia API with device enumeration
- **PWA**: Service Worker for offline capability

## Browser Support

- **Chrome/Chromium**: Full support ✅
- **Firefox**: Full support ✅  
- **Safari**: Full support ✅
- **Mobile Safari**: Full support ✅
- **Edge**: Full support ✅

## Installation

### As PWA (Recommended)
1. Open in Chrome/Safari on mobile
2. Tap "Add to Home Screen" or "Install"
3. Launch from home screen like native app

### Local Development
1. Clone or download the repository
2. Serve files over HTTPS (required for camera access)
3. Open `index.html` in browser

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .

# Using PHP
php -S localhost:8000
```

## Privacy & Security

- **Local Storage**: All photos stored locally in browser
- **No Cloud**: No data sent to external servers
- **Camera Access**: Only used for live preview and capture
- **Offline First**: Works without internet connection

## Known Limitations

- **File Size**: Large photos may impact performance
- **Storage**: Limited by browser storage quota
- **Export**: Currently no video export (image sequences only)

## Contributing

This is a complete, self-contained PWA. All features are implemented and working. For issues or enhancements, please test thoroughly across different devices and browsers.

## License

MIT License - Feel free to use and modify as needed.