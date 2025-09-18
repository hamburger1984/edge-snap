class CameraManager {
    constructor() {
        this.stream = null;
        this.currentDeviceId = null;
        this.video = document.getElementById('cameraPreview');
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
            console.error('Error initializing camera:', error);
            this.showError('Camera access denied or not available');
        }
    }

    async updateDeviceList() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.devices = devices.filter(device => device.kind === 'videoinput');

            const select = document.getElementById('cameraSelect');
            select.innerHTML = '<option value="">Select Camera</option>';

            this.devices.forEach((device, index) => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || `Camera ${index + 1}`;
                select.appendChild(option);
            });

            // Set the current device as selected
            if (this.currentDeviceId) {
                select.value = this.currentDeviceId;
            }
        } catch (error) {
            console.error('Error getting camera devices:', error);
        }
    }

    async startCamera(deviceId) {
        try {
            // Stop existing stream
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
            }

            const constraints = {
                video: {
                    deviceId: deviceId ? { exact: deviceId } : undefined,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    facingMode: deviceId ? undefined : 'environment'
                }
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            this.currentDeviceId = deviceId;

            // Update device list with labels now that we have permission
            await this.updateDeviceList();

            return true;
        } catch (error) {
            console.error('Error starting camera:', error);
            this.showError('Failed to start camera');
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
            this.showError('No camera stream available');
            return null;
        }

        const canvas = document.getElementById('captureCanvas');
        const context = canvas.getContext('2d');

        // Set canvas size to video dimensions
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;

        // Draw current frame
        context.drawImage(this.video, 0, 0, canvas.width, canvas.height);

        // Convert to data URL
        const imageData = canvas.toDataURL('image/jpeg', 0.9);

        return {
            imageData,
            width: canvas.width,
            height: canvas.height,
            timestamp: new Date()
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
        const errorDiv = document.createElement('div');
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

    destroy() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }
}
