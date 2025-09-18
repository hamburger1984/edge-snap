class SeriesManager {
  constructor(database) {
    this.db = database;
    this.currentProject = null;
    this.photos = [];
    this.currentIndex = 0;

    // UI elements
    this.filmStrip = document.getElementById("filmStrip");
    this.seriesCounter = document.getElementById("seriesCounter");
    this.playMovieBtn = document.getElementById("playMovieBtn");

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.playMovieBtn.addEventListener("click", () => {
      this.playMovie();
    });

    // Listen for project changes
    document.addEventListener("projectChanged", (e) => {
      console.log("SeriesManager: Project changed event received:", e.detail);
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
    console.log("SeriesManager: Setting current project:", project);
    this.currentProject = project;
    if (project) {
      await this.loadPhotos();
    } else {
      this.photos = [];
      this.updateUI();
    }
    console.log("SeriesManager: Current project is now:", this.currentProject);
  }

  async loadPhotos() {
    if (!this.currentProject) {
      this.photos = [];
      this.currentIndex = 0;
      this.updateUI();
      this.notifyPhotosLoaded();
      return;
    }

    try {
      this.photos = await this.db.getPhotosForProject(this.currentProject.id);
      this.currentIndex = Math.max(0, this.photos.length - 1); // Start with latest photo
      this.updateUI();

      // Notify that photos have been loaded
      this.notifyPhotosLoaded();

      console.log(
        `SeriesManager: Loaded ${this.photos.length} photos for project ${this.currentProject.name}`,
      );
    } catch (error) {
      console.error("Error loading photos:", error);
      this.photos = [];
      this.currentIndex = 0;
      this.updateUI();

      // Still notify even if no photos
      this.notifyPhotosLoaded();
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

      // Ensure we're viewing the newest photo
      this.currentIndex = Math.max(0, this.photos.length - 1);
      this.updateUI();

      // Notify that a new photo was added
      this.notifyPhotoAdded();

      // Also notify navigation change to update edge overlay
      this.notifyNavigationChange();
    } catch (error) {
      console.error("Error saving photo:", error);
      throw error;
    }
  }

  navigateToPrevious() {
    if (this.photos.length === 0) return;

    const newIndex =
      (this.currentIndex - 1 + this.photos.length) % this.photos.length;
    this.selectPhoto(newIndex);
  }

  navigateToNext() {
    if (this.photos.length === 0) return;

    const newIndex = (this.currentIndex + 1) % this.photos.length;
    this.selectPhoto(newIndex);
  }

  notifyNavigationChange() {
    // Dispatch event when navigation changes to update edge overlay
    const event = new CustomEvent("seriesNavigationChanged", {
      detail: {
        currentPhoto: this.getCurrentPhoto(),
        project: this.currentProject,
      },
    });
    document.dispatchEvent(event);
  }

  updateUI() {
    const hasPhotos = this.photos.length > 0;

    // Update counter
    if (hasPhotos) {
      this.seriesCounter.textContent = `${this.currentIndex + 1} / ${this.photos.length}`;
    } else {
      this.seriesCounter.textContent = "0 / 0";
    }

    // Update play movie button
    this.playMovieBtn.disabled = this.photos.length < 2;

    // Update film strip
    this.updateFilmStrip();
  }

  updateFilmStrip() {
    if (!this.filmStrip) return;

    // Clear existing content
    this.filmStrip.innerHTML = "";

    if (this.photos.length === 0) {
      // Show placeholder
      const placeholder = document.createElement("div");
      placeholder.className = "film-strip-placeholder";
      placeholder.innerHTML = "<span>No photos in series</span>";
      this.filmStrip.appendChild(placeholder);
      return;
    }

    // Create film strip items
    this.photos.forEach((photo, index) => {
      const item = document.createElement("div");
      item.className = "film-strip-item";
      if (index === this.currentIndex) {
        item.classList.add("selected");
      }

      const img = document.createElement("img");
      img.src = photo.imageData;
      img.alt = `Photo ${index + 1}`;

      const number = document.createElement("div");
      number.className = "item-number";
      number.textContent = index + 1;

      item.appendChild(img);
      item.appendChild(number);

      // Add click handler
      item.addEventListener("click", () => {
        this.selectPhoto(index);
      });

      this.filmStrip.appendChild(item);
    });

    // Scroll to selected item
    this.scrollToSelectedItem();
  }

  selectPhoto(index) {
    if (index >= 0 && index < this.photos.length) {
      this.currentIndex = index;
      this.updateUI();
      this.notifyNavigationChange();
    }
  }

  scrollToSelectedItem() {
    const selectedItem = this.filmStrip.querySelector(
      ".film-strip-item.selected",
    );
    if (selectedItem) {
      selectedItem.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
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

  notifyPhotosLoaded() {
    console.log(
      "SeriesManager: notifyPhotosLoaded called with",
      this.photos.length,
      "photos",
    );
    // Dispatch custom event when photos are loaded
    const event = new CustomEvent("photosLoaded", {
      detail: {
        photos: this.photos,
        project: this.currentProject,
        currentPhoto: this.getCurrentPhoto(),
        previousPhoto: this.getPreviousPhoto(),
      },
    });
    document.dispatchEvent(event);
  }
}
