// Files Dashboard Component
export function renderDashboard() {
    const user = JSON.parse(localStorage.getItem('user') || '{"name": "User"}');
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    
    return `
        <div class="dashboard-page">
            <div class="dashboard-header">
                <div class="dashboard-title">
                    <h1>Files</h1>
                    <p>${projects.length} ${projects.length === 1 ? 'project' : 'projects'}</p>
                </div>
                <div class="dashboard-actions">
                    <button class="btn-primary" id="new-project-btn">
                        <span>+</span> New Project
                    </button>
                    <button class="btn-icon" id="profile-btn" title="Profile">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M10 10C12.7614 10 15 7.76142 15 5C15 2.23858 12.7614 0 10 0C7.23858 0 5 2.23858 5 5C5 7.76142 7.23858 10 10 10Z" stroke="currentColor" stroke-width="2"/>
                            <path d="M10 12C5.58172 12 2 14.6863 2 18V20H18V18C18 14.6863 14.4183 12 10 12Z" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                    <button class="btn-icon" id="logout-btn" title="Sign out">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M7 17L12 12L7 7M12 12H2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="projects-grid" id="projects-grid">
                ${projects.map(project => `
                    <div class="project-card" data-project-id="${project.id}">
                        <div class="project-card-header">
                            <div class="project-icon">📦</div>
                            <button class="project-delete" data-project-id="${project.id}" title="Delete">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            </button>
                        </div>
                        <div class="project-card-body">
                            <h3 class="project-name">${project.name}</h3>
                            <p class="project-meta">Modified ${formatDate(project.modified)}</p>
                        </div>
                    </div>
                `).join('')}
                ${projects.length === 0 ? `
                    <div class="empty-state">
                        <div class="empty-icon">📁</div>
                        <h3>No projects yet</h3>
                        <p>Create your first 3D playground project</p>
                        <button class="btn-primary" id="empty-state-create-btn">Create Project</button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
}

// Make createProject available globally for debugging
window.createProject = function(name) {
    return createProject(name);
};

export function setupDashboardHandlers() {
    console.log('Setting up dashboard handlers...');
    console.log('DOM ready state:', document.readyState);
    
    // Wait a bit to ensure DOM is fully ready
    setTimeout(() => {
        // New project button
        const newProjectBtn = document.getElementById('new-project-btn');
        console.log('New project button found:', !!newProjectBtn);
        
        if (newProjectBtn) {
            // Remove old listeners by cloning
            const newBtn = newProjectBtn.cloneNode(true);
            newProjectBtn.parentNode.replaceChild(newBtn, newProjectBtn);
            
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('New project button clicked');
                const name = prompt('Enter project name:', 'Untitled Project');
                if (name && name.trim()) {
                    console.log('Creating project:', name.trim());
                    createProject(name.trim());
                } else {
                    console.log('Project creation cancelled or empty name');
                }
            });
            console.log('New project button handler attached');
        } else {
            console.error('New project button not found!');
            console.log('Available elements:', document.querySelectorAll('button'));
        }
        
        // Empty state button
        const emptyStateBtn = document.getElementById('empty-state-create-btn');
        console.log('Empty state button found:', !!emptyStateBtn);
        if (emptyStateBtn) {
            const newEmptyBtn = emptyStateBtn.cloneNode(true);
            emptyStateBtn.parentNode.replaceChild(newEmptyBtn, emptyStateBtn);
            
            newEmptyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Empty state create button clicked');
                const name = prompt('Enter project name:', 'Untitled Project');
                if (name && name.trim()) {
                    console.log('Creating project from empty state:', name.trim());
                    createProject(name.trim());
                }
            });
            console.log('Empty state button handler attached');
        }
        
        // Project card clicks
        const projectCards = document.querySelectorAll('.project-card');
        console.log(`Found ${projectCards.length} project cards`);
        projectCards.forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.project-delete')) {
                    console.log('Delete button clicked, ignoring card click');
                    return;
                }
                const projectId = card.dataset.projectId;
                console.log('Project card clicked, projectId:', projectId);
                if (projectId) {
                    openProject(projectId);
                } else {
                    console.error('No project ID found on card');
                }
            });
        });

        // Delete project
        document.querySelectorAll('.project-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const projectId = btn.dataset.projectId;
                if (projectId && confirm('Are you sure you want to delete this project?')) {
                    deleteProject(projectId);
                }
            });
        });

        // Profile button
        const profileBtn = document.getElementById('profile-btn');
        if (profileBtn) {
            const newProfileBtn = profileBtn.cloneNode(true);
            profileBtn.parentNode.replaceChild(newProfileBtn, profileBtn);
            
            newProfileBtn.addEventListener('click', () => {
                window.router.navigate('/profile');
            });
        }
        
        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            const newLogoutBtn = logoutBtn.cloneNode(true);
            logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
            
            newLogoutBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to sign out?')) {
                    localStorage.removeItem('user');
                    localStorage.removeItem('currentProject');
                    window.router.navigate('/login');
                }
            });
        }
    }, 100);
}

// Export createProject so it can be called from anywhere
export function createProject(name) {
    try {
        const projects = JSON.parse(localStorage.getItem('projects') || '[]');
        const newProject = {
            id: Date.now().toString(),
            name: name,
            created: Date.now(),
            modified: Date.now(),
            data: { objects: [] }
        };
        projects.push(newProject);
        localStorage.setItem('projects', JSON.stringify(projects));
        
        console.log('Project created:', newProject);
        
        // Immediately open the new project
        localStorage.setItem('currentProject', newProject.id);
        
        // Navigate directly to workspace (bypass router for this navigation)
        console.log('Navigating to workspace');
        
        // Try multiple path options for compatibility
        const currentPath = window.location.pathname;
        const basePath = currentPath.includes('index-dashboard.html') 
            ? currentPath.replace('index-dashboard.html', '') 
            : '/';
        
        const workspacePath = basePath + 'workspace.html';
        console.log('Current path:', currentPath);
        console.log('Base path:', basePath);
        console.log('Workspace path:', workspacePath);
        
        // Try navigation
        try {
            window.location.href = workspacePath;
        } catch (error) {
            console.error('Navigation error:', error);
            // Fallback: try absolute path
            window.location.href = '/workspace.html';
        }
    } catch (error) {
        console.error('Error creating project:', error);
        alert('Failed to create project. Please try again.');
    }
}

function deleteProject(projectId) {
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const filtered = projects.filter(p => p.id !== projectId);
    localStorage.setItem('projects', JSON.stringify(filtered));
    
    // Clear current project if it was deleted
    const currentProject = localStorage.getItem('currentProject');
    if (currentProject === projectId) {
        localStorage.removeItem('currentProject');
    }
    
    // Re-render dashboard
    if (window.router && window.router.getCurrentRoute() === '/dashboard') {
        const app = document.getElementById('app');
        if (app) {
            app.innerHTML = renderDashboard();
            requestAnimationFrame(() => {
                setupDashboardHandlers();
            });
        }
    } else {
        window.router.navigate('/dashboard');
    }
}

export function openProject(projectId) {
    if (!projectId) {
        console.error('No project ID provided');
        return;
    }
    console.log('Opening project:', projectId);
    localStorage.setItem('currentProject', projectId);
    
    // Navigate directly to workspace (bypass router for this navigation)
    const currentPath = window.location.pathname;
    const basePath = currentPath.includes('index-dashboard.html') 
        ? currentPath.replace('index-dashboard.html', '') 
        : '/';
    const workspacePath = basePath + 'workspace.html';
    console.log('Opening workspace at:', workspacePath);
    window.location.href = workspacePath;
}
