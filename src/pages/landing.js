import { supabase } from '../lib/supabase.js';

// Landing Page Component
export function renderLanding() {
    return `
        <div class="landing-page">
            <div class="landing-hero">
                <div class="hero-content">
                    <h1 class="hero-title">3D Playground</h1>
                    <p class="hero-subtitle">Create, design, and explore immersive 3D scenes</p>
                    <div class="hero-actions" id="landing-cta">
                        <button class="btn-primary" onclick="window.router.navigate('/signup')">Get Started</button>
                        <button class="btn-secondary" onclick="window.router.navigate('/login')">Sign In</button>
                    </div>
                </div>
                <div class="hero-visual">
                    <div class="floating-cube"></div>
                </div>
            </div>
            <div class="landing-features">
                <div class="feature-card">
                    <div class="feature-icon">🎨</div>
                    <h3>Design</h3>
                    <p>Create stunning 3D scenes with intuitive tools</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🚀</div>
                    <h3>Fast</h3>
                    <p>Lightning-fast performance for smooth workflows</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">💾</div>
                    <h3>Organize</h3>
                    <p>Manage multiple projects in one dashboard</p>
                </div>
            </div>
        </div>
    `;
}

export async function setupLandingHandlers() {
    // Check session immediately
    const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const cta = document.getElementById('landing-cta');

        if (cta && session) {
            cta.innerHTML = `
                <button class="btn-primary" onclick="window.router.navigate('/dashboard')">Go to Dashboard</button>
                <button class="btn-secondary" id="landing-logout-btn">Sign Out</button>
            `;
            const logoutBtn = document.getElementById('landing-logout-btn');
            if (logoutBtn) {
                logoutBtn.onclick = async () => {
                    await supabase.auth.signOut();
                    window.location.reload();
                };
            }
        }
    };

    checkSession();

    // Also listen for auth changes to update UI dynamically
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
            checkSession();
        }
    });
}
