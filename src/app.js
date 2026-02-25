// Main Application Entry Point
import { Router } from './router.js';
import { renderLogin, renderSignup, setupAuthHandlers } from './pages/auth.js';
import { renderDashboard, setupDashboardHandlers, refreshDashboard } from './pages/dashboard.js';
import { renderProfile, setupProfileHandlers } from './pages/profile.js';

import { supabase } from './lib/supabase.js';
import { renderLanding, setupLandingHandlers } from './pages/landing.js';

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
    console.log('Navigating to dashboard...');
    // Small delay to ensure session is updated if just logged in
    await new Promise(resolve => setTimeout(resolve, 100));

    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
        console.error('Session check error:', error);
        router.navigate('/login');
        return;
    }

    if (!session) {
        console.log('No session found on dashboard route, redirecting to login');
        router.navigate('/login');
        return;
    }
    await refreshDashboard();
});

router.register('/profile', async () => {
    console.log('Navigating to profile...');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        router.navigate('/login');
        return;
    }
    renderPage(renderProfile());
    setTimeout(setupProfileHandlers, 0);
});

router.register('/workspace', async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
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

    // Global auth listener
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
            console.log('User signed out, redirecting...');
            localStorage.removeItem('currentProject');
            window.location.hash = '#login';
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // Use setTimeout to ensure DOM is fully ready
    setTimeout(initApp, 0);
}
