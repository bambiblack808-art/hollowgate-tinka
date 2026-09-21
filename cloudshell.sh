#!/usr/bin/env bash
# Paste this in Google Cloud Shell from ANY directory (including ~).
set -euo pipefail
RAW="https://raw.githubusercontent.com/bambiblack808-art/hollowgate-tinka/main/hollowgate-cloud.mjs"
curl -fsSL "$RAW" -o "$HOME/hollowgate-cloud.mjs"
chmod +x "$HOME/hollowgate-cloud.mjs"
echo "Node $(node -v)"
node "$HOME/hollowgate-cloud.mjs" --iters "${1:-12}" --seed "${2:-15}"
