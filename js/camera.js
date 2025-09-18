class CameraManager {
  constructor() {
    this.stream = null;
    this.currentDeviceId = null;
    this.currentResolution = null;
    this.video = document.getElementById("cameraPreview");
    this.devices = [];
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

      // Get available devices
      await this.updateDeviceList();

      // Start with the first available camera
      if (this.devices.length > 0) {
        await this.startCamera(this.devices[0].deviceId);
        // Update resolution list after camera starts
        await this.updateResolutionList();
      }
    } catch (error) {
      console.error("Error initializing camera:", error);
      this.showError("Camera access denied or not available");
    }
  }

  async updateDeviceList() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.devices = devices.filter((device) => device.kind === "videoinput");

      const select = document.getElementById("cameraSelect");
      select.innerHTML = '<option value="">Select Camera</option>';

      this.devices.forEach((device, index) => {
        const option = document.createElement("option");
        option.value = device.deviceId;
        option.textContent = device.label || `Camera ${index + 1}`;
        select.appendChild(option);
      });

      // Set the current device as selected
      if (this.currentDeviceId) {
        select.value = this.currentDeviceId;
      }
    } catch (error) {
      console.error("Error getting camera devices:", error);
    }
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

      // Update device list with labels now that we have permission
      await this.updateDeviceList();

      return true;
    } catch (error) {
      console.error("Error starting camera:", error);
      this.showError("Failed to start camera");
      return false;
    }
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

  async updateResolutionList() {
    const select = document.getElementById("resolutionSelect");
    select.innerHTML = '<option value="">Select Resolution</option>';

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

    // Populate the select with available resolutions
    availableResolutions.forEach((resolution) => {
      const option = document.createElement("option");
      option.value = `${resolution.width}x${resolution.height}`;
      option.textContent = resolution.label;
      select.appendChild(option);
    });

    // Set default selection - prefer QHD, then Full HD, then highest available
    let defaultRes =
      availableResolutions.find((r) => r.width === 2560 && r.height === 1440) ||
      availableResolutions.find((r) => r.width === 1920 && r.height === 1080) ||
      availableResolutions[0];

    if (defaultRes) {
      select.value = `${defaultRes.width}x${defaultRes.height}`;

      // If we're not already using this resolution, switch to it
      if (
        !this.currentResolution ||
        this.currentResolution.width !== defaultRes.width ||
        this.currentResolution.height !== defaultRes.height
      ) {
        await this.startCamera(this.currentDeviceId, defaultRes);
      }
    }
  }

  async switchResolution(resolutionString) {
    if (!resolutionString || !this.currentDeviceId) return;

    const [width, height] = resolutionString.split("x").map(Number);
    const resolution = { width, height };

    try {
      await this.startCamera(this.currentDeviceId, resolution);
    } catch (error) {
      console.error("Failed to switch to resolution:", resolution, error);
      this.showError(
        `Resolution ${width}×${height} not supported by this camera`,
      );

      // Revert to previous selection
      const resolutionSelect = document.getElementById("resolutionSelect");
      if (this.currentResolution) {
        resolutionSelect.value = `${this.currentResolution.width}x${this.currentResolution.height}`;
      }
    }
  }

  async switchCamera(deviceId) {
    if (deviceId && deviceId !== this.currentDeviceId) {
      await this.startCamera(deviceId);
      await this.updateResolutionList();
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
    if (this.isFrontFacingCamera()) {
      this.video.style.transform = "scaleX(-1)";
    } else {
      this.video.style.transform = "scaleX(1)";
    }
  }

  updateCameraLayout() {
    if (!this.video.videoWidth || !this.video.videoHeight) {
      return;
    }

    const container = this.video.parentElement;
    if (!container) return;

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
      },
    });
    document.dispatchEvent(event);
  }

  destroy() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }
}
