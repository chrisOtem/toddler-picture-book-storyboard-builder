import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/toddler-picture-book-storyboard-builder/' : '/',
  plugins: [react(), tailwindcss()],
  preview: {
    allowedHosts: ['4173-ihtxy4z9hhx26hbr64atq-5d94780e.us2.manus.computer'],
  },
});
