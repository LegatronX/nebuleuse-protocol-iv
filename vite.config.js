// ============================================================
// Nébuleuse Protocol IV
// © 2026 Christian ROLANDO — Tous droits réservés.
// Voir le fichier LICENSE à la racine du dépôt.
// ============================================================
// vite.config.js — le plugin PWA régénère un manifest propre
// (le vôtre contenait des clés mal formées ; il sera remplacé avantageusement)
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',                 // cohérent avec votre scope "./"
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Nébuleuse Protocol IV',
        short_name: 'Nébuleuse IV',
        description: "Shoot 'em up vertical — progression permanente, mini-boss, élites, boss final.",
        theme_color: '#020409',
        background_color: '#020409',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
});