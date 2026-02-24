import { supabase } from '../lib/supabase.js';

// Inline SVG hexagon PS logo (reused from splash, smaller)
const psLogoSVG = `
<svg viewBox="0 0 130 130" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
  <polygon points="65,8 118,37 118,93 65,122 12,93 12,37" fill="url(#nhexGrad1)" stroke="rgba(0,242,255,0.5)" stroke-width="1.5"/>
  <polygon points="65,8 118,37 65,65" fill="url(#nfaceGrad1)" opacity="0.9"/>
  <polygon points="118,37 118,93 65,65" fill="url(#nfaceGrad2)" opacity="0.85"/>
  <polygon points="65,122 12,93 65,65" fill="url(#nfaceGrad3)" opacity="0.9"/>
  <polygon points="12,37 65,8 65,65" fill="url(#nfaceGrad4)" opacity="0.85"/>
  <polygon points="118,93 65,122 65,65" fill="url(#nfaceGrad5)" opacity="0.8"/>
  <polygon points="12,93 12,37 65,65" fill="url(#nfaceGrad6)" opacity="0.9"/>
  <circle cx="65" cy="8" r="4" fill="#f5c842"/>
  <circle cx="118" cy="37" r="4" fill="#f5c842"/>
  <circle cx="118" cy="93" r="4" fill="#f5c842"/>
  <circle cx="65" cy="122" r="4" fill="#f5c842"/>
  <circle cx="12" cy="93" r="4" fill="#f5c842"/>
  <circle cx="12" cy="37" r="4" fill="#f5c842"/>
  <text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle"
    font-family="Inter, sans-serif" font-weight="800" font-size="30"
    fill="url(#ntextGrad)" letter-spacing="-1">PS</text>
  <defs>
    <linearGradient id="nhexGrad1" x1="12" y1="8" x2="118" y2="122" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0d2d4a"/><stop offset="100%" stop-color="#0a1f35"/>
    </linearGradient>
    <linearGradient id="nfaceGrad1" x1="65" y1="8" x2="118" y2="65" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#1a6090"/><stop offset="100%" stop-color="#0e3a5c"/>
    </linearGradient>
    <linearGradient id="nfaceGrad2" x1="118" y1="37" x2="65" y2="93" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#22a0b8"/><stop offset="100%" stop-color="#0d6b82"/>
    </linearGradient>
    <linearGradient id="nfaceGrad3" x1="65" y1="122" x2="12" y2="65" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#1a7a90"/><stop offset="100%" stop-color="#0d4f62"/>
    </linearGradient>
    <linearGradient id="nfaceGrad4" x1="12" y1="37" x2="65" y2="65" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#124e78"/><stop offset="100%" stop-color="#0a2f4a"/>
    </linearGradient>
    <linearGradient id="nfaceGrad5" x1="118" y1="93" x2="65" y2="122" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#1a9090"/><stop offset="100%" stop-color="#0d5858"/>
    </linearGradient>
    <linearGradient id="nfaceGrad6" x1="12" y1="93" x2="12" y2="37" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0e3e6a"/><stop offset="100%" stop-color="#081e35"/>
    </linearGradient>
    <linearGradient id="ntextGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7fff44"/><stop offset="100%" stop-color="#39e000"/>
    </linearGradient>
  </defs>
</svg>`;

// Feature hex icon SVG (outline hex with inner icon)
function hexIconSVG(innerContent) {
    return `
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:72px;height:72px;">
      <polygon points="40,4 74,22 74,58 40,76 6,58 6,22"
        stroke="rgba(0,242,255,0.6)" stroke-width="1.5" fill="rgba(0,242,255,0.04)"/>
      <circle cx="40" cy="4" r="2.5" fill="#f5c842"/>
      <circle cx="74" cy="22" r="2.5" fill="#f5c842"/>
      <circle cx="74" cy="58" r="2.5" fill="#f5c842"/>
      <circle cx="40" cy="76" r="2.5" fill="#f5c842"/>
      <circle cx="6" cy="58" r="2.5" fill="#f5c842"/>
      <circle cx="6" cy="22" r="2.5" fill="#f5c842"/>
      ${innerContent}
    </svg>`;
}

