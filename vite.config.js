import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        proxy: {
            '/poly-pizza-proxy': {
                target: 'https://poly.pizza',
                changeOrigin: true,
                secure: false, // Bypass SSL verification if needed
                rewrite: (path) => path.replace(/^\/poly-pizza-proxy/, ''),
                configure: (proxy, options) => {
                    proxy.on('error', (err, req, res) => {
                        console.log('proxy error', err);
                    });
                    proxy.on('proxyReq', (proxyReq, req, res) => {
                        // Poly.pizza requires Accept header, and often dislikes missing User-Agents
                        proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
                        proxyReq.setHeader('Accept', 'application/json');
                    });
                }
            }
        }
    }
});
