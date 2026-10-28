#!/usr/bin/env bash
# Installs Magic Look on macOS or Linux. Run: ./install.sh
set -e
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js غير مثبت."
  if [ "$(uname)" = "Darwin" ] && command -v brew >/dev/null 2>&1; then
    echo "تثبيت Node.js عبر Homebrew..."
    brew install node@22 && brew link --overwrite --force node@22
  else
    echo "ثبّت Node.js 22 (LTS) من https://nodejs.org ثم أعد تشغيل ./install.sh"
    exit 1
  fi
fi
exec node install.mjs "$@"
