# EdgySnapper Architecture

## Overview

EdgySnapper is a Progressive Web Application (PWA) built with vanilla JavaScript that provides camera-based photography with edge detection overlay for precise photo alignment.

## Core Components

### 1. Application Core (`js/app.js`)
- **Main coordinator** for all components
- Handles initialization sequence and error states
- Manages inter-component communication via custom events
- Provides global state management and user feedback

### 2. Camera Management (`js/camera.js`)
- **WebRTC camera access** via getUserMedia API
- **Multi-camera support** with device enumeration
- **Resolution management** from HD (720p) to 8K (7680×4320)
- **Automatic layout calculation** with aspect ratio preservation
- **Front camera mirroring** for better UX

### 3. Edge Detection (`js/edgeDetection.js`)
- **OpenCV.js integration** for real-time edge processing
- **Canvas overlay system** for edge visualization
- **Dynamic canvas sizing** that adapts to camera layout changes
- **Canny edge detection** with optimized parameters
- **Reference image overlay** for photo alignment

### 4. Project Management (`js/projectManager.js`)
- **Project lifecycle management** (create, select, delete)
- **IndexedDB integration** for persistent storage
- **Default project creation** for new users
- **Project switching** with automatic data loading

### 5. Series Management (`js/seriesManager.js`)
- **Photo sequence management** within projects
- **Film strip UI** with thumbnail navigation
- **Photo storage and retrieval** from IndexedDB
- **Navigation events** for edge overlay updates

### 6. Database Layer (`js/database.js`)
- **IndexedDB wrapper** for browser storage
- **Transaction management** for data integrity
- **Schema management** with version control
- **Error handling** and recovery mechanisms

### 7. Movie Player (`js/moviePlayer.js`)
- **Stop-motion playback** of photo sequences
- **Variable speed control** (1-10 FPS)
- **Canvas-based rendering** for smooth playback
- **Full-screen modal interface**

## Data Flow

```
Camera Input → Edge Processing → Canvas Overlay
     ↓              ↓               ↓
User Capture → IndexedDB Storage → Series Management
     ↓              ↓               ↓
Project Data → Film Strip UI → Movie Playback
```

## Event System

The application uses a custom event system for loose coupling:

- `cameraLayoutChanged` - Camera dimensions updated
- `projectChanged` - Active project switched
- `photosLoaded` - Series photos loaded
- `photoAdded` - New photo captured
- `seriesNavigationChanged` - Film strip selection changed
- `clearEdgeOverlay` - Remove edge visualization

## Storage Architecture

### IndexedDB Schema
- **Projects Store**: Project metadata and configuration
- **Photos Store**: Image data, timestamps, and project associations
- **Settings Store**: User preferences and application state

### Data Relationships
```
Project (1) → (N) Photos
Photo.projectId → Project.id
```

## Camera Resolution System

### Resolution Detection
1. Test resolutions from highest (8K) to lowest (VGA)
2. Find maximum supported resolution per camera
3. Filter available options based on capability
4. Provide intelligent defaults (QHD preferred)

### Supported Resolutions
- **8K**: 7680×4320 (Ultra-high-end)
- **6K**: 6144×3456 (Professional)
- **5K**: 5120×2880 (High-end)
- **4K DCI**: 4096×2304 (Cinema)
- **4K UHD**: 3840×2160 (Consumer)
- **QHD**: 2560×1440 (Default)
- **Full HD**: 1920×1080 (Standard)
- **HD**: 1280×720 (Minimum)

## PWA Implementation

### Service Worker (`sw.js`)
- **Cache-first strategy** for app shell
- **Network-first strategy** for data
- **Offline fallback** for core functionality

### Manifest (`manifest.json`)
- **App metadata** and branding
- **Installation configuration**
- **Display and orientation settings**

## Performance Optimizations

### Camera Handling
- **Debounced resize events** (300ms delay)
- **Efficient layout calculations** only when needed
- **Stream cleanup** on camera switching

### Edge Detection
- **Canvas pooling** for memory efficiency
- **Optimized OpenCV parameters** for speed
- **Conditional processing** based on user interaction

### UI Responsiveness
- **Minimal DOM manipulation** with efficient updates
- **CSS-based responsive design** with media queries
- **Touch-optimized controls** for mobile devices

## Mobile-First Design

### Responsive Breakpoints
- **Desktop**: Standard layout with all controls
- **Mobile**: `max-width: 768px` OR landscape touch devices
- **Camera-first**: Maximized preview space on mobile

### Touch Interactions
- **Floating capture button** over camera preview
- **Swipe-friendly film strip** with momentum scrolling
- **Large touch targets** (minimum 44px)

## Security Considerations

### Camera Access
- **HTTPS requirement** for getUserMedia API
- **Permission-based access** with user consent
- **No external transmission** of camera data

### Data Privacy
- **Local-only storage** in IndexedDB
- **No cloud synchronization** or external APIs
- **User-controlled data** with project deletion

## Browser Compatibility

### Core Support
- **Chrome/Chromium**: Full feature support
- **Firefox**: Full feature support  
- **Safari**: Full support including mobile
- **Edge**: Full feature support

### API Dependencies
- **getUserMedia**: Camera access (required)
- **IndexedDB**: Data storage (required)
- **Canvas 2D**: Edge overlay (required)
- **WebAssembly**: OpenCV.js (required)
- **Service Worker**: PWA features (optional)

## Error Handling

### Camera Errors
- **Permission denied**: User-friendly error message
- **Device not found**: Fallback to available cameras
- **Resolution not supported**: Automatic fallback

### Storage Errors
- **Quota exceeded**: User notification and cleanup options
- **Database corruption**: Recovery mechanisms
- **Transaction failures**: Retry logic with exponential backoff

## Future Extensibility

### Modular Design
- **Component isolation** for easy feature addition
- **Event-driven architecture** for loose coupling
- **Configuration-based** resolution and feature toggles

### API Readiness
- **Export capabilities** for photo sequences
- **Cloud storage integration** points
- **Advanced edge detection** algorithm swapping