const featureIcons = {
    voice: hexIconSVG(`
        <text x="40" y="44" text-anchor="middle" dominant-baseline="middle" font-size="22" fill="rgba(0,242,255,0.85)">🎤</text>
    `),
    physics: hexIconSVG(`
        <circle cx="40" cy="40" r="10" stroke="rgba(0,242,255,0.7)" stroke-width="1.5" fill="none"/>
        <line x1="40" y1="30" x2="40" y2="50" stroke="rgba(0,242,255,0.7)" stroke-width="1.5"/>
        <line x1="30" y1="40" x2="50" y2="40" stroke="rgba(0,242,255,0.7)" stroke-width="1.5"/>
        <circle cx="40" cy="40" r="3" fill="#00f2ff"/>
    `),
    ar: hexIconSVG(`
        <rect x="28" y="28" width="24" height="24" rx="3" stroke="rgba(0,242,255,0.7)" stroke-width="1.5" fill="none"/>
        <line x1="28" y1="40" x2="52" y2="40" stroke="rgba(0,242,255,0.5)" stroke-width="1"/>
        <line x1="40" y1="28" x2="40" y2="52" stroke="rgba(0,242,255,0.5)" stroke-width="1"/>
        <circle cx="40" cy="40" r="4" fill="rgba(0,242,255,0.4)" stroke="#00f2ff" stroke-width="1.5"/>
    `),
    ps: `<div style="width:72px;height:72px;">${psLogoSVG}</div>`
};

// Animated mesh/grid hero visual using Canvas
function getMeshCanvas() {
    return `<canvas id="hero-mesh-canvas" style="width:100%;height:100%;display:block;border-radius:12px;opacity:0.9;"></canvas>`;
}

export function renderLanding() {
    return `
    <div class="landing-page-v2">

      <!-- NAVBAR -->
      <nav class="ps-navbar">
        <div class="ps-nav-inner">
          <div class="ps-nav-logo">
            <div class="ps-logo-icon">${psLogoSVG}</div>
          </div>
          <div class="ps-nav-links">
            <a href="#features" class="ps-nav-link">Features</a>
            <a href="#showcase" class="ps-nav-link">Showcase</a>
            <a href="#about" class="ps-nav-link">About Us</a>
          </div>
          <div class="ps-nav-actions" id="landing-nav-actions">
            <button class="ps-btn-login" onclick="window.router.navigate('/login')">Login</button>
          </div>
        </div>
      </nav>

      <!-- HERO -->
      <section class="ps-hero">
        <div class="ps-hero-content">
          <h1 class="ps-hero-title">PyScape</h1>
          <p class="ps-hero-subtitle">Building blocks for the employed.</p>
          <div class="ps-hero-actions" id="landing-cta">
            <button class="ps-btn-primary" onclick="window.router.navigate('/signup')">Get Started</button>
            <button class="ps-btn-outline" onclick="document.getElementById('features').scrollIntoView({behavior:'smooth'})">Learn More</button>
          </div>
        </div>
        <div class="ps-hero-visual">
          ${getMeshCanvas()}
          <!-- Floating glowing orbs -->
          <div class="ps-orb ps-orb-1"></div>
          <div class="ps-orb ps-orb-2"></div>
          <div class="ps-orb ps-orb-3"></div>
        </div>
      </section>

      <!-- FEATURES
      <section class="ps-features" id="features">
        <div class="ps-features-grid">
          <div class="ps-feature-card">
            <div class="ps-feature-icon">${featureIcons.ps}</div>
            <span class="ps-feature-label">Voice Command</span>
          </div>
          <div class="ps-feature-card">
            <div class="ps-feature-icon">${featureIcons.physics}</div>
            <span class="ps-feature-label">Physics Engine</span>
          </div>
          <div class="ps-feature-card">
            <div class="ps-feature-icon">${featureIcons.physics}</div>
            <span class="ps-feature-label">3D Modeling</span>
          </div>
          <div class="ps-feature-card">
            <div class="ps-feature-icon">${featureIcons.ar}</div>
            <span class="ps-feature-label">AR Integration</span>
          </div>
        </div>
      </section> -->

    </div>`;
}

