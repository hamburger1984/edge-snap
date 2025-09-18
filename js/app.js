class EdgySnapperApp {
  constructor() {
    this.database = null;
    this.camera = null;
    this.edgeDetection = null;
    this.projectManager = null;
    this.seriesManager = null;
    this.moviePlayer = null;

    this.isInitialized = false;
  }

  async init() {
    try {
      // Show loading state
      this.showLoading("Initializing EdgySnapper...");

      // Initialize database
      this.database = new Database();
      await this.database.init();

      // Initialize camera
      this.camera = new CameraManager();
      await this.camera.init();

      // Initialize edge detection
      this.edgeDetection = new EdgeDetection();
      await this.edgeDetection.init();

      // Initialize series manager first (needs to listen for project events)
      this.seriesManager = new SeriesManager(this.database);

      // Initialize project manager (will dispatch project change events)
      this.projectManager = new ProjectManager(this.database);
      await this.projectManager.init();

      // Initialize movie player
      this.moviePlayer = new MoviePlayer();

      // Set up main app event listeners
      this.setupEventListeners();

      // Mark as initialized
      this.isInitialized = true;

      this.hideLoading();
      this.showSuccess("EdgySnapper initialized successfully!");
    } catch (error) {
      console.error("Error initializing app:", error);
      this.hideLoading();
      this.showError("Failed to initialize app: " + error.message);
    }
  }

  setupEventListeners() {
    // Camera selection
    const cameraSelect = document.getElementById("cameraSelect");
    cameraSelect.addEventListener("change", (e) => {
      this.camera.switchCamera(e.target.value);
    });

    // Toggle edges
    const toggleEdgesBtn = document.getElementById("toggleEdges");
    toggleEdgesBtn.addEventListener("click", () => {
      const enabled = this.edgeDetection.toggleEdges();
      toggleEdgesBtn.textContent = enabled ? "Hide Edges" : "Show Edges";
      toggleEdgesBtn.classList.toggle("btn-secondary", !enabled);
      toggleEdgesBtn.classList.toggle("btn-primary", enabled);
    });

    // Capture photo
    const captureBtn = document.getElementById("captureBtn");
    captureBtn.addEventListener("click", () => {
      this.capturePhoto();
    });

    // Listen for photo additions to update edge overlay
    document.addEventListener("photoAdded", (e) => {
      this.updateEdgeOverlay();
    });

    // Listen for project changes to update edge overlay
    document.addEventListener("projectChanged", (e) => {
      this.updateEdgeOverlay();
    });

    // Listen for photos loaded to update edge overlay
    document.addEventListener("photosLoaded", (e) => {
      this.updateEdgeOverlay();
    });

    // Listen for edge overlay clear requests
    document.addEventListener("clearEdgeOverlay", (e) => {
      if (this.edgeDetection) {
        this.edgeDetection.clearOverlay();
      }
    });

    // Listen for series navigation changes to update edge overlay
    document.addEventListener("seriesNavigationChanged", (e) => {
      this.updateEdgeOverlayForPhoto(e.detail.currentPhoto);
    });

    // Listen for window resize to update edge overlay
    window.addEventListener("resize", () => {
      // Debounce resize events
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        if (
          this.edgeDetection &&
          this.edgeDetection.edgeImageData &&
          this.seriesManager &&
          this.seriesManager.hasPhotos()
        ) {
          this.updateEdgeOverlay();
        }
      }, 250);
    });

    // Update edge overlay periodically if camera is active
    this.startEdgeUpdateLoop();

    // Handle visibility change to pause/resume camera
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.pauseApp();
      } else {
        this.resumeApp();
      }
    });
  }

  async capturePhoto() {
    if (!this.camera || !this.camera.isReady()) {
      console.error("App: Camera not ready");
      this.showError("Camera not ready");
      return;
    }

    if (!this.seriesManager.currentProject) {
      console.error("App: No project selected");
      this.showError("No project selected");
      return;
    }

    try {
      const photo = this.camera.capturePhoto();
      if (!photo) {
        console.error("App: Failed to capture photo");
        this.showError("Failed to capture photo");
        return;
      }

      await this.seriesManager.addPhoto(photo);

      this.showSuccess("Photo captured successfully!");
    } catch (error) {
      console.error("Error capturing photo:", error);
      this.showError("Failed to save photo: " + error.message);
    }
  }

  async updateEdgeOverlay() {
    if (!this.edgeDetection || !this.seriesManager) {
      return;
    }

    // Use the currently selected photo if available, otherwise use the most recent
    const currentPhoto = this.seriesManager.getCurrentPhoto();
    const photos = this.seriesManager.getAllPhotos();
    const referencePhoto =
      currentPhoto || (photos.length > 0 ? photos[photos.length - 1] : null);

    this.updateEdgeOverlayForPhoto(referencePhoto);
  }

  updateEdgeOverlayForPhoto(photo) {
    if (!this.edgeDetection) {
      return;
    }

    if (photo) {
      // Get camera mirroring state for proper edge alignment
      const isFrontCamera = this.camera
        ? this.camera.isFrontFacingCamera()
        : false;
      this.edgeDetection.updateOverlay(photo.imageData, isFrontCamera);
    } else {
      this.edgeDetection.updateOverlay(null, false);
    }
  }

  startEdgeUpdateLoop() {
    // Update edges periodically when camera is active
    setInterval(() => {
      if (
        this.camera &&
        this.camera.isReady() &&
        this.edgeDetection &&
        this.edgeDetection.isEnabled() &&
        this.edgeDetection.edgeImageData
      ) {
        // Only redraw if we have edge data and canvas is ready
        const canvas = document.getElementById("edgeOverlay");
        if (canvas && canvas.width && canvas.height) {
          this.edgeDetection.drawEdges();
        }
      }
    }, 100); // Update 10 times per second
  }

  pauseApp() {
    // Pause camera and other resources when app is not visible
    if (this.camera) {
      this.camera.destroy();
    }
  }

  async resumeApp() {
    // Resume camera when app becomes visible again
    if (this.camera && !this.camera.getStream()) {
      await this.camera.init();
      this.updateEdgeOverlay();
    }
  }

  showLoading(message) {
    const loadingDiv = document.createElement("div");
    loadingDiv.id = "appLoading";
    loadingDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            font-size: 1.2rem;
        `;

    loadingDiv.innerHTML = `
            <div style="margin-bottom: 1rem;">📷</div>
            <div>${message}</div>
            <div style="margin-top: 1rem; font-size: 0.9rem; opacity: 0.7;">Please allow camera access</div>
        `;

    document.body.appendChild(loadingDiv);
  }

  hideLoading() {
    const loadingDiv = document.getElementById("appLoading");
    if (loadingDiv) {
      document.body.removeChild(loadingDiv);
    }
  }

  showError(message) {
    const errorDiv = document.createElement("div");
    errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #f44336;
            color: white;
            padding: 1rem 2rem;
            border-radius: 8px;
            z-index: 10000;
            font-size: 1rem;
            max-width: 90vw;
            text-align: center;
        `;
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);

    setTimeout(() => {
      if (document.body.contains(errorDiv)) {
        document.body.removeChild(errorDiv);
      }
    }, 4000);
  }

  showSuccess(message) {
    const successDiv = document.createElement("div");
    successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #4CAF50;
            color: white;
            padding: 1rem 2rem;
            border-radius: 8px;
            z-index: 10000;
            font-size: 1rem;
            max-width: 90vw;
            text-align: center;
        `;
    successDiv.textContent = message;
    document.body.appendChild(successDiv);

    setTimeout(() => {
      if (document.body.contains(successDiv)) {
        document.body.removeChild(successDiv);
      }
    }, 2000);
  }

  // Utility method to check if app is ready
  isReady() {
    return (
      this.isInitialized &&
      this.camera &&
      this.camera.isReady() &&
      this.database &&
      this.projectManager &&
      this.projectManager.getCurrentProject()
    );
  }

  // Get app status for debugging
  getStatus() {
    return {
      initialized: this.isInitialized,
      camera: this.camera?.isReady() || false,
      edgeDetection: this.edgeDetection?.isReady() || false,
      currentProject: this.projectManager?.getCurrentProject()?.name || null,
      photoCount: this.seriesManager?.getPhotoCount() || 0,
    };
  }
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", async () => {
  window.edgySnapper = new EdgySnapperApp();
  await window.edgySnapper.init();
});
