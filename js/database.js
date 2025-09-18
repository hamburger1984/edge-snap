class Database {
  constructor() {
    this.db = null;
    this.dbName = "EdgySnapperDB";
    this.version = 1;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Projects store
        if (!db.objectStoreNames.contains("projects")) {
          const projectStore = db.createObjectStore("projects", {
            keyPath: "id",
            autoIncrement: true,
          });
          projectStore.createIndex("name", "name", { unique: true });
          projectStore.createIndex("created", "created", { unique: false });
        }

        // Photos store
        if (!db.objectStoreNames.contains("photos")) {
          const photoStore = db.createObjectStore("photos", {
            keyPath: "id",
            autoIncrement: true,
          });
          photoStore.createIndex("projectId", "projectId", { unique: false });
          photoStore.createIndex("timestamp", "timestamp", { unique: false });
          photoStore.createIndex("order", "order", { unique: false });
        }
      };
    });
  }

  async saveProject(project) {
    const transaction = this.db.transaction(["projects"], "readwrite");
    const store = transaction.objectStore("projects");

    return new Promise((resolve, reject) => {
      const request = store.add({
        name: project.name,
        created: new Date(),
        lastModified: new Date(),
      });

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllProjects() {
    const transaction = this.db.transaction(["projects"], "readonly");
    const store = transaction.objectStore("projects");
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteProject(projectId) {
    const transaction = this.db.transaction(
      ["projects", "photos"],
      "readwrite",
    );

    // Delete all photos in the project
    const photoStore = transaction.objectStore("photos");
    const photoIndex = photoStore.index("projectId");
    const photosRequest = photoIndex.getAll(projectId);

    photosRequest.onsuccess = () => {
      const photos = photosRequest.result;
      photos.forEach((photo) => photoStore.delete(photo.id));
    };

    // Delete the project
    const projectStore = transaction.objectStore("projects");
    return projectStore.delete(projectId);
  }

  async savePhoto(photo) {
    const transaction = this.db.transaction(["photos"], "readwrite");
    const store = transaction.objectStore("photos");

    // Get the next order number for this project
    const index = store.index("projectId");
    const request = index.getAll(photo.projectId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const existingPhotos = request.result;
        const maxOrder = existingPhotos.reduce(
          (max, p) => Math.max(max, p.order || 0),
          0,
        );

        const photoData = {
          projectId: photo.projectId,
          imageData: photo.imageData,
          timestamp: new Date(),
          order: maxOrder + 1,
          width: photo.width,
          height: photo.height,
        };

        const addRequest = store.add(photoData);
        addRequest.onsuccess = () => resolve(addRequest.result);
        addRequest.onerror = () => reject(addRequest.error);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getPhotosForProject(projectId) {
    const transaction = this.db.transaction(["photos"], "readonly");
    const store = transaction.objectStore("photos");
    const index = store.index("projectId");

    return new Promise((resolve, reject) => {
      const request = index.getAll(projectId);
      request.onsuccess = () => {
        const photos = request.result;
        // Sort by order
        photos.sort((a, b) => a.order - b.order);
        resolve(photos);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getLatestPhoto(projectId) {
    const photos = await this.getPhotosForProject(projectId);
    return photos.length > 0 ? photos[photos.length - 1] : null;
  }

  async deletePhoto(photoId) {
    const transaction = this.db.transaction(["photos"], "readwrite");
    const store = transaction.objectStore("photos");
    return store.delete(photoId);
  }
}
