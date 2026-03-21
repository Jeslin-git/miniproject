// Main Application Entry Point
import { Router } from './router.js';
import { renderLogin, renderSignup, setupAuthHandlers } from './pages/auth.js';
import { renderDashboard, setupDashboardHandlers, refreshDashboard } from './pages/dashboard.js';
import { renderProfile, setupProfileHandlers } from './pages/profile.js';
import { renderLanding, setupLandingHandlers } from './pages/landing.js';
import { authAPI } from './lib/api.js';

const router = new Router();
window.router = router;

// Route handlers
router.register('/', () => {
    renderPage(renderLanding());
    setTimeout(setupLandingHandlers, 0);
});

router.register('/login', () => {
    renderPage(renderLogin());
    setTimeout(setupAuthHandlers, 0);
});

router.register('/signup', () => {
    renderPage(renderSignup());
    setTimeout(setupAuthHandlers, 0);
});

router.register('/dashboard', async () => {
    if (!authAPI.isLoggedIn()) {
        router.navigate('/login');
        return;
    }
    await refreshDashboard();
});

router.register('/profile', async () => {
    if (!authAPI.isLoggedIn()) {
        router.navigate('/login');
        return;
    }
    renderPage(renderProfile());
    setTimeout(setupProfileHandlers, 0);
});

router.register('/workspace', async () => {
    if (!authAPI.isLoggedIn()) {
        router.navigate('/login');
        return;
    }
    window.location.href = '/workspace.html';
});

function renderPage(html) {
    const app = document.getElementById('app');
    if (app) app.innerHTML = html;
}

// Initialize app
function initApp() {
    router.init();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    setTimeout(initApp, 0);
}
