import { authAPI, projectsAPI } from '../lib/api.js';

// Profile Page Component
export function renderProfile() {
    return `
        <div class="profile-page">
            <div class="profile-header">
                <button class="back-btn" onclick="window.router.navigate('/dashboard')">← Back</button>
                <h1>Profile</h1>
            </div>
            
            <div class="profile-container" id="profile-content">
                <div class="loading-state">Loading profile...</div>
            </div>
        </div>
    `;
}

export function setupProfileHandlers() {
    const loadProfile = async () => {
        let user = authAPI.getUser();

        // Refresh from API to get latest data
        try {
            const res = await authAPI.me();
            user = res.user;
            // Update cached user
            localStorage.setItem('currentUser', JSON.stringify(user));
        } catch (err) {
            if (!user) {
                window.router.navigate('/login');
                return;
            }
        }

        // Get project count
        let projectCount = 0;
        try {
            const projects = await projectsAPI.list();
            projectCount = projects.length;
        } catch (_) { }

        const content = document.getElementById('profile-content');
        if (content) {
            content.innerHTML = `
                <div class="profile-section">
                    <div class="profile-avatar">
                        <div class="avatar-circle">
                            ${user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                        </div>
                    </div>
                    
                    <div class="profile-info">
                        <h2>${user.full_name || 'User'}</h2>
                        <p class="profile-email">${user.email || 'No email'}</p>
                    </div>
                </div>
                
                <div class="profile-stats">
                    <div class="stat-card">
                        <div class="stat-value">${projectCount}</div>
                        <div class="stat-label">Projects</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${new Date(user.created_at).toLocaleDateString()}</div>
                        <div class="stat-label">Member Since</div>
                    </div>
                </div>
                
                <div class="profile-section">
                    <h3>Account Settings</h3>
                    <div class="settings-list">
                        <div class="setting-item">
                            <label>Display Name</label>
                            <input type="text" id="profile-name" value="${user.full_name || ''}" placeholder="Your name" />
                            <button class="btn-secondary btn-small" id="save-name-btn">Save</button>
                        </div>
                        <div class="setting-item">
                            <label>Email</label>
                            <input type="email" id="profile-email-input" value="${user.email || ''}" placeholder="your@email.com" disabled />
                            <small>Email cannot be changed</small>
                        </div>
                    </div>
                </div>
                
                <div class="profile-actions">
                    <button class="btn-secondary" onclick="window.router.navigate('/dashboard')">Back to Dashboard</button>
                    <button class="btn-primary" id="logout-profile-btn">Sign Out</button>
                </div>
            `;

            setupDynamicHandlers();
        }
    };

    const setupDynamicHandlers = () => {
        // Logout button
        const logoutBtn = document.getElementById('logout-profile-btn');
        if (logoutBtn) {
            logoutBtn.onclick = () => {
                if (confirm('Are you sure you want to sign out?')) {
                    authAPI.signOut();
                    localStorage.removeItem('currentProject');
                    window.location.hash = '#login';
                }
            };
        }

        // Save name
        const saveNameBtn = document.getElementById('save-name-btn');
        if (saveNameBtn) {
            saveNameBtn.onclick = async () => {
                const nameInput = document.getElementById('profile-name');
                const newName = nameInput.value.trim();
                if (newName) {
                    try {
                        const { user: updated } = await authAPI.updateMe(newName);
                        localStorage.setItem('currentUser', JSON.stringify(updated));
                        alert('Profile updated!');
                    } catch (err) {
                        alert('Error: ' + err.message);
                    }
                }
            };
        }
    };

    loadProfile();
}
