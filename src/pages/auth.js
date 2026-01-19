// Authentication Pages (Login/Signup)
export function renderLogin() {
    return `
        <div class="auth-page">
            <div class="auth-container">
                <div class="auth-header">
                    <h1>Welcome back</h1>
                    <p>Sign in to your account</p>
                </div>
                <form class="auth-form" id="login-form">
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="login-email" placeholder="name@company.com" required />
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="login-password" placeholder="Enter your password" required />
                    </div>
                    <button type="submit" class="btn-primary btn-full">Sign In</button>
                </form>
                <div class="auth-footer">
                    <p>Don't have an account? <a href="#" onclick="window.router.navigate('/signup'); return false;">Sign up</a></p>
                </div>
            </div>
        </div>
    `;
}

export function renderSignup() {
    return `
        <div class="auth-page">
            <div class="auth-container">
                <div class="auth-header">
                    <h1>Create account</h1>
                    <p>Get started with your free account</p>
                </div>
                <form class="auth-form" id="signup-form">
                    <div class="form-group">
                        <label>Name</label>
                        <input type="text" id="signup-name" placeholder="Your name" required />
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="signup-email" placeholder="name@company.com" required />
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="signup-password" placeholder="Create a password" required />
                    </div>
                    <button type="submit" class="btn-primary btn-full">Create Account</button>
                </form>
                <div class="auth-footer">
                    <p>Already have an account? <a href="#" onclick="window.router.navigate('/login'); return false;">Sign in</a></p>
                </div>
            </div>
        </div>
    `;
}

export function setupAuthHandlers() {
    // Login handler
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            // Simple auth (in production, use proper authentication)
            if (email && password) {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                // Preserve existing user data or create new
                const userData = {
                    email,
                    name: user.name || email.split('@')[0],
                    created: user.created || Date.now()
                };
                localStorage.setItem('user', JSON.stringify(userData));
                window.router.navigate('/dashboard');
            }
        });
    }

    // Signup handler
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            
            if (name && email && password) {
                const userData = {
                    email,
                    name,
                    created: Date.now()
                };
                localStorage.setItem('user', JSON.stringify(userData));
                window.router.navigate('/dashboard');
            }
        });
    }
}
