class CameraManager {
  constructor() {
    this.stream = null;
    this.currentDeviceId = null;
    this.video = document.getElementById("cameraPreview");
    this.devices = [];

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

  async startCamera(deviceId) {
    try {
      // Stop existing stream
      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
      }

      const constraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: deviceId ? undefined : "environment",
        },
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;
      this.currentDeviceId = deviceId;

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

  switchCamera(deviceId) {
    if (deviceId && deviceId !== this.currentDeviceId) {
      this.startCamera(deviceId);
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
    const maxHeight = window.innerHeight * 0.7; // 70vh max

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

    console.log(
      `Camera layout updated: ${targetWidth}x${targetHeight} (aspect: ${videoAspect.toFixed(2)})`,
    );

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
