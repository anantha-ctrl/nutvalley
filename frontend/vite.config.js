import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,    // expose on the local network (0.0.0.0) so phones/other devices can connect
    // Pin a dedicated port. JWTs live in localStorage, which is PER-ORIGIN
    // (per-port). If Vite fell back to another port (e.g. 5174 when 5173 was
    // taken by another app), the saved token would be orphaned and every admin
    // call would 401. strictPort makes startup fail loudly instead of silently
    // moving ports, so the origin — and your session — stays stable.
    port: 5190,
    strictPort: true,
    open: true,
  },
});
