#!/usr/bin/env bash
set -e

git add .
git commit -m "feat: initial bill-tracker MVP"
git branch -M main
git push -u origin main
echo "✅ Pushed to GitHub main branch"
