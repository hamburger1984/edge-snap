class CameraManager {
  constructor() {
    this.stream = null;
    this.currentDeviceId = null;
    this.currentResolution = null;
    this.video = document.getElementById("cameraPreview");
    this.devices = [];
    this.bestFrontCamera = null;
    this.bestBackCamera = null;
    this.currentCameraType = "back"; // 'front' or 'back'
    this.lastOrientation = null; // Will be set during init

    // Handle window resize and orientation changes
    const handleLayoutChange = () => {
      // Small delay to ensure layout has settled
      setTimeout(() => {
        if (this.video.videoWidth && this.video.videoHeight) {
          this.handleOrientationChange();
        }
      }, 100);
    };

    window.addEventListener("resize", handleLayoutChange);
    window.addEventListener("orientationchange", handleLayoutChange);

    // Also listen for visual viewport changes on mobile
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleLayoutChange);
    }
  }

  async handleOrientationChange() {
    const currentOrientation = this.isPortraitMode();

    // Check if orientation actually changed (or if this is first call)
    if (
      this.lastOrientation === null ||
      currentOrientation !== this.lastOrientation
    ) {
      if (this.lastOrientation !== null) {
        console.log(
          "Orientation changed:",
          this.lastOrientation ? "portrait→landscape" : "landscape→portrait",
        );

        // Restart camera with new aspect ratio constraints
        if (this.currentDeviceId) {
          await this.startCamera(this.currentDeviceId);
        }
      }

      this.lastOrientation = currentOrientation;
    } else {
      // Just update layout if no orientation change
      this.updateCameraLayout();
    }
  }

  isPortraitMode() {
    // Check if device is in portrait mode
    return window.innerHeight > window.innerWidth;
  }

  getTargetAspectRatio() {
    // Return 16:10 for landscape, 10:16 for portrait
    return this.isPortraitMode() ? 0.625 : 1.6;
  }

  async init() {
    try {
      // Initialize orientation tracking
      this.lastOrientation = this.isPortraitMode();

      // Request camera permission
      await navigator.mediaDevices.getUserMedia({ video: true });

      // Get available devices and select best cameras
      await this.updateDeviceList();
      this.selectBestCameras();

      // Start with the best back camera (preferred) or front camera as fallback
      const startDeviceId =
        this.bestBackCamera?.deviceId || this.bestFrontCamera?.deviceId;
      if (startDeviceId) {
        this.currentCameraType = this.bestBackCamera ? "back" : "front";
        await this.startCamera(startDeviceId);
        // No need to call updateResolutionForCurrentCamera() here since startCamera
        // without resolution will use camera's default best resolution
      }

      // Create camera toggle UI
      this.createCameraToggleUI();

      // Create resolution overlay
      this.createResolutionOverlay();
    } catch (error) {
      console.error("Error initializing camera:", error);
      this.showError("Camera access denied or not available");
    }
  }

  async updateDeviceList() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.devices = devices.filter((device) => device.kind === "videoinput");
    } catch (error) {
      console.error("Error getting camera devices:", error);
    }
  }

  selectBestCameras() {
    // Categorize cameras as front or back based on labels and facing mode
    const frontCameras = [];
    const backCameras = [];

    this.devices.forEach((device) => {
      const label = device.label.toLowerCase();

      // Determine if it's a front camera based on label
      const isFront =
        label.includes("front") ||
        label.includes("user") ||
        label.includes("selfie") ||
        label.includes("facetime");

      if (isFront) {
        frontCameras.push(device);
      } else {
        backCameras.push(device);
      }
    });

    // Select best cameras - prefer those with higher quality indicators in name
    this.bestBackCamera = this.selectBestQualityCamera(backCameras);
    this.bestFrontCamera = this.selectBestQualityCamera(frontCameras);

    // If we have only one camera and no clear front/back distinction, treat it as back camera
    if (
      this.devices.length === 1 &&
      !this.bestBackCamera &&
      !this.bestFrontCamera
    ) {
      this.bestBackCamera = this.devices[0];
    }

    console.log("Camera selection:", {
      total: this.devices.length,
      back: this.bestBackCamera?.label,
      front: this.bestFrontCamera?.label,
      devices: this.devices.map((d) => d.label),
    });
  }

  selectBestQualityCamera(cameras) {
    if (!cameras.length) return null;
    if (cameras.length === 1) return cameras[0];

    // Score cameras based on label quality indicators
    const scored = cameras.map((camera) => {
      const label = camera.label.toLowerCase();
      let score = 0;

      // Prefer cameras with quality indicators
      if (label.includes("hd") || label.includes("high")) score += 2;
      if (label.includes("4k") || label.includes("uhd")) score += 5;
      if (label.includes("main") || label.includes("primary")) score += 3;
      if (label.includes("wide")) score += 1;

      // Avoid low quality cameras
      if (label.includes("vga") || label.includes("low")) score -= 2;

      return { camera, score };
    });

    // Return highest scoring camera
    scored.sort((a, b) => b.score - a.score);
    return scored[0].camera;
  }

  createCameraToggleUI() {
    // Remove existing toggle if present
    const existingToggle = document.getElementById("cameraToggle");
    if (existingToggle) {
      existingToggle.remove();
    }

    // Only create toggle if we have both front and back cameras
    if (!this.bestFrontCamera || !this.bestBackCamera) {
      return;
    }

    const cameraContainer = document.querySelector(".camera-container");
    if (!cameraContainer) return;

    const toggleGroup = document.createElement("div");
    toggleGroup.id = "cameraToggle";
    toggleGroup.className = "camera-toggle-group";

    toggleGroup.innerHTML = `
      <button class="camera-toggle-btn ${this.currentCameraType === "back" ? "active" : ""}"
              data-camera="back" title="Back Camera">
        📷
      </button>
      <button class="camera-toggle-btn ${this.currentCameraType === "front" ? "active" : ""}"
              data-camera="front" title="Front Camera">
        🤳
      </button>
    `;

    // Add event listeners
    toggleGroup.addEventListener("click", (e) => {
      const button = e.target.closest(".camera-toggle-btn");
      if (!button) return;

      const cameraType = button.dataset.camera;
      this.switchToCamera(cameraType);
    });

    cameraContainer.appendChild(toggleGroup);
  }

  createResolutionOverlay() {
    // Remove existing overlay if present
    const existingOverlay = document.getElementById("resolutionOverlay");
    if (existingOverlay) {
      existingOverlay.remove();
    }

    const cameraContainer = document.querySelector(".camera-container");
    if (!cameraContainer) return;

    const resolutionOverlay = document.createElement("div");
    resolutionOverlay.id = "resolutionOverlay";
    resolutionOverlay.className = "resolution-overlay";

    cameraContainer.appendChild(resolutionOverlay);
  }

  updateResolutionOverlay() {
    const overlay = document.getElementById("resolutionOverlay");
    if (!overlay || !this.currentResolution) return;

    overlay.textContent = `${this.currentResolution.width}×${this.currentResolution.height}`;
  }

  async startCamera(deviceId, resolution = null) {
    try {
      // Stop existing stream
      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
      }

      // Use provided resolution or let camera choose its best
      const targetResolution = resolution;

      const constraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,

          ...(targetResolution
            ? {
                width: { ideal: targetResolution.width },
                height: { ideal: targetResolution.height },
              }
            : this.isPortraitMode()
              ? {
                  height: { ideal: 1920 }, // High resolution for portrait
                  aspectRatio: { ideal: 0.625 }, // 10:16
                }
              : {
                  width: { ideal: 1920 }, // High resolution for landscape
                  aspectRatio: { ideal: 1.6 }, // 16:10
                }),
          facingMode: deviceId ? undefined : "environment",
        },
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;
      this.currentDeviceId = deviceId;
      this.currentResolution = targetResolution;

      // Wait for video metadata to load, then set up proper sizing
      this.video.addEventListener("loadedmetadata", () => {
        // Update current resolution from actual video dimensions if not specified
        if (!targetResolution) {
          this.currentResolution = {
            width: this.video.videoWidth,
            height: this.video.videoHeight,
          };
          // Update resolution overlay with actual dimensions
          this.updateResolutionOverlay();
        }

        // Small delay to ensure video dimensions are stable
        setTimeout(() => {
          this.updateCameraLayout();
        }, 100);
      });

      // Apply mirroring to video preview for front-facing cameras
      this.updateVideoMirroring();

      // Update resolution overlay
      this.updateResolutionOverlay();

      return true;
    } catch (error) {
      console.error("Error starting camera:", error);
      this.showError("Failed to start camera");
      return false;
    }
  }

  async switchToCamera(cameraType) {
    const targetCamera =
      cameraType === "front" ? this.bestFrontCamera : this.bestBackCamera;
    if (!targetCamera || targetCamera.deviceId === this.currentDeviceId) {
      return;
    }

    this.currentCameraType = cameraType;
    await this.startCamera(targetCamera.deviceId);
    // Camera will use its default best resolution

    // Update toggle UI
    const toggleButtons = document.querySelectorAll(".camera-toggle-btn");
    toggleButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.camera === cameraType);
    });
  }

  async getMaxSupportedResolution() {
    if (!this.currentDeviceId) return null;

    try {
      // Ask the camera for its maximum supported resolution by not specifying constraints
      const testConstraints = {
        video: {
          deviceId: { exact: this.currentDeviceId },
          width: { ideal: 8192 }, // Ask for very high resolution
          height: { ideal: 8192 },
        },
      };

      const testStream =
        await navigator.mediaDevices.getUserMedia(testConstraints);

      // Create a video element to get the actual resolution
      const video = document.createElement("video");
      video.srcObject = testStream;

      return new Promise((resolve) => {
        video.addEventListener("loadedmetadata", () => {
          const resolution = {
            width: video.videoWidth,
            height: video.videoHeight,
          };

          // Clean up
          testStream.getTracks().forEach((track) => track.stop());

          resolve(resolution);
        });
      });
    } catch (error) {
      console.error("Failed to get max resolution:", error);
      return null;
    }
  }

  async updateResolutionForCurrentCamera() {
    // Get the maximum resolution this camera supports
    const maxSupportedResolution = await this.getMaxSupportedResolution();

    if (!maxSupportedResolution) {
      console.warn("Could not determine max resolution for camera");
      return;
    }

    // Use the highest resolution the camera supports
    if (
      !this.currentResolution ||
      this.currentResolution.width !== maxSupportedResolution.width ||
      this.currentResolution.height !== maxSupportedResolution.height
    ) {
      await this.startCamera(this.currentDeviceId, maxSupportedResolution);
    }
  }

  capturePhoto() {
    if (!this.stream) {
      this.showError("No camera stream available");
      return null;
    }

    const canvas = document.getElementById("captureCanvas");
    const context = canvas.getContext("2d");

    // Set canvas size to video dimensions
    canvas.width = this.video.videoWidth;
    canvas.height = this.video.videoHeight;

    // Capture the image in its true orientation (not mirrored)
    // The preview may be mirrored for UI purposes, but captured photos should be true orientation
    const isFrontCamera = this.isFrontFacingCamera();
    context.drawImage(this.video, 0, 0, canvas.width, canvas.height);

    // Convert to data URL
    const imageData = canvas.toDataURL("image/jpeg", 0.9);

    return {
      imageData,
      width: canvas.width,
      height: canvas.height,
      timestamp: new Date(),
      isFrontCamera: isFrontCamera,
    };
  }

  getVideoElement() {
    return this.video;
  }

  getStream() {
    return this.stream;
  }

  isReady() {
    return this.stream && this.video.videoWidth > 0;
  }

  showError(message) {
    // Create a simple error display
    const errorDiv = document.createElement("div");
    errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #f44336;
            color: white;
            padding: 1rem 2rem;
            border-radius: 8px;
            z-index: 10000;
            font-size: 1rem;
        `;
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);

    setTimeout(() => {
      document.body.removeChild(errorDiv);
    }, 3000);
  }

  isFrontFacingCamera() {
    if (!this.currentDeviceId) return false;

    const currentDevice = this.devices.find(
      (d) => d.deviceId === this.currentDeviceId,
    );
    if (!currentDevice) return false;

    // Check if device label suggests it's a front camera
    const label = currentDevice.label.toLowerCase();
    return (
      label.includes("front") ||
      label.includes("user") ||
      label.includes("selfie") ||
      (!label.includes("back") &&
        !label.includes("rear") &&
        !label.includes("environment"))
    );
  }

  updateVideoMirroring() {
    // Get current orientation
    const orientation = this.getDeviceOrientation();

    // Apply mirroring and orientation together
    this.applyOrientationTransform(orientation);
  }

  updateCameraLayout() {
    if (!this.video.videoWidth || !this.video.videoHeight) {
      return;
    }

    const container = this.video.parentElement;
    if (!container) return;

    // Handle device orientation for mobile
    const orientation = this.getDeviceOrientation();
    this.applyOrientationTransform(orientation);

    const videoAspect = this.video.videoWidth / this.video.videoHeight;
    const maxWidth = window.innerWidth;
    const maxHeight = window.innerHeight * 0.8; // 80vh max

    let targetWidth, targetHeight;

    // Calculate optimal size maintaining aspect ratio
    if (videoAspect > maxWidth / maxHeight) {
      // Video is wider - fit to width
      targetWidth = maxWidth;
      targetHeight = maxWidth / videoAspect;
    } else {
      // Video is taller - fit to height
      targetHeight = maxHeight;
      targetWidth = maxHeight * videoAspect;
    }

    // Set container dimensions
    container.style.width = targetWidth + "px";
    container.style.height = targetHeight + "px";

    // Center the container horizontally
    container.style.marginLeft = "auto";
    container.style.marginRight = "auto";

    // Dispatch event to notify edge detection that layout has changed
    const event = new CustomEvent("cameraLayoutChanged", {
      detail: {
        width: targetWidth,
        height: targetHeight,
        aspect: videoAspect,
        orientation: orientation,
      },
    });
    document.dispatchEvent(event);
  }

  getDeviceOrientation() {
    // Detect device orientation
    if (screen && screen.orientation) {
      return screen.orientation.angle;
    }

    // Fallback: detect based on window dimensions
    const isLandscape = window.innerWidth > window.innerHeight;
    return isLandscape ? 90 : 0;
  }

  applyOrientationTransform(orientation) {
    // Determine if front camera should be mirrored
    const shouldMirror = this.isFrontFacingCamera();

    let transform = "";

    // Apply mirroring if needed
    if (shouldMirror) {
      transform += "scaleX(-1) ";
    }

    // Apply rotation based on orientation
    // The key insight: mobile browsers may report video in a different orientation
    // than the actual device orientation, causing the 90° rotation issue
    if (orientation === 90 || orientation === -270) {
      // Landscape left - some devices need correction
      if (this.needsOrientationCorrection()) {
        transform += "rotate(-90deg) ";
      }
    } else if (orientation === -90 || orientation === 270) {
      // Landscape right - some devices need correction
      if (this.needsOrientationCorrection()) {
        transform += "rotate(90deg) ";
      }
    } else if (orientation === 180) {
      // Portrait upside down
      transform += "rotate(180deg) ";
    }
    // Portrait normal needs no rotation

    this.video.style.transform = transform.trim();
  }

  needsOrientationCorrection() {
    // Check if we're on mobile and the video dimensions suggest it needs rotation
    const isMobile =
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );
    if (!isMobile) return false;

    // If video width > height but we're in landscape, it might need correction
    const isVideoLandscape = this.video.videoWidth > this.video.videoHeight;
    const isViewportLandscape = window.innerWidth > window.innerHeight;

    // If video and viewport orientations don't match, we might need correction
    return isVideoLandscape !== isViewportLandscape;
  }

  destroy() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }
}
