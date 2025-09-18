class EdgeDetection {
  constructor() {
    this.isOpenCVReady = false;
    this.edgesEnabled = true;
    this.canvas = document.getElementById("edgeOverlay");
    this.ctx = this.canvas.getContext("2d");
    this.lastProcessedImage = null;
    this.edgeImageData = null;
    this.isFrontCamera = false;
  }

  async init() {
    return new Promise((resolve) => {
      if (typeof cv !== "undefined" && cv.Mat) {
        this.isOpenCVReady = true;
        resolve();
        return;
      }

      // Wait for OpenCV to load
      const checkOpenCV = setInterval(() => {
        if (typeof cv !== "undefined" && cv.Mat) {
          this.isOpenCVReady = true;
          clearInterval(checkOpenCV);
          resolve();
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!this.isOpenCVReady) {
          clearInterval(checkOpenCV);
          console.error("OpenCV failed to load");
          resolve(); // Resolve anyway to continue without edge detection
        }
      }, 10000);
    });
  }

  processImageForEdges(imageData, width, height) {
    console.log("EdgeDetection: processImageForEdges called", {
      isOpenCVReady: this.isOpenCVReady,
      imageSize: `${width}x${height}`,
      hasImageData: !!imageData,
    });

    if (!this.isOpenCVReady) {
      console.warn("EdgeDetection: OpenCV not ready");
      return null;
    }

    try {
      // Create OpenCV mat from image data
      const src = cv.matFromImageData({
        data: new Uint8ClampedArray(imageData),
        width: width,
        height: height,
      });

      // Convert to grayscale
      const gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

      // Apply Gaussian blur to reduce noise
      const blurred = new cv.Mat();
      cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

      // Apply Canny edge detection
      const edges = new cv.Mat();
      cv.Canny(blurred, edges, 50, 150);

      // Convert back to RGBA for display
      const edgesRGBA = new cv.Mat();
      cv.cvtColor(edges, edgesRGBA, cv.COLOR_GRAY2RGBA);

      // Get image data
      const edgeImageData = new ImageData(
        new Uint8ClampedArray(edgesRGBA.data),
        edgesRGBA.cols,
        edgesRGBA.rows,
      );

      // Cleanup
      src.delete();
      gray.delete();
      blurred.delete();
      edges.delete();
      edgesRGBA.delete();

      return edgeImageData;
    } catch (error) {
      console.error("Error processing edges:", error);
      return null;
    }
  }

  async processImageFromDataURL(dataURL) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const tempCanvas = document.createElement("canvas");
        const tempCtx = tempCanvas.getContext("2d");

        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        tempCtx.drawImage(img, 0, 0);

        const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
        const edges = this.processImageForEdges(
          imageData.data,
          img.width,
          img.height,
        );

        resolve(edges);
      };
      img.src = dataURL;
    });
  }

  updateOverlay(referenceImageData = null, isFrontCamera = false) {
    console.log("EdgeDetection: updateOverlay called", {
      hasReferenceData: !!referenceImageData,
      isFrontCamera,
      edgesEnabled: this.edgesEnabled,
      hasCanvas: !!this.canvas,
    });

    if (!this.edgesEnabled || !this.canvas) {
      console.log(
        "EdgeDetection: Clearing overlay - edges disabled or no canvas",
      );
      this.clearOverlay();
      return;
    }

    // Store camera state for use in drawEdges
    this.isFrontCamera = isFrontCamera;

    const video = document.getElementById("cameraPreview");
    console.log("EdgeDetection: Video dimensions check", {
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      hasVideo: !!video,
    });

    if (!video.videoWidth || !video.videoHeight) {
      console.log("EdgeDetection: Video not ready, waiting for video metadata");

      // Wait for video to be ready, then retry
      const waitForVideo = () => {
        if (video.videoWidth && video.videoHeight) {
          console.log("EdgeDetection: Video now ready, retrying updateOverlay");
          this.updateOverlay(referenceImageData, isFrontCamera);
        } else {
          setTimeout(waitForVideo, 100);
        }
      };

      setTimeout(waitForVideo, 100);
      return;
    }

    // Set canvas size to match the camera container size
    const container = video.parentElement;
    const containerRect = container.getBoundingClientRect();
    this.canvas.width = containerRect.width;
    this.canvas.height = containerRect.height;
    this.canvas.style.width = containerRect.width + "px";
    this.canvas.style.height = containerRect.height + "px";

    if (referenceImageData) {
      console.log("EdgeDetection: Processing reference image for edges");
      // Process the reference image for edges
      this.processImageFromDataURL(referenceImageData).then((edges) => {
        console.log("EdgeDetection: Edge processing result:", !!edges);
        if (edges) {
          this.edgeImageData = edges;
          console.log("EdgeDetection: Calling drawEdges()");
          this.drawEdges();
        } else {
          console.log("EdgeDetection: No edges detected, clearing overlay");
          this.clearOverlay();
        }
      });
    } else {
      console.log("EdgeDetection: No reference image, clearing overlay");
      // Clear edges if no reference image
      this.edgeImageData = null;
      this.clearOverlay();
    }
  }

  drawEdges() {
    console.log("EdgeDetection: drawEdges called", {
      hasEdgeImageData: !!this.edgeImageData,
      hasCanvas: !!this.canvas,
      canvasSize: this.canvas
        ? `${this.canvas.width}x${this.canvas.height}`
        : "none",
    });

    if (!this.edgeImageData || !this.canvas) {
      console.log("EdgeDetection: Cannot draw edges - missing data or canvas");
      return;
    }

    const video = document.getElementById("cameraPreview");

    // Clear the overlay
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    console.log("EdgeDetection: Canvas cleared, starting edge drawing");

    // Calculate the actual video display area within the video element
    const videoAspect = video.videoWidth / video.videoHeight;
    const displayAspect = this.canvas.width / this.canvas.height;

    let drawWidth, drawHeight, drawX, drawY;

    if (videoAspect > displayAspect) {
      // Video is wider - fit to width, letterbox top/bottom
      drawWidth = this.canvas.width;
      drawHeight = this.canvas.width / videoAspect;
      drawX = 0;
      drawY = (this.canvas.height - drawHeight) / 2;
    } else {
      // Video is taller - fit to height, pillarbox left/right
      drawHeight = this.canvas.height;
      drawWidth = this.canvas.height * videoAspect;
      drawX = (this.canvas.width - drawWidth) / 2;
      drawY = 0;
    }

    // Draw capture area indicator (semi-transparent rectangle)
    this.ctx.strokeStyle = "#2196F3";
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.strokeRect(drawX, drawY, drawWidth, drawHeight);
    this.ctx.setLineDash([]);

    // Create a temporary canvas to draw the edges
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");
    tempCanvas.width = this.edgeImageData.width;
    tempCanvas.height = this.edgeImageData.height;

    tempCtx.putImageData(this.edgeImageData, 0, 0);

    // Draw edges within the capture area, maintaining aspect ratio
    this.ctx.save();
    this.ctx.globalAlpha = 0.7;
    this.ctx.globalCompositeOperation = "screen"; // Better blending for edges

    // Handle mirroring for front cameras
    if (this.isFrontCamera) {
      // Preview is mirrored but captured images are not mirrored
      // So we need to mirror the edge overlay to align with the mirrored preview
      this.ctx.translate(drawX + drawWidth, drawY);
      this.ctx.scale(-1, 1);
      this.ctx.drawImage(
        tempCanvas,
        0,
        0,
        tempCanvas.width,
        tempCanvas.height,
        0,
        0,
        drawWidth,
        drawHeight,
      );
    } else {
      // Normal drawing for rear cameras
      this.ctx.drawImage(
        tempCanvas,
        0,
        0,
        tempCanvas.width,
        tempCanvas.height,
        drawX,
        drawY,
        drawWidth,
        drawHeight,
      );
    }

    this.ctx.restore();
  }

  clearOverlay() {
    if (this.canvas && this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  toggleEdges() {
    this.edgesEnabled = !this.edgesEnabled;
    if (!this.edgesEnabled) {
      this.clearOverlay();
    } else if (this.edgeImageData) {
      this.drawEdges();
    }
    return this.edgesEnabled;
  }

  isEnabled() {
    return this.edgesEnabled;
  }

  isReady() {
    return this.isOpenCVReady;
  }
}
