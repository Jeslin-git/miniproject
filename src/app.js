// Main Application Entry Point
import { Router } from './router.js';
import { renderLogin, renderSignup, setupAuthHandlers } from './pages/auth.js';
import { renderDashboard, setupDashboardHandlers } from './pages/dashboard.js';
import { renderProfile, setupProfileHandlers } from './pages/profile.js';

const router = new Router();
window.router = router;

// Route handlers
router.register('/', () => {
    const user = localStorage.getItem('user');
    if (user) {
        router.navigate('/dashboard');
    } else {
        router.navigate('/login');
    }
});

router.register('/login', () => {
    renderPage(renderLogin());
    setTimeout(setupAuthHandlers, 0);
});

router.register('/signup', () => {
    renderPage(renderSignup());
    setTimeout(setupAuthHandlers, 0);
});

router.register('/dashboard', () => {
    const user = localStorage.getItem('user');
    if (!user) {
        router.navigate('/login');
        return;
    }
    renderPage(renderDashboard());
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
        setupDashboardHandlers();
    });
});

router.register('/profile', () => {
    const user = localStorage.getItem('user');
    if (!user) {
        router.navigate('/login');
        return;
    }
    renderPage(renderProfile());
    setTimeout(setupProfileHandlers, 0);
});

router.register('/workspace', () => {
    const user = localStorage.getItem('user');
    if (!user) {
        router.navigate('/login');
        return;
    }
    // Redirect to workspace HTML (use absolute path from root)
    window.location.href = '/workspace.html';
});

function renderPage(html) {
    const app = document.getElementById('app');
    if (app) {
        app.innerHTML = html;
    }
}

// Initialize app
function initApp() {
    router.init();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // Use setTimeout to ensure DOM is fully ready
    setTimeout(initApp, 0);
}
