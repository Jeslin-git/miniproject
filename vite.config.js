import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: 'index.html',
                dashboard: 'index-dashboard.html',
                workspace: 'workspace.html',
            },
        },
    },
    server: {
        proxy: {
            '/api/polypizza': {
                target: 'https://api.poly.pizza',
                changeOrigin: true,
                secure: false, // In case of local dev CA issues
                rewrite: (path) => path.replace(/^\/api\/polypizza/, '')
            }
        }
    }
});