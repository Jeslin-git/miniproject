// Central API helper — all requests include the stored JWT token.


const API_BASE = 'http://localhost:5001';

export async function apiFetch(path, options = {}) {
    const token = localStorage.getItem('authToken');

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
    };

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
        // Include the HTTP status in the message so callers can detect 401/403 reliably
        const serverMsg = data?.message || `Request failed`;
        const err = new Error(serverMsg);
        err.status = res.status;
        throw err;
    }

    return data;
}

// --- Auth helpers ---
export const authAPI = {
    register: (email, password, full_name) =>
        apiFetch('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, full_name }),
        }),

    login: (email, password) =>
        apiFetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),

    // Verifies email with token from URL
    verifyEmail: (token) => apiFetch(`/api/auth/verify-email?token=${token}`),

    // Returns { user } or throws if not logged in
    me: () => apiFetch('/api/auth/me'),

    updateMe: (full_name) =>
        apiFetch('/api/auth/me', {
            method: 'PUT',
            body: JSON.stringify({ full_name }),
        }),

    // Wipes the stored token (client-side logout)
    signOut: () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
    },

    // Returns the stored user object or null
    getUser: () => {
        const raw = localStorage.getItem('currentUser');
        return raw ? JSON.parse(raw) : null;
    },

    // Save token + user after login/register
    saveSession: (token, user) => {
        localStorage.setItem('authToken', token);
        localStorage.setItem('currentUser', JSON.stringify(user));
    },

    isLoggedIn: () => !!localStorage.getItem('authToken'),
};

// --- Projects helpers ---
export const projectsAPI = {
    list: () => apiFetch('/api/projects'),

    create: (name) =>
        apiFetch('/api/projects', {
            method: 'POST',
            body: JSON.stringify({ name }),
        }),

    get: (id) => apiFetch(`/api/projects/${id}`),

    update: (id, payload) =>
        apiFetch(`/api/projects/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),

    delete: (id) =>
        apiFetch(`/api/projects/${id}`, { method: 'DELETE' }),
};
