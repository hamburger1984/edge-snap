class MoviePlayer {
    constructor() {
        this.modal = document.getElementById('movieModal');
        this.canvas = document.getElementById('movieCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.speedSlider = document.getElementById('speedSlider');
        this.speedValue = document.getElementById('speedValue');
        this.closeMovieBtn = document.getElementById('closeMovieBtn');

        this.photos = [];
        this.currentFrame = 0;
        this.isPlaying = false;
        this.playInterval = null;
        this.fps = 5;

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.playPauseBtn.addEventListener('click', () => {
            this.togglePlayback();
        });

        this.speedSlider.addEventListener('input', (e) => {
            this.fps = parseInt(e.target.value);
            this.speedValue.textContent = this.fps;

            // Restart playback with new speed if currently playing
            if (this.isPlaying) {
                this.stopPlayback();
                this.startPlayback();
            }
        });

        this.closeMovieBtn.addEventListener('click', () => {
            this.hide();
        });

        // Close modal when clicking outside
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });

        // Listen for play movie events
        document.addEventListener('playMovie', (e) => {
            this.show(e.detail.photos, e.detail.projectName);
        });

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (!this.modal.classList.contains('show')) return;

            switch(e.key) {
                case ' ':
                case 'Enter':
                    e.preventDefault();
                    this.togglePlayback();
                    break;
                case 'Escape':
                    this.hide();
                    break;
                case 'ArrowLeft':
                    this.previousFrame();
                    break;
                case 'ArrowRight':
                    this.nextFrame();
                    break;
            }
        });

        // Canvas click to toggle playback
        this.canvas.addEventListener('click', () => {
            this.togglePlayback();
        });
    }

    show(photos, projectName = 'Movie') {
        if (!photos || photos.length === 0) {
            alert('No photos to play');
            return;
        }

        this.photos = photos;
        this.currentFrame = 0;
        this.modal.classList.add('show');

        // Update modal title
        const title = this.modal.querySelector('h3');
        title.textContent = `${projectName} - Movie (${photos.length} frames)`;

        this.setupCanvas();
        this.loadAndDisplayFrame(0);
    }

    hide() {
        this.stopPlayback();
        this.modal.classList.remove('show');
        this.photos = [];
    }

    setupCanvas() {
        if (this.photos.length === 0) return;

        // Load first image to get dimensions
        const img = new Image();
        img.onload = () => {
            // Set canvas size based on first image and modal constraints
            const maxWidth = Math.min(window.innerWidth * 0.8, 800);
            const maxHeight = Math.min(window.innerHeight * 0.6, 600);

            const aspectRatio = img.width / img.height;

            if (aspectRatio > maxWidth / maxHeight) {
                this.canvas.width = maxWidth;
                this.canvas.height = maxWidth / aspectRatio;
            } else {
                this.canvas.height = maxHeight;
                this.canvas.width = maxHeight * aspectRatio;
            }

            // Set display size
            this.canvas.style.width = this.canvas.width + 'px';
            this.canvas.style.height = this.canvas.height + 'px';
        };

        img.src = this.photos[0].imageData;
    }

    loadAndDisplayFrame(frameIndex) {
        if (frameIndex < 0 || frameIndex >= this.photos.length) {
            return;
        }

        const img = new Image();
        img.onload = () => {
            // Clear canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // Draw image scaled to canvas
            this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);

            // Draw frame counter
            this.drawFrameInfo(frameIndex);
        };

        img.src = this.photos[frameIndex].imageData;
    }

    drawFrameInfo(frameIndex) {
        const ctx = this.ctx;
        const text = `${frameIndex + 1} / ${this.photos.length}`;

        // Style the text
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 100, 30);

        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.fillText(text, 15, 30);
        ctx.restore();
    }

    togglePlayback() {
        if (this.isPlaying) {
            this.stopPlayback();
        } else {
            this.startPlayback();
        }
    }

    startPlayback() {
        if (this.photos.length === 0) return;

        this.isPlaying = true;
        this.playPauseBtn.textContent = '⏸️ Pause';

        const interval = 1000 / this.fps;
        this.playInterval = setInterval(() => {
            this.nextFrame();
        }, interval);
    }

    stopPlayback() {
        this.isPlaying = false;
        this.playPauseBtn.textContent = '▶️ Play';

        if (this.playInterval) {
            clearInterval(this.playInterval);
            this.playInterval = null;
        }
    }

    nextFrame() {
        this.currentFrame = (this.currentFrame + 1) % this.photos.length;
        this.loadAndDisplayFrame(this.currentFrame);

        // Stop at the end if not looping
        if (this.currentFrame === 0 && this.isPlaying) {
            // For now, let it loop. Could add option for single playthrough
        }
    }

    previousFrame() {
        this.currentFrame = (this.currentFrame - 1 + this.photos.length) % this.photos.length;
        this.loadAndDisplayFrame(this.currentFrame);
    }

    goToFrame(frameIndex) {
        if (frameIndex >= 0 && frameIndex < this.photos.length) {
            this.currentFrame = frameIndex;
            this.loadAndDisplayFrame(this.currentFrame);
        }
    }

    exportAsVideo() {
        // This would require additional libraries like MediaRecorder or ffmpeg.wasm
        // For now, show a placeholder
        alert('Video export feature coming soon! Currently you can play the image sequence.');
    }
}
