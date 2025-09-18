class SeriesManager {
  constructor(database) {
    this.db = database;
    this.currentProject = null;
    this.photos = [];
    this.currentIndex = 0;

    // UI elements
    this.seriesImage = document.getElementById("seriesImage");
    this.seriesCounter = document.getElementById("seriesCounter");
    this.prevBtn = document.getElementById("prevBtn");
    this.nextBtn = document.getElementById("nextBtn");
    this.playMovieBtn = document.getElementById("playMovieBtn");

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.prevBtn.addEventListener("click", () => {
      this.navigateToPrevious();
    });

    this.nextBtn.addEventListener("click", () => {
      this.navigateToNext();
    });

    this.playMovieBtn.addEventListener("click", () => {
      this.playMovie();
    });

    // Listen for project changes
    document.addEventListener("projectChanged", (e) => {
      this.setCurrentProject(e.detail);
    });

    // Keyboard navigation
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        this.navigateToPrevious();
      } else if (e.key === "ArrowRight") {
        this.navigateToNext();
      }
    });
  }

  async setCurrentProject(project) {
    this.currentProject = project;
    if (project) {
      await this.loadPhotos();
    } else {
      this.photos = [];
      this.updateUI();
    }
  }

  async loadPhotos() {
    if (!this.currentProject) {
      return;
    }

    try {
      this.photos = await this.db.getPhotosForProject(this.currentProject.id);
      this.currentIndex = Math.max(0, this.photos.length - 1); // Start with latest photo
      this.updateUI();
    } catch (error) {
      console.error("Error loading photos:", error);
      this.photos = [];
      this.updateUI();
    }
  }

  async addPhoto(photo) {
    if (!this.currentProject) {
      return;
    }

    try {
      const photoId = await this.db.savePhoto({
        projectId: this.currentProject.id,
        imageData: photo.imageData,
        width: photo.width,
        height: photo.height,
      });

      // Reload photos and go to the newest one
      await this.loadPhotos();

      // Notify that a new photo was added
      this.notifyPhotoAdded();
    } catch (error) {
      console.error("Error saving photo:", error);
      throw error;
    }
  }

  navigateToPrevious() {
    if (this.photos.length === 0) return;

    this.currentIndex =
      (this.currentIndex - 1 + this.photos.length) % this.photos.length;
    this.updateUI();
  }

  navigateToNext() {
    if (this.photos.length === 0) return;

    this.currentIndex = (this.currentIndex + 1) % this.photos.length;
    this.updateUI();
  }

  updateUI() {
    const hasPhotos = this.photos.length > 0;

    // Update counter
    if (hasPhotos) {
      this.seriesCounter.textContent = `${this.currentIndex + 1} / ${this.photos.length}`;
    } else {
      this.seriesCounter.textContent = "0 / 0";
    }

    // Update navigation buttons
    this.prevBtn.disabled = !hasPhotos;
    this.nextBtn.disabled = !hasPhotos;
    this.playMovieBtn.disabled = this.photos.length < 2;

    // Update image preview
    if (hasPhotos && this.photos[this.currentIndex]) {
      this.seriesImage.src = this.photos[this.currentIndex].imageData;
      this.seriesImage.style.display = "block";
    } else {
      this.seriesImage.src = "";
      this.seriesImage.style.display = "none";
    }

    // Update series preview container
    const previewContainer = this.seriesImage.parentElement;
    if (previewContainer) {
      if (!hasPhotos) {
        previewContainer.style.background = "#333";
        previewContainer.innerHTML =
          '<div style="color: #999; font-size: 0.9rem;">No photos in series</div>';
      } else {
        previewContainer.style.background = "";
        previewContainer.innerHTML = "";
        previewContainer.appendChild(this.seriesImage);
      }
    }
  }

  getCurrentPhoto() {
    if (this.photos.length === 0 || this.currentIndex < 0) {
      return null;
    }
    return this.photos[this.currentIndex];
  }

  getPreviousPhoto() {
    if (this.photos.length < 2) {
      return null;
    }

    // Get the second-to-last photo (most recent before current)
    const prevIndex = this.photos.length - 2;
    return prevIndex >= 0 ? this.photos[prevIndex] : null;
  }

  getAllPhotos() {
    return [...this.photos];
  }

  playMovie() {
    if (this.photos.length < 2) {
      alert("Need at least 2 photos to play a movie");
      return;
    }

    // Dispatch event to movie player
    const event = new CustomEvent("playMovie", {
      detail: {
        photos: this.photos,
        projectName: this.currentProject?.name || "Unknown Project",
      },
    });
    document.dispatchEvent(event);
  }

  async deleteCurrentPhoto() {
    if (!this.getCurrentPhoto()) {
      return;
    }

    const confirmDelete = confirm(
      "Are you sure you want to delete this photo?",
    );
    if (!confirmDelete) {
      return;
    }

    try {
      const photoToDelete = this.getCurrentPhoto();
      await this.db.deletePhoto(photoToDelete.id);

      // Reload photos
      await this.loadPhotos();

      // Adjust current index if needed
      if (this.currentIndex >= this.photos.length) {
        this.currentIndex = Math.max(0, this.photos.length - 1);
      }

      this.updateUI();
    } catch (error) {
      console.error("Error deleting photo:", error);
      alert("Failed to delete photo");
    }
  }

  notifyPhotoAdded() {
    // Dispatch custom event
    const event = new CustomEvent("photoAdded", {
      detail: {
        photo: this.getCurrentPhoto(),
        project: this.currentProject,
      },
    });
    document.dispatchEvent(event);
  }

  getPhotoCount() {
    return this.photos.length;
  }

  hasPhotos() {
    return this.photos.length > 0;
  }
}
