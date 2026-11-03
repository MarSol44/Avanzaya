#!/usr/bin/env bash
# Brújula de Vida — prepara la carpeta que se publica.
# No compila nada: solo copia los archivos de la web a dist/, para que no se
# publiquen la carpeta supabase/, la guía de configuración ni otros archivos
# que son solo para ti. Si añades un archivo que la web necesita, añádelo aquí.
#
# Cloudflare Workers: lo ejecuta «npx wrangler deploy» (ver wrangler.jsonc) y
# publica dist/. En el panel, Build command = bash build.sh.
set -euo pipefail

rm -rf dist
mkdir -p dist
cp index.html app.css sw.js manifest.webmanifest robots.txt sitemap.xml _headers dist/
cp -r js icons vendor dist/

echo "dist/ listo:"
ls dist
