// Simple hash-based router for dashboard navigation
export class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = '';
        this.init();
    }

    init() {
        window.addEventListener('hashchange', () => this.handleRoute());
        this.handleRoute();
    }

    register(path, handler) {
        this.routes[path] = handler;
    }

    navigate(path) {
        window.location.hash = path;
    }

    handleRoute() {
        const hash = window.location.hash.slice(1) || '/';
        const path = hash.split('?')[0];
        
        if (this.routes[path]) {
            this.currentRoute = path;
            this.routes[path]();
        } else {
            // Default to login if route not found
            const user = localStorage.getItem('user');
            this.navigate(user ? '/dashboard' : '/login');
        }
    }

    getCurrentRoute() {
        return this.currentRoute;
    }
}
