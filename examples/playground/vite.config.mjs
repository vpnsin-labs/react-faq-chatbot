import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Consume the REAL built artifact, exactly as a published consumer would import
// it — alias the package name + the styles subpath to the repo's dist/.
// Run `npm run build` in the repo root first.
const dist = (file) => fileURLToPath(new URL(`../../dist/${file}`, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@vpnsin-labs/react-faq-chatbot/styles.css', replacement: dist('styles.css') },
      { find: '@vpnsin-labs/react-faq-chatbot', replacement: dist('index.js') },
    ],
  },
  server: { port: 5173 },
});
