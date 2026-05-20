import { authAPI, projectsAPI } from '../lib/api.js';

// ── helpers ────────────────────────────────────────────────────────────────
const AVATAR_KEY = 'ps_avatar';
const BIO_KEY    = 'ps_bio';
const HANDLE_KEY = 'ps_handle';
const THEME_KEY  = 'ps_theme';

const getAvatar  = () => localStorage.getItem(AVATAR_KEY) || null;
const getBio     = () => localStorage.getItem(BIO_KEY)    || '';
const getHandle  = () => localStorage.getItem(HANDLE_KEY) || '';
const getTheme   = () => localStorage.getItem(THEME_KEY)  || 'dark';

function initials(user) {
    if (user.full_name) {
        return user.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    }
    return (user.email || 'U').charAt(0).toUpperCase();
}

// ── render ─────────────────────────────────────────────────────────────────
export function renderProfile() {
    return `<div class="profile-page" id="profile-root"><div class="loading-state" style="margin:40px auto;text-align:center;">Loading profile…</div></div>`;
}

// ── setup ──────────────────────────────────────────────────────────────────
export async function setupProfileHandlers() {
    // 1. Fetch fresh user data
    let user = authAPI.getUser();
    try {
        const res = await authAPI.me();
        user = res.user;
        localStorage.setItem('currentUser', JSON.stringify(user));
    } catch (err) {
        if (!user) { window.router.navigate('/login'); return; }
    }

    // 2. Fetch project count
    let projectCount = 0;
    try { const p = await projectsAPI.list(); projectCount = p.length; } catch (_) {}

    // 3. Paint the page
    paintProfile(user, projectCount);
    bindHandlers(user);
}

