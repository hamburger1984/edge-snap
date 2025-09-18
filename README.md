# EdgeSnap 📷

A Progressive Web App for camera photography with real-time edge detection overlay, designed for precise photo alignment and creative photography. Perfect for stop-motion animation, time-lapse sequences, and professional photo series.

## ✨ Key Features

### 📸 **Advanced Camera System**
- Multi-camera support with intelligent device selection
- Resolution selector from HD (720p) to 8K (7680×4320)
- Automatic resolution filtering based on camera capabilities
- Optimized preview scaling up to 80% of viewport height
- Front camera mirroring for better user experience

### 🎯 **Real-Time Edge Detection**
- OpenCV.js-powered live edge detection overlay
- Precise canvas synchronization with camera preview
- Reference photo alignment for perfect shot matching
- Adaptive edge detection that works across resolutions
- Toggle overlay visibility for clear capture view

### 📁 **Smart Project Management**
- Create and organize multiple photo projects
- Automatic project persistence with IndexedDB
- Project switching with instant photo loading
- Bulk project deletion with confirmation

### 🎬 **Film Strip Navigation**
- Horizontal scrolling thumbnail interface
- Click-to-select photo navigation
- Auto-centering of selected photos
- Smooth scrolling that stays within bounds
- Visual indicators for current selection

### 🎭 **Stop-Motion Movie Player**
- Variable speed playback (1-10 FPS)
- Full-screen movie mode with controls
- Canvas-based smooth rendering
- Keyboard controls for easy operation

### 📱 **Mobile-First Design**
- Floating capture button for one-handed operation
- Touch-optimized interface with large targets
- Responsive design that adapts to orientation changes
- Advanced mobile device detection (including landscape)
- Optimized performance for mobile browsers

### 🔧 **PWA Capabilities**
- Full offline functionality with service worker
- Install as native app on mobile devices
- Background sync and caching strategies
- Native app-like experience and performance

## 🚀 Getting Started

### Quick Start
1. **Open App**: Navigate to EdgeSnap in your browser
2. **Grant Permissions**: Allow camera access when prompted
3. **Select Camera**: Choose your preferred camera device
4. **Pick Resolution**: Select optimal resolution for your needs
5. **Create Project**: Start with default project or create new one
6. **Capture**: Tap floating button or press spacebar to take photos
7. **Align**: Use edge overlay to align subsequent shots perfectly

### Camera Setup
- **Camera Selection**: Dropdown menu shows all available cameras
- **Resolution Options**: Intelligent filtering shows only supported resolutions
- **Preview Size**: Maximized for mobile, responsive for desktop
- **Quality**: High-resolution capture independent of preview size

## 🎮 Controls & Navigation

### Camera Controls
- **Floating Capture Button**: Always-visible camera button (bottom-right)
- **Spacebar**: Quick capture with keyboard
- **Enter**: Alternative capture key
- **Resolution Selector**: Change capture quality on-the-fly

### Film Strip Navigation
- **Click Photos**: Select any photo in the sequence
- **Auto-Centering**: Selected photos automatically center in view
- **Smooth Scrolling**: Contained within film strip area

### Movie Player
- **Space/Enter**: Play/pause movie playback
- **Speed Control**: Adjust 1-10 FPS playback speed
- **Escape**: Exit full-screen movie mode
- **Arrow Keys**: Navigate frame-by-frame when paused

### Project Management
- **Project Dropdown**: Switch between projects instantly
- **New Project**: Create projects for different photo series
- **Delete Projects**: Remove with confirmation dialog

## 🔧 Technical Architecture

### Core Technologies
- **Frontend**: Modern vanilla JavaScript (ES6+)
- **Camera API**: WebRTC getUserMedia with device enumeration
- **Image Processing**: OpenCV.js (WebAssembly) for edge detection
- **Storage**: IndexedDB for local photo and project persistence
- **Graphics**: Canvas 2D API for overlays and movie playback
- **PWA**: Service Worker with cache-first strategies

