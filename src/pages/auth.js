import { supabase } from '../lib/supabase.js';

// Authentication Pages (Login/Signup)
export function renderLogin() {
    return `
        <div class="auth-page">
            <div class="auth-container animate-in">
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

export function renderSignup() {
    return `
        <div class="auth-page">
            <div class="auth-container animate-in">
                <div class="auth-header">
                    <h1>Create an account</h1>
                    <p>Join our gratitude community</p>
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

            // Clear previous errors
            errorDiv.textContent = '';
            submitBtn.disabled = true;
            submitBtn.textContent = 'Signing in...';

            console.log('Login attempt for:', email);

            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) {
                    console.error('Login error:', error);
                    errorDiv.textContent = error.message;
                } else {
                    console.log('Login successful, navigating to dashboard');
                    window.location.hash = '#dashboard';
                }
            } catch (err) {
                console.error('Unexpected auth error:', err);
                errorDiv.textContent = 'Auth error: ' + (err.message || 'Unknown error');
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

            try {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: name,
                        }
                    }
                });

                if (error) {
                    errorDiv.textContent = error.message;
                } else {
                    alert('Signup successful! Check your email for a verification link.');
                    window.location.hash = '#login';
                }
            } catch (err) {
                errorDiv.textContent = 'Auth error: ' + err.message;
            }
        });
    }
}
