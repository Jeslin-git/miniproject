import { authAPI } from '../lib/api.js';

// Authentication Pages (Login/Signup)
export function renderLogin() {
    return `
        <div class="auth-page">
            <div class="auth-container animate-in">
                <a class="auth-back-link" onclick="window.router.navigate('/')" href="#">← Back to Home</a>
                <div class="auth-header">
                    <h1>Welcome back</h1>
                    <p>Sign in to your account</p>
                </div>
                <form id="login-form" class="auth-form">
                    <div class="form-group">
                        <label for="login-email">Email</label>
                        <input type="email" id="login-email" placeholder="name@company.com" required>
                    </div>
                    <div class="form-group">
                        <label for="login-password">Password</label>
                        <input type="password" id="login-password" placeholder="••••••••" required>
                    </div>
                    <div id="login-error" class="error-message"></div>
                    <button type="submit" class="btn btn-primary auth-submit">Sign in</button>
                </form>
                <div class="auth-footer">
                    <p>Don't have an account? <a href="#signup" id="go-to-signup">Sign up</a></p>
                </div>
            </div>
        </div>
    `;
}

export function renderVerifyEmail() {
    return `
        <div class="auth-page">
            <div class="auth-container animate-in" style="text-align: center; padding: 3rem 1rem;">
                <h1 id="verify-title" style="margin-bottom: 1rem;">Verifying your email...</h1>
                <p id="verify-message" style="margin-top: 1rem; color: #888; margin-bottom: 2rem;">Please wait while we confirm your email address.</p>
                <div id="verify-actions" style="display: none;"></div>
            </div>
        </div>
    `;
}

export async function setupVerifyHandler() {
    const hash = window.location.hash;
    const tokenMatch = hash.match(/token=([^&]+)/);
    const title = document.getElementById('verify-title');
    const message = document.getElementById('verify-message');
    const actions = document.getElementById('verify-actions');

    if (!tokenMatch) {
        title.textContent = "Verification Failed";
        title.style.color = "#ff4444";
        message.textContent = "No verification token provided in the URL.";
        actions.style.display = "block";
        actions.innerHTML = '<button class="btn btn-secondary" onclick="window.location.hash=\'#login\'">Go to Login</button>';
        return;
    }

    try {
        const res = await authAPI.verifyEmail(tokenMatch[1]);
        authAPI.saveSession(res.token, res.user);
        title.textContent = "Email Verified!";
        title.style.color = "#4CAF50";
        message.textContent = "Your account is now active. You have been automatically logged in.";
        actions.style.display = "block";
        actions.innerHTML = '<button class="btn btn-primary" onclick="window.location.hash=\'#dashboard\'">Go to Dashboard</button>';
    } catch (err) {
        title.textContent = "Verification Failed";
        title.style.color = "#ff4444";
        message.textContent = err.message || "The verification link is invalid or has expired.";
        actions.style.display = "block";
        actions.innerHTML = '<button class="btn btn-secondary" onclick="window.location.hash=\'#login\'">Go to Login</button>';
    }
}

export function renderSignup() {
    return `
        <div class="auth-page">
            <div class="auth-container animate-in">
                <a class="auth-back-link" onclick="window.router.navigate('/')" href="#">← Back to Home</a>
                <div class="auth-header">
                    <h1>Create an account</h1>
                    <p>Join PyScape</p>
                </div>
                <form id="signup-form" class="auth-form">
                    <div class="form-group">
                        <label for="signup-name">Full Name</label>
                        <input type="text" id="signup-name" placeholder="John Doe" required>
                    </div>
                    <div class="form-group">
                        <label for="signup-email">Email</label>
                        <input type="email" id="signup-email" placeholder="name@company.com" required>
                    </div>
                    <div class="form-group">
                        <label for="signup-password">Password</label>
                        <input type="password" id="signup-password" placeholder="••••••••" required>
                    </div>
                    <div id="signup-error" class="error-message"></div>
                    <button type="submit" class="btn btn-primary auth-submit">Create account</button>
                </form>
                <div class="auth-footer">
                    <p>Already have an account? <a href="#login" id="go-to-login">Sign in</a></p>
                </div>
            </div>
        </div>
    `;
}

export function setupAuthHandlers() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const errorDiv = document.getElementById('login-error');
            const submitBtn = loginForm.querySelector('button[type="submit"]');

            errorDiv.textContent = '';
            submitBtn.disabled = true;
            submitBtn.textContent = 'Signing in...';

            try {
                const { token, user } = await authAPI.login(email, password);
                authAPI.saveSession(token, user);
                window.location.hash = '#dashboard';
            } catch (err) {
                errorDiv.textContent = err.message;
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sign in';
            }
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const errorDiv = document.getElementById('signup-error');

            errorDiv.textContent = '';

            try {
                const res = await authAPI.register(email, password, name);
                // Registered - show success message instead of logging in
                signupForm.parentElement.innerHTML = `
                    <div class="auth-success animate-in" style="text-align: center; padding: 2rem 0;">
                        <h2 style="color: #4CAF50; margin-bottom: 1rem;">Check your email!</h2>
                        <p style="margin-bottom: 1.5rem;">We've sent a verification link to <strong>${email}</strong>.</p>
                        <p style="font-size: 0.9em; color: #888;">Please click the link to activate your account before signing in.</p>
                        <button type="button" class="btn btn-secondary" onclick="window.location.hash='#login'" style="margin-top: 1.5rem;">Return to login</button>
                    </div>
                `;
            } catch (err) {
                errorDiv.textContent = err.message;
            }
        });
    }
}
