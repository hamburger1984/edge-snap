class CameraManager {
  constructor() {
    this.stream = null;
    this.currentDeviceId = null;
    this.video = document.getElementById("cameraPreview");
    this.devices = [];
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

    // Check if we need to mirror the image (for front-facing cameras)
    const isFrontCamera = this.isFrontFacingCamera();

    if (isFrontCamera) {
      // Mirror horizontally for front camera
      context.save();
      context.scale(-1, 1);
      context.drawImage(
        this.video,
        -canvas.width,
        0,
        canvas.width,
        canvas.height,
      );
      context.restore();
    } else {
      // Draw normally for rear camera
      context.drawImage(this.video, 0, 0, canvas.width, canvas.height);
    }

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

  destroy() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }
}
