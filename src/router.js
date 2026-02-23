// Simple hash-based router for dashboard navigation
export class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = '';
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
        // Handle empty hash or root
        const hash = window.location.hash.slice(1) || '/';
        let path = hash.split('?')[0];

        // Normalize path to have leading slash
        if (!path.startsWith('/')) path = '/' + path;

        if (this.routes[path]) {
            this.currentRoute = path;
            this.routes[path]();
        } else {
            // Fallback to landing page if route not found
            this.navigate('/');
        }
    }

    getCurrentRoute() {
        return this.currentRoute;
    }
}
