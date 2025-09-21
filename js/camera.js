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
    this.availableResolutions = [
      { width: 7680, height: 4320, label: "8K (7680×4320)" },
      { width: 6144, height: 3456, label: "6K (6144×3456)" },
      { width: 5120, height: 2880, label: "5K (5120×2880)" },
      { width: 4096, height: 2304, label: "4K DCI (4096×2304)" },
      { width: 3840, height: 2160, label: "4K UHD (3840×2160)" },
      { width: 2560, height: 1440, label: "QHD (2560×1440)" },
      { width: 1920, height: 1080, label: "Full HD (1920×1080)" },
      { width: 1280, height: 720, label: "HD (1280×720)" },
      { width: 854, height: 480, label: "480p (854×480)" },
      { width: 640, height: 480, label: "VGA (640×480)" },
    ];

    // Handle window resize and orientation changes
    const handleLayoutChange = () => {
      // Small delay to ensure layout has settled
      setTimeout(() => {
        if (this.video.videoWidth && this.video.videoHeight) {
          this.updateCameraLayout();
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

  async init() {
    try {
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
        await this.updateResolutionForCurrentCamera();
      }

      // Create camera toggle UI
      this.createCameraToggleUI();
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
        label.includes("facetime") ||
        (!label.includes("back") &&
          !label.includes("rear") &&
          !label.includes("environment") &&
          !label.includes("main") &&
          this.devices.length > 1); // If multiple cameras and no clear indicator, assume second+ is front

      if (isFront) {
        frontCameras.push(device);
      } else {
        backCameras.push(device);
      }
    });

    // Select best cameras - prefer those with higher quality indicators in name
    this.bestBackCamera =
      this.selectBestQualityCamera(backCameras) || this.devices[0];
    this.bestFrontCamera = this.selectBestQualityCamera(frontCameras);

    console.log("Camera selection:", {
      back: this.bestBackCamera?.label,
      front: this.bestFrontCamera?.label,
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

    // Only create toggle if we have multiple cameras
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

  async startCamera(deviceId, resolution = null) {
    try {
      // Stop existing stream
      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
      }

      // Use provided resolution or default to QHD
      const targetResolution = resolution || { width: 2560, height: 1440 };

      const constraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: targetResolution.width },
          height: { ideal: targetResolution.height },
          facingMode: deviceId ? undefined : "environment",
        },
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;
      this.currentDeviceId = deviceId;
      this.currentResolution = targetResolution;

      // Wait for video metadata to load, then set up proper sizing
      this.video.addEventListener("loadedmetadata", () => {
        // Small delay to ensure video dimensions are stable
        setTimeout(() => {
          this.updateCameraLayout();
        }, 100);
      });

      // Apply mirroring to video preview for front-facing cameras
      this.updateVideoMirroring();

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
    await this.updateResolutionForCurrentCamera();

    // Update toggle UI
    const toggleButtons = document.querySelectorAll(".camera-toggle-btn");
    toggleButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.camera === cameraType);
    });
  }

  async getMaxSupportedResolution() {
    if (!this.currentDeviceId) return null;

    // Test resolutions from highest to lowest to find the maximum supported
    const testResolutions = [
      { width: 7680, height: 4320 }, // 8K
      { width: 6144, height: 3456 }, // 6K
      { width: 5120, height: 2880 }, // 5K
      { width: 4096, height: 2304 }, // 4K DCI
      { width: 3840, height: 2160 }, // 4K UHD
      { width: 2560, height: 1440 }, // QHD
      { width: 1920, height: 1080 }, // Full HD
      { width: 1280, height: 720 }, // HD
      { width: 854, height: 480 }, // 480p
      { width: 640, height: 480 }, // VGA
    ];

    for (const resolution of testResolutions) {
      try {
        const testConstraints = {
          video: {
            deviceId: { exact: this.currentDeviceId },
            width: { exact: resolution.width },
            height: { exact: resolution.height },
          },
        };

        const testStream =
          await navigator.mediaDevices.getUserMedia(testConstraints);
        testStream.getTracks().forEach((track) => track.stop());

        // This resolution works, return it as the max
        return resolution;
      } catch (error) {
        // Try next lower resolution
        continue;
      }
    }

    // If no resolution works, return null
    return null;
  }

  async updateResolutionForCurrentCamera() {
    // Test what's the maximum resolution this camera supports
    const maxSupportedResolution = await this.getMaxSupportedResolution();

    // Define preferred resolutions (HD and above)
    const preferredResolutions = [
      { width: 7680, height: 4320, label: "8K (7680×4320)" },
      { width: 6144, height: 3456, label: "6K (6144×3456)" },
      { width: 5120, height: 2880, label: "5K (5120×2880)" },
      { width: 4096, height: 2304, label: "4K DCI (4096×2304)" },
      { width: 3840, height: 2160, label: "4K UHD (3840×2160)" },
      { width: 2560, height: 1440, label: "QHD (2560×1440)" },
      { width: 1920, height: 1080, label: "Full HD (1920×1080)" },
      { width: 1280, height: 720, label: "HD (1280×720)" },
    ];

    // Fallback resolutions for cameras with max resolution below HD
    const fallbackResolutions = [
      { width: 854, height: 480, label: "480p (854×480)" },
      { width: 640, height: 480, label: "VGA (640×480)" },
    ];

    let availableResolutions;

    // If max supported resolution is below HD, include fallback resolutions
    if (
      maxSupportedResolution &&
      (maxSupportedResolution.width < 1280 ||
        maxSupportedResolution.height < 720)
    ) {
      // Filter fallback resolutions that are at or below the max supported
      const supportedFallbacks = fallbackResolutions.filter(
        (res) =>
          res.width <= maxSupportedResolution.width &&
          res.height <= maxSupportedResolution.height,
      );
      availableResolutions = [...preferredResolutions, ...supportedFallbacks];
    } else {
      // Only show HD and above
      availableResolutions = preferredResolutions;
    }

    // Filter out resolutions higher than max supported
    if (maxSupportedResolution) {
      availableResolutions = availableResolutions.filter(
        (res) =>
          res.width <= maxSupportedResolution.width &&
          res.height <= maxSupportedResolution.height,
      );
    }

    // Select best resolution automatically - prefer QHD, then Full HD, then highest available
    let bestRes =
      availableResolutions.find((r) => r.width === 2560 && r.height === 1440) ||
      availableResolutions.find((r) => r.width === 1920 && r.height === 1080) ||
      availableResolutions[0];

    // If we're not already using this resolution, switch to it
    if (
      bestRes &&
      (!this.currentResolution ||
        this.currentResolution.width !== bestRes.width ||
        this.currentResolution.height !== bestRes.height)
    ) {
      await this.startCamera(this.currentDeviceId, bestRes);
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
    } else if (window.orientation !== undefined) {
      return window.orientation;
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
