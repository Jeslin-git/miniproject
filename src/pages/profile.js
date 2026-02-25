import { supabase } from '../lib/supabase.js';

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
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const user = session.user;
        const { data: projects } = await supabase
            .from('projects')
            .select('id')
            .eq('user_id', user.id);
        const projectCount = projects ? projects.length : 0;

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
                        <h2>${user.user_metadata?.full_name || 'User'}</h2>
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
                            <input type="text" id="profile-name" value="${user.user_metadata?.full_name || ''}" placeholder="Your name" />
                            <button class="btn-secondary btn-small" id="save-name-btn">Save</button>
                        </div>
                        <div class="setting-item">
                            <label>Email</label>
                            <input type="email" id="profile-email-input" value="${user.email || ''}" placeholder="your@email.com" disabled />
                            <small>Email cannot be changed</small>
                        </div>
                    </div>
                </div>
                
                <div class="profile-section">
                    <h3>Danger Zone</h3>
                    <div class="danger-zone">
                        <p>Delete your account and all associated data</p>
                        <button class="btn-danger" id="delete-account-btn">Delete Account</button>
                    </div>
                </div>
                
                <div class="profile-actions">
                    <button class="btn-secondary" onclick="window.router.navigate('/dashboard')">Back to Dashboard</button>
                    <button class="btn-primary" id="logout-profile-btn">Sign Out</button>
                </div>
            `;

            // Re-attach handlers
            setupDynamicHandlers();
        }
    };

    const setupDynamicHandlers = () => {
        // Logout button
        const logoutBtn = document.getElementById('logout-profile-btn');
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

        // Save name (Supabase update)
        const saveNameBtn = document.getElementById('save-name-btn');
        if (saveNameBtn) {
            saveNameBtn.onclick = async () => {
                const nameInput = document.getElementById('profile-name');
                const newName = nameInput.value.trim();
                if (newName) {
                    const { error } = await supabase.auth.updateUser({
                        data: { full_name: newName }
                    });
                    if (error) alert(error.message);
                    else alert('Profile updated!');
                }
            };
        }
    };

    loadProfile();
}
