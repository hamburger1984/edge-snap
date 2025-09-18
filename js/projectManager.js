class ProjectManager {
  constructor(database) {
    this.db = database;
    this.currentProject = null;
    this.projects = [];
    this.projectSelect = document.getElementById("projectSelect");
    this.newProjectBtn = document.getElementById("newProjectBtn");
    this.deleteProjectBtn = document.getElementById("deleteProjectBtn");
    this.newProjectModal = document.getElementById("newProjectModal");
    this.projectNameInput = document.getElementById("projectNameInput");
    this.createProjectBtn = document.getElementById("createProjectBtn");
    this.closeNewProjectBtn = document.getElementById("closeNewProjectBtn");

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.projectSelect.addEventListener("change", (e) => {
      this.selectProject(parseInt(e.target.value));
    });

    this.newProjectBtn.addEventListener("click", () => {
      this.showNewProjectModal();
    });

    this.deleteProjectBtn.addEventListener("click", () => {
      this.deleteCurrentProject();
    });

    this.createProjectBtn.addEventListener("click", () => {
      this.createProject();
    });

    this.closeNewProjectBtn.addEventListener("click", () => {
      this.hideNewProjectModal();
    });

    this.projectNameInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.createProject();
      }
    });

    // Close modal when clicking outside
    this.newProjectModal.addEventListener("click", (e) => {
      if (e.target === this.newProjectModal) {
        this.hideNewProjectModal();
      }
    });
  }

  async init() {
    await this.loadProjects();

    // Create default project if none exist
    if (this.projects.length === 0) {
      try {
        const projectId = await this.createProject("Default Project");
        // Reload projects to get the new one
        await this.loadProjects();
      } catch (error) {
        console.error("Failed to create default project:", error);
      }
    } else {
      // Select the most recent project
      this.selectProject(this.projects[0].id);
    }
  }

  async loadProjects() {
    try {
      this.projects = await this.db.getAllProjects();
      this.projects.sort(
        (a, b) =>
          new Date(b.lastModified || b.created) -
          new Date(a.lastModified || a.created),
      );
      this.updateProjectSelect();
    } catch (error) {
      console.error("Error loading projects:", error);
    }
  }

  updateProjectSelect() {
    this.projectSelect.innerHTML = '<option value="">Select Project</option>';

    this.projects.forEach((project) => {
      const option = document.createElement("option");
      option.value = project.id;
      option.textContent = project.name;
      this.projectSelect.appendChild(option);
    });

    if (this.currentProject) {
      this.projectSelect.value = this.currentProject.id;
    }

    // Enable/disable delete button
    this.deleteProjectBtn.disabled = !this.currentProject;
  }

  async selectProject(projectId) {
    if (!projectId) {
      this.currentProject = null;
      this.updateProjectSelect();
      this.notifyProjectChange(null);
      return;
    }

    const project = this.projects.find((p) => p.id === projectId);

    if (project) {
      this.currentProject = project;
      this.projectSelect.value = projectId;
      this.deleteProjectBtn.disabled = false;
      this.notifyProjectChange(project);
    } else {
      console.error("ProjectManager: Project not found with ID:", projectId);
    }
  }

  showNewProjectModal() {
    this.newProjectModal.classList.add("show");
    this.projectNameInput.value = "";
    this.projectNameInput.focus();
  }

  hideNewProjectModal() {
    this.newProjectModal.classList.remove("show");
  }

  async createProject(name = null) {
    const projectName = name || this.projectNameInput.value.trim();

    if (!projectName) {
      alert("Please enter a project name");
      return;
    }

    // Check if project name already exists
    const existingProject = this.projects.find((p) => p.name === projectName);
    if (existingProject) {
      alert("A project with this name already exists");
      return;
    }

    try {
      const projectId = await this.db.saveProject({ name: projectName });
      await this.loadProjects();

      // Select the newly created project
      this.selectProject(projectId);

      if (!name) {
        // Only hide modal if created from UI
        this.hideNewProjectModal();
      }

      // Clear edge overlay for new project (it has no photos)
      this.clearEdgeOverlay();

      this.showSuccess(`Project "${projectName}" created successfully`);
      return projectId;
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project");
      throw error;
    }
  }

  clearEdgeOverlay() {
    // Dispatch event to clear edge overlay
    const event = new CustomEvent("clearEdgeOverlay");
    document.dispatchEvent(event);
  }

  async deleteCurrentProject() {
    if (!this.currentProject) {
      return;
    }

    const confirmDelete = confirm(
      `Are you sure you want to delete "${this.currentProject.name}" and all its photos?`,
    );
    if (!confirmDelete) {
      return;
    }

    try {
      await this.db.deleteProject(this.currentProject.id);
      await this.loadProjects();

      // Select another project or create default
      if (this.projects.length > 0) {
        this.selectProject(this.projects[0].id);
      } else {
        await this.createProject("Default Project");
      }

      this.showSuccess("Project deleted successfully");
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Failed to delete project");
    }
  }

  getCurrentProject() {
    return this.currentProject;
  }

  notifyProjectChange(project) {
    // Dispatch custom event for other components to listen to
    const event = new CustomEvent("projectChanged", { detail: project });
    document.dispatchEvent(event);
  }

  showSuccess(message) {
    const successDiv = document.createElement("div");
    successDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #4CAF50;
            color: white;
            padding: 1rem 2rem;
            border-radius: 8px;
            z-index: 10000;
            font-size: 1rem;
        `;
    successDiv.textContent = message;
    document.body.appendChild(successDiv);

    setTimeout(() => {
      document.body.removeChild(successDiv);
    }, 2000);
  }
}
