// Profile Page Component
export function renderProfile() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    
    return `
        <div class="profile-page">
            <div class="profile-header">
                <button class="back-btn" onclick="window.router.navigate('/dashboard')">← Back</button>
                <h1>Profile</h1>
            </div>
            
            <div class="profile-container">
                <div class="profile-section">
                    <div class="profile-avatar">
                        <div class="avatar-circle">
                            ${user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                    </div>
                    
                    <div class="profile-info">
                        <h2>${user.name || 'User'}</h2>
                        <p class="profile-email">${user.email || 'No email'}</p>
                    </div>
                </div>
                
                <div class="profile-stats">
                    <div class="stat-card">
                        <div class="stat-value">${projects.length}</div>
                        <div class="stat-label">Projects</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${new Date(user.created || Date.now()).toLocaleDateString()}</div>
                        <div class="stat-label">Member Since</div>
                    </div>
                </div>
                
                <div class="profile-section">
                    <h3>Account Settings</h3>
                    <div class="settings-list">
                        <div class="setting-item">
                            <label>Display Name</label>
                            <input type="text" id="profile-name" value="${user.name || ''}" placeholder="Your name" />
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
            </div>
        </div>
    `;
}

export function setupProfileHandlers() {
    // Save name button
    const saveNameBtn = document.getElementById('save-name-btn');
    if (saveNameBtn) {
        saveNameBtn.addEventListener('click', () => {
            const nameInput = document.getElementById('profile-name');
            const newName = nameInput.value.trim();
            if (newName) {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                user.name = newName;
                localStorage.setItem('user', JSON.stringify(user));
                
                // Update display
                const nameDisplay = document.querySelector('.profile-info h2');
                if (nameDisplay) {
                    nameDisplay.textContent = newName;
                }
                
                // Update avatar
                const avatar = document.querySelector('.avatar-circle');
                if (avatar) {
                    avatar.textContent = newName.charAt(0).toUpperCase();
                }
                
                alert('Name updated successfully!');
            }
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logout-profile-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to sign out?')) {
                localStorage.removeItem('user');
                localStorage.removeItem('currentProject');
                window.router.navigate('/login');
            }
        });
    }
    
    // Delete account button
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', () => {
            const confirmText = prompt('Type "DELETE" to confirm account deletion:');
            if (confirmText === 'DELETE') {
                // Clear all user data
                localStorage.removeItem('user');
                localStorage.removeItem('projects');
                localStorage.removeItem('currentProject');
                alert('Account deleted. Redirecting to login...');
                window.router.navigate('/login');
            } else {
                alert('Account deletion cancelled.');
            }
        });
    }
}
