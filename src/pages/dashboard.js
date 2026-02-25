import { supabase } from '../lib/supabase.js';

// Files Dashboard Component
export function renderDashboard(projects = []) {
    return `
        <div class="dashboard-page">
            <div class="dashboard-header">
                <div class="dashboard-title">
                    <h1>Files</h1>
                    <p id="dashboard-stats">Loading stats...</p>
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
                            <p class="project-meta">Modified ${formatDate(project.updated_at)}</p>
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
    if (!timestamp) return 'just now';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
}

export async function refreshDashboard() {
    console.log('Refreshing dashboard...');
    const app = document.getElementById('app');

    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;
        if (!session) {
            console.log('No session found, redirecting to login');
            window.router.navigate('/login');
            return;
        }

        const { data: projects, error } = await supabase
            .from('projects')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error fetching projects:', error);
            if (app) {
                app.innerHTML = `
                    <div class="dashboard-page">
                        <div class="error-container" style="padding: 40px; text-align: center;">
                            <h2>Database Error</h2>
                            <p>${error.message}</p>
                            ${error.code === 'PGRST116' || error.message.includes('not found') ?
                        '<p style="color: var(--figma-text-secondary); margin-top: 10px;">The "projects" table might be missing. Please check your Supabase migrations.</p>' : ''}
                            <button class="btn-primary" onclick="window.location.reload()" style="margin-top: 20px;">Retry</button>
                        </div>
                    </div>
                `;
            }
            return;
        }

        if (app) {
            app.innerHTML = renderDashboard(projects || []);
            setupDashboardHandlers();
        }
    } catch (err) {
        console.error('Fatal dashboard error:', err);
        if (app) {
            app.innerHTML = `<div class="error-message" style="margin: 20px;">Failed to load dashboard: ${err.message}</div>`;
        }
    }
}

export function setupDashboardHandlers() {
    console.log('Setting up dashboard handlers...');

    // New project button
    const newProjectBtn = document.getElementById('new-project-btn');
    if (newProjectBtn) {
        newProjectBtn.onclick = async (e) => {
            e.preventDefault();
            const name = prompt('Enter project name:', 'Untitled Project');
            if (name && name.trim()) {
                await createProject(name.trim());
            }
        };
    }

    // Empty state button
    const emptyStateBtn = document.getElementById('empty-state-create-btn');
    if (emptyStateBtn) {
        emptyStateBtn.onclick = async (e) => {
            e.preventDefault();
            const name = prompt('Enter project name:', 'Untitled Project');
            if (name && name.trim()) {
                await createProject(name.trim());
            }
        };
    }

    // Project card clicks
    document.querySelectorAll('.project-card').forEach(card => {
        card.onclick = (e) => {
            if (e.target.closest('.project-delete')) return;
            const projectId = card.dataset.projectId;
            if (projectId) openProject(projectId);
        };
    });

    // Delete project
    document.querySelectorAll('.project-delete').forEach(btn => {
        btn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const projectId = btn.dataset.projectId;
            if (projectId && confirm('Are you sure you want to delete this project?')) {
                await deleteProject(projectId);
            }
        };
    });

    // Profile button
    const profileBtn = document.getElementById('profile-btn');
    if (profileBtn) {
        profileBtn.onclick = () => window.router.navigate('/profile');
    }

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            if (confirm('Are you sure you want to sign out?')) {
                const { error } = await supabase.auth.signOut();
                if (error) {
                    console.error('Sign out error:', error);
                    alert('Error signing out: ' + error.message);
                } else {
                    localStorage.removeItem('currentProject');
                    window.location.hash = '#login';
                }
            }
        };
    }

    fetchStats();
}

async function fetchStats() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const statsEl = document.getElementById('dashboard-stats');
    if (statsEl) {
        statsEl.textContent = `User: ${session.user.email}`;
    }
}

async function createProject(name) {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data, error } = await supabase
            .from('projects')
            .insert([{
                name: name,
                user_id: session.user.id,
                data: { objects: [] }
            }])
            .select()
            .single();

        if (error) throw error;

        localStorage.setItem('currentProject', data.id);
        window.location.href = 'workspace.html';
    } catch (error) {
        console.error('Error creating project:', error);
        alert('Failed to create project.');
    }
}

async function deleteProject(projectId) {
    try {
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', projectId);

        if (error) throw error;

        const currentProject = localStorage.getItem('currentProject');
        if (currentProject === projectId) localStorage.removeItem('currentProject');

        await refreshDashboard();
    } catch (error) {
        console.error('Error deleting project:', error);
        alert('Failed to delete project.');
    }
}

export function openProject(projectId) {
    if (!projectId) return;
    localStorage.setItem('currentProject', projectId);
    window.location.href = 'workspace.html';
}