### Performance Optimizations
- **Resolution Intelligence**: Only show supported camera resolutions
- **Canvas Efficiency**: Optimized sizing and memory management
- **Mobile Performance**: Reduced logging and efficient touch handling
- **Memory Management**: Automatic cleanup and garbage collection
- **Event Debouncing**: Smooth resize and orientation handling

### Browser Support Matrix
| Browser | Desktop | Mobile | PWA Install | Camera Access |
|---------|---------|--------|-------------|---------------|
| Chrome | ✅ Full | ✅ Full | ✅ Yes | ✅ Yes |
| Firefox | ✅ Full | ✅ Full | ❌ No | ✅ Yes |
| Safari | ✅ Full | ✅ Full | ✅ Yes | ✅ Yes |
| Edge | ✅ Full | ✅ Full | ✅ Yes | ✅ Yes |

## 📱 Installation Options

### PWA Installation (Recommended)
**Mobile (iOS/Android):**
1. Open in Safari/Chrome
2. Tap "Add to Home Screen" or browser install prompt
3. Launch from home screen like native app

**Desktop:**
1. Look for install icon in browser address bar
2. Click "Install EdgeSnap"
3. Launch from desktop/applications folder

### Local Development
```bash
# Serve over HTTPS (required for camera access)
# Using Python 3
python -m http.server 8000

# Using Node.js
npx serve .

# Using PHP
php -S localhost:8000

# Then visit: https://localhost:8000
```

## 🛡️ Privacy & Security

### Data Protection
- **100% Local**: All photos stored only in your browser
- **No Cloud**: Zero external data transmission
- **No Analytics**: No tracking or usage monitoring
- **Camera Privacy**: Camera access only for preview/capture
- **Offline First**: Full functionality without internet

### Storage Details
- **Technology**: IndexedDB browser database
- **Capacity**: Limited by browser storage quota (typically 1-10GB)
- **Persistence**: Data survives browser restarts
- **Deletion**: User-controlled project and photo removal

## 📊 Resolution Support

### Supported Capture Resolutions
- **8K UHD**: 7680×4320 (Professional/High-end cameras)
- **6K**: 6144×3456 (Professional cameras)
- **5K**: 5120×2880 (High-end cameras)
- **4K DCI**: 4096×2304 (Cinema standard)
- **4K UHD**: 3840×2160 (Consumer 4K)
- **QHD**: 2560×1440 (Recommended default)
- **Full HD**: 1920×1080 (Standard quality)
- **HD**: 1280×720 (Minimum supported)

### Smart Resolution Filtering
- Automatically detects camera capabilities
- Hides unsupported resolutions
- Shows ultra-high resolutions when available
- Prevents selection below HD unless camera maximum is lower

## 🔍 Edge Detection Details

### Algorithm Features
- **Real-time Processing**: Live edge detection on camera stream
- **Canny Edge Detection**: Industry-standard edge detection algorithm
- **Adaptive Parameters**: Optimized for various lighting conditions
- **Overlay Synchronization**: Perfect alignment with camera preview
- **Reference Mode**: Overlay previous photo edges for alignment

### Use Cases
- **Stop-Motion Animation**: Perfect frame alignment
- **Time-Lapse Photography**: Consistent positioning
- **Product Photography**: Precise object placement
- **Architectural Photography**: Straight line alignment
- **Creative Projects**: Artistic composition assistance

## 📚 Documentation

For detailed technical information, see:
- **[Architecture Guide](docs/ARCHITECTURE.md)**: Complete technical documentation
- **[Development Notes](CLAUDE.md)**: Development guidelines and standards

## 🤝 Contributing

EdgeSnap is feature-complete but welcomes improvements:

1. **Test Thoroughly**: Verify changes across browsers and devices
2. **Follow Standards**: Maintain code quality and documentation
3. **Mobile First**: Ensure mobile compatibility for all changes
4. **Performance**: Profile changes for performance impact

## 📄 License

MIT License - Open source and free to use, modify, and distribute.

---

**Built with ❤️ for photographers, animators, and creative professionals**