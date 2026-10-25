#!/usr/bin/env bash
# Brújula de Vida — prepara la carpeta que publica Cloudflare Pages.
# No compila nada: solo copia los archivos de la web a dist/, para que no se
# publiquen la carpeta supabase/, la guía de configuración ni otros archivos
# que son solo para ti.
#
# En Cloudflare Pages:  Build command = bash build.sh   ·   Build output directory = dist
set -euo pipefail

rm -rf dist
mkdir -p dist
cp index.html app.css app.js frases.js pwa.js sync.js sw.js \
   manifest.webmanifest robots.txt sitemap.xml _headers dist/
cp -r icons vendor dist/

echo "dist/ listo:"
ls dist
