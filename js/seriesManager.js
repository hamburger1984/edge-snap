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

  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    // If taken today, show time
    if (diffInDays === 0) {
      if (diffInMinutes < 1) {
        return "Just now";
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`;
      } else {
        return date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    }
    // If taken this week, show day and time
    else if (diffInDays < 7) {
      if (diffInDays === 1) {
        return `Yesterday ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      } else {
        return date.toLocaleDateString([], {
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    }
    // Otherwise show date
    else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  }

  setupEventListeners() {
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
        timestamp: photo.timestamp,
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

      // Create timestamp display
      const timestamp = document.createElement("div");
      timestamp.className = "item-timestamp";
      timestamp.textContent = this.formatTimestamp(photo.timestamp);
      timestamp.title = new Date(photo.timestamp).toLocaleString();

      // Create delete button
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "item-delete-btn";
      deleteBtn.innerHTML = "✕";
      deleteBtn.title = "Delete this photo";

      item.appendChild(img);
      item.appendChild(number);
      item.appendChild(timestamp);
      item.appendChild(deleteBtn);

      // Add click handler for selecting photo
      item.addEventListener("click", (e) => {
        // Don't select if delete button was clicked
        if (e.target !== deleteBtn) {
          this.selectPhoto(index);
        }
      });

      // Add click handler for delete button
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent selecting the photo
        this.deletePhoto(index);
      });

      this.filmStrip.appendChild(item);
    });

    // Scroll to selected item with slight delay to ensure DOM update
    setTimeout(() => this.scrollToSelectedItem(), 10);
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
    if (selectedItem && this.filmStrip.parentElement) {
      // Scroll within the film strip container only, not the entire page
      const container = this.filmStrip.parentElement;
      const containerRect = container.getBoundingClientRect();
      const itemRect = selectedItem.getBoundingClientRect();

      // Calculate the item's position relative to the film strip
      const itemOffsetLeft = selectedItem.offsetLeft;
      const itemWidth = selectedItem.offsetWidth;
      const containerWidth = container.clientWidth;

      // Calculate scroll position to center the item in the container
      const targetScrollLeft =
        itemOffsetLeft - containerWidth / 2 + itemWidth / 2;

      // Ensure we don't scroll past the boundaries
      const maxScrollLeft = this.filmStrip.scrollWidth - containerWidth;
      const finalScrollLeft = Math.max(
        0,
        Math.min(targetScrollLeft, maxScrollLeft),
      );

      // Smooth scroll the container horizontally
      container.scrollTo({
        left: finalScrollLeft,
        behavior: "smooth",
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

  async deletePhoto(index) {
    if (index < 0 || index >= this.photos.length) {
      return;
    }

    const confirmDelete = confirm(
      `Are you sure you want to delete photo ${index + 1}?`,
    );
    if (!confirmDelete) {
      return;
    }

    try {
      const photoToDelete = this.photos[index];
      await this.db.deletePhoto(photoToDelete.id);

      // Reload photos
      await this.loadPhotos();

      // Adjust current index if needed
      if (this.currentIndex >= this.photos.length) {
        this.currentIndex = Math.max(0, this.photos.length - 1);
      } else if (index <= this.currentIndex && this.currentIndex > 0) {
        // If we deleted a photo before or at the current index, adjust the current index
        this.currentIndex = Math.max(0, this.currentIndex - 1);
      }

      this.updateUI();
      this.notifyNavigationChange();
    } catch (error) {
      console.error("Error deleting photo:", error);
      alert("Failed to delete photo");
    }
  }

  async deleteCurrentPhoto() {
    if (!this.getCurrentPhoto()) {
      return;
    }

    await this.deletePhoto(this.currentIndex);
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