// ── paint ──────────────────────────────────────────────────────────────────
function paintProfile(user, projectCount) {
    const avatar  = getAvatar();
    const bio     = getBio();
    const handle  = getHandle();
    const theme   = getTheme();
    const joined  = user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—';

    const avatarHTML = avatar
        ? `<img src="${avatar}" alt="avatar" id="avatar-img" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
        : `<span id="avatar-initials" style="font-size:2rem;font-weight:700;color:#fff;">${initials(user)}</span>`;

    document.getElementById('profile-root').innerHTML = `
    <div class="profile-layout">

        <!-- ── LEFT PANEL ── -->
        <aside class="profile-sidebar">
            <!-- Avatar -->
            <div class="avatar-wrap" id="avatar-wrap">
                <div class="avatar-circle large" id="avatar-circle">${avatarHTML}</div>
                <label class="avatar-upload-btn" for="avatar-file-input" title="Change photo">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                </label>
                <input type="file" id="avatar-file-input" accept="image/*" style="display:none;">
                ${avatar ? `<button class="avatar-remove-btn" id="avatar-remove-btn" title="Remove photo">×</button>` : ''}
            </div>

            <div style="text-align:center;margin-top:16px;">
                <div style="font-size:1.2rem;font-weight:700;">${user.full_name || 'User'}</div>
                ${handle ? `<div style="font-size:0.85rem;color:#888;margin-top:2px;">@${handle}</div>` : ''}
                <div style="font-size:0.8rem;color:#666;margin-top:6px;">${user.email}</div>
            </div>

            <!-- Stats -->
            <div class="profile-stats-mini">
                <div class="stat-mini">
                    <div class="stat-mini-value">${projectCount}</div>
                    <div class="stat-mini-label">Projects</div>
                </div>
                <div class="stat-mini">
                    <div class="stat-mini-value">${joined}</div>
                    <div class="stat-mini-label">Member since</div>
                </div>
            </div>

            <!-- Account badge -->
            <div class="account-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Verified Account
            </div>

            <button class="btn-danger-outline" id="logout-profile-btn" style="margin-top:auto;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Sign Out
            </button>
        </aside>

        <!-- ── RIGHT PANEL ── -->
        <main class="profile-main">
            <div class="profile-topbar">
                <button class="back-btn" onclick="window.router.navigate('/dashboard')">← Back to Dashboard</button>
                <h1 style="font-size:1.4rem;font-weight:700;">Account Settings</h1>
            </div>

            <!-- General -->
            <div class="settings-card">
                <div class="settings-card-title">General</div>

                <div class="setting-row">
                    <div class="setting-label">
                        <span>Display Name</span>
                        <small>This is how others see you in PyScape</small>
                    </div>
                    <div class="setting-control">
                        <input type="text" id="profile-name" class="profile-input" value="${user.full_name || ''}" placeholder="Your full name">
                    </div>
                </div>

                <div class="setting-row">
                    <div class="setting-label">
                        <span>Username / Handle</span>
                        <small>Your unique @handle (visible to others)</small>
                    </div>
                    <div class="setting-control">
                        <div style="position:relative;">
                            <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#888;font-size:0.9rem;">@</span>
                            <input type="text" id="profile-handle" class="profile-input" style="padding-left:28px;" value="${handle}" placeholder="yourhandle">
                        </div>
                    </div>
                </div>

                <div class="setting-row">
                    <div class="setting-label">
                        <span>Bio</span>
                        <small>A short description about yourself</small>
                    </div>
                    <div class="setting-control">
                        <textarea id="profile-bio" class="profile-input" rows="3" placeholder="Tell others a bit about yourself…" style="resize:vertical;">${bio}</textarea>
                    </div>
                </div>

                <div style="display:flex;justify-content:flex-end;margin-top:8px;">
                    <div id="profile-save-msg" style="align-self:center;margin-right:12px;font-size:0.85rem;color:#68d391;display:none;">✓ Saved</div>
                    <button class="btn-primary btn-small" id="save-general-btn">Save Changes</button>
                </div>
            </div>

            <!-- Contact / Email -->
            <div class="settings-card">
                <div class="settings-card-title">Contact</div>
                <div class="setting-row">
                    <div class="setting-label">
                        <span>Email Address</span>
                        <small>Used for login and verification emails</small>
                    </div>
                    <div class="setting-control">
                        <input type="email" class="profile-input" value="${user.email || ''}" disabled style="opacity:0.5;cursor:not-allowed;">
                        <small style="color:#888;margin-top:4px;display:block;">Email changes are not supported at this time</small>
                    </div>
                </div>
            </div>

            <!-- Appearance -->
            <div class="settings-card">
                <div class="settings-card-title">Appearance</div>
                <div class="setting-row" style="align-items:flex-start;">
                    <div class="setting-label">
                        <span>Interface Theme</span>
                        <small>Choose how PyScape looks</small>
                    </div>
                    <div class="setting-control" style="display:flex;gap:12px;flex-wrap:wrap;">
                        <label class="theme-option ${theme === 'dark' ? 'selected' : ''}" data-theme="dark">
                            <input type="radio" name="theme" value="dark" ${theme === 'dark' ? 'checked' : ''} style="display:none;">
                            <div class="theme-swatch dark-swatch"></div>
                            <span>Dark</span>
                        </label>
                        <label class="theme-option ${theme === 'light' ? 'selected' : ''}" data-theme="light">
                            <input type="radio" name="theme" value="light" ${theme === 'light' ? 'checked' : ''} style="display:none;">
                            <div class="theme-swatch light-swatch"></div>
                            <span>Light</span>
                        </label>
                        <label class="theme-option ${theme === 'system' ? 'selected' : ''}" data-theme="system">
                            <input type="radio" name="theme" value="system" ${theme === 'system' ? 'checked' : ''} style="display:none;">
                            <div class="theme-swatch system-swatch"></div>
                            <span>System</span>
                        </label>
                    </div>
                </div>
            </div>

            <!-- Danger zone -->
            <div class="settings-card danger-card">
                <div class="settings-card-title" style="color:#fc8181;">Danger Zone</div>
                <div class="setting-row">
                    <div class="setting-label">
                        <span>Delete Account</span>
                        <small>Permanently remove your account and all projects</small>
                    </div>
                    <div class="setting-control">
                        <button class="btn-danger btn-small" id="delete-account-btn">Delete Account</button>
                    </div>
                </div>
            </div>

        </main>
    </div>`;
}

// ── bind handlers ──────────────────────────────────────────────────────────
function bindHandlers(user) {
    // Avatar upload
    const fileInput = document.getElementById('avatar-file-input');
    fileInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            showToast('Image must be under 2 MB', 'error'); return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            localStorage.setItem(AVATAR_KEY, ev.target.result);
            paintProfile(user, null); // repaint avatar
            // Re-count projects async
            projectsAPI.list().then(p => paintProfile(user, p.length)).catch(() => {});
            bindHandlers(user);
        };
        reader.readAsDataURL(file);
    });

    // Avatar remove
    document.getElementById('avatar-remove-btn')?.addEventListener('click', () => {
        localStorage.removeItem(AVATAR_KEY);
        paintProfile(user, null);
        projectsAPI.list().then(p => paintProfile(user, p.length)).catch(() => {});
        bindHandlers(user);
    });

    // Save general
    document.getElementById('save-general-btn')?.addEventListener('click', async () => {
        const nameEl   = document.getElementById('profile-name');
        const handleEl = document.getElementById('profile-handle');
        const bioEl    = document.getElementById('profile-bio');
        const btn      = document.getElementById('save-general-btn');
        const msg      = document.getElementById('profile-save-msg');

        const newName   = nameEl?.value.trim() || '';
        const newHandle = handleEl?.value.trim().replace(/^@/, '').replace(/\s+/g, '').toLowerCase() || '';
        const newBio    = bioEl?.value.trim() || '';

        btn.disabled = true; btn.textContent = 'Saving…';

        try {
            if (newName) {
                const { user: updated } = await authAPI.updateMe(newName);
                localStorage.setItem('currentUser', JSON.stringify(updated));
            }
            if (newHandle) localStorage.setItem(HANDLE_KEY, newHandle);
            if (bioEl)     localStorage.setItem(BIO_KEY, newBio);

            // Flash saved
            if (msg) { msg.style.display = 'block'; setTimeout(() => msg.style.display = 'none', 3000); }
        } catch (err) {
            showToast('Failed to save: ' + err.message, 'error');
        } finally {
            btn.disabled = false; btn.textContent = 'Save Changes';
        }
    });

    // Theme
    document.querySelectorAll('.theme-option').forEach(label => {
        label.addEventListener('click', () => {
            const val = label.dataset.theme;
            localStorage.setItem(THEME_KEY, val);
            document.querySelectorAll('.theme-option').forEach(l => l.classList.remove('selected'));
            label.classList.add('selected');
            showToast('Theme preference saved', 'success');
        });
    });

    // Logout
    document.getElementById('logout-profile-btn')?.addEventListener('click', () => {
        if (confirm('Are you sure you want to sign out?')) {
            authAPI.signOut();
            localStorage.removeItem('currentProject');
            window.location.hash = '#login';
        }
    });

    // Delete account (UI only — confirmation gate)
    document.getElementById('delete-account-btn')?.addEventListener('click', () => {
        const confirmed = prompt(`This will permanently delete your account and all projects.\nType DELETE to confirm:`);
        if (confirmed === 'DELETE') {
            showToast('Account deletion is disabled in this demo.', 'error');
        }
    });
}

// ── toast ──────────────────────────────────────────────────────────────────
function showToast(message, type = 'success') {
    const existing = document.getElementById('ps-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'ps-toast';
    toast.textContent = message;
    toast.style.cssText = `
        position:fixed; bottom:24px; right:24px; z-index:99999;
        padding:12px 18px; border-radius:10px; font-size:0.875rem; font-weight:500;
        background:${type === 'error' ? '#c53030' : '#276749'};
        color:#fff; box-shadow:0 4px 20px rgba(0,0,0,0.4);
        animation:slideInToast 0.25s ease;
    `;
    document.head.insertAdjacentHTML('beforeend', `<style>@keyframes slideInToast{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}</style>`);
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}