export async function setupLandingHandlers() {
    // Start mesh canvas animation
    initMeshAnimation();

    // Check session
    const { data: { session } } = await supabase.auth.getSession();
    const cta = document.getElementById('landing-cta');
    const navActions = document.getElementById('landing-nav-actions');

    if (session) {
        if (cta) {
            cta.innerHTML = `
                <button class="ps-btn-primary" onclick="window.router.navigate('/dashboard')">Go to Dashboard</button>
                <button class="ps-btn-outline" id="landing-logout-btn">Sign Out</button>
            `;
            const logoutBtn = document.getElementById('landing-logout-btn');
            if (logoutBtn) {
                logoutBtn.onclick = async () => {
                    await supabase.auth.signOut();
                    localStorage.removeItem('currentProject');
                    window.location.reload();
                };
            }
        }
        if (navActions) {
            navActions.innerHTML = `
                <button class="ps-btn-login" onclick="window.router.navigate('/dashboard')">Dashboard</button>
            `;
        }
    }

    supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
            setupLandingHandlers();
        }
    });
}

function initMeshAnimation() {
    const canvas = document.getElementById('hero-mesh-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let W, H, points, animId;

    function setSize() {
        const rect = canvas.getBoundingClientRect();
        W = canvas.width = rect.width || 560;
        H = canvas.height = rect.height || 380;
    }

    function generatePoints() {
        points = [];
        const cols = 14, rows = 9;
        for (let j = 0; j <= rows; j++) {
            for (let i = 0; i <= cols; i++) {
                const bx = (i / cols) * W;
                const by = (j / rows) * H;
                // Perspective "tilt" – more compressed near top
                const perspective = 0.45 + (j / rows) * 0.55;
                const px = W * 0.5 + (bx - W * 0.5) * perspective;
                const py = H * 0.12 + (by - H * 0.12) * perspective;

                points.push({
                    ox: px, oy: py,
                    x: px, y: py,
                    vx: (Math.random() - 0.5) * 0.18,
                    vy: (Math.random() - 0.5) * 0.08,
                    size: Math.random() < 0.07 ? 4 : 2,
                    cols, rows, i, j
                });
            }
        }
    }

    function draw(t) {
        ctx.clearRect(0, 0, W, H);

        // Draw edges
        const cols = 14, rows = 9;
        for (let j = 0; j <= rows; j++) {
            for (let i = 0; i <= cols; i++) {
                const idx = j * (cols + 1) + i;
                const p = points[idx];

                // Horizontal line
                if (i < cols) {
                    const p2 = points[idx + 1];
                    const alpha = 0.12 + 0.1 * (j / rows);
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = `rgba(0, 220, 240, ${alpha})`;
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }

                // Vertical line
                if (j < rows) {
                    const p3 = points[(j + 1) * (cols + 1) + i];
                    const alpha = 0.12 + 0.08 * (j / rows);
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p3.x, p3.y);
                    ctx.strokeStyle = `rgba(0, 220, 240, ${alpha})`;
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }
            }
        }

        // Draw nodes
        for (const p of points) {
            const glow = p.size > 2;
            if (glow) {
                const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 8);
                grad.addColorStop(0, 'rgba(0,242,255,0.9)');
                grad.addColorStop(1, 'rgba(0,242,255,0)');
                ctx.beginPath();
                ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
                ctx.fillStyle = grad;
                ctx.fill();
            }
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size > 2 ? 3 : 1.5, 0, Math.PI * 2);
            ctx.fillStyle = glow ? '#00f2ff' : 'rgba(0,210,230,0.7)';
            ctx.fill();

            // Gentle wave motion
            p.x = p.ox + Math.sin(t * 0.0007 + p.i * 0.5) * 5;
            p.y = p.oy + Math.cos(t * 0.0009 + p.j * 0.6) * 3;
        }

        animId = requestAnimationFrame(draw);
    }

    setSize();
    generatePoints();
    animId = requestAnimationFrame(draw);

    const obs = new ResizeObserver(() => {
        cancelAnimationFrame(animId);
        setSize();
        generatePoints();
        animId = requestAnimationFrame(draw);
    });
    obs.observe(canvas);
}
