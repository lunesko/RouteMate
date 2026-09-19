#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
output_dir="$project_dir/dist"
archive="$output_dir/routemate-extension-v0.4.0.zip"
source_archive="$output_dir/RouteMate-field-workspace-source-v0.4.0.zip"

mkdir -p "$output_dir"
rm -f "$archive" "$source_archive"
cd "$project_dir"
zip -qr "$archive" manifest.json service-worker.js content shared sidepanel assets \
  -x 'assets/icon.svg'
zip -qr "$source_archive" . \
  -x 'dist/*' '.git/*' 'node_modules/*'
unzip -tq "$archive"
unzip -tq "$source_archive"
echo "$archive"
echo "$source_archive"
