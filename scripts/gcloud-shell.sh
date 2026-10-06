#!/usr/bin/env bash
# Hollowgate on Google Cloud Shell — works from HOME, no package.json required.
# Usage: bash <(curl -fsSL https://raw.githubusercontent.com/bambiblack808-art/hollowgate-tinka/main/cloudshell.sh)
set -euo pipefail
RAW="https://raw.githubusercontent.com/bambiblack808-art/hollowgate-tinka/main/hollowgate-cloud.mjs"
curl -fsSL "$RAW" -o "$HOME/hollowgate-cloud.mjs"
chmod +x "$HOME/hollowgate-cloud.mjs"
echo "==> Node $(node -v)"
echo "==> Tinka evolve (real engine)"
exec node "$HOME/hollowgate-cloud.mjs" --iters "${1:-12}" --seed "${2:-15}"
