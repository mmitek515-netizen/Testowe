#!/usr/bin/env bash
# Build a real Debian 13 (trixie) Live/installer ISO on an amd64 Debian host.
# Validates source first; ISO creation only runs after explicit --build.
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LIVE_DIR="$ROOT/debian13/live"
WORK="$LIVE_DIR/work"
mode="${1:---check}"

check_sources() {
  local base="$LIVE_DIR/config"
  [[ -f "$base/package-lists/ai-linux.list.chroot" ]] || {
    echo "Missing Debian package list" >&2; exit 1;
  }
  [[ -f "$base/includes.chroot/usr/share/applications/ai-linux-control.desktop" ]] || {
    echo "Missing desktop launcher" >&2; exit 1;
  }
  [[ -f "$base/includes.chroot/usr/local/bin/ai-linux-start" ]] || {
    echo "Missing AI Linux bootstrap wrapper" >&2; exit 1;
  }
  grep -qx 'live-task-kde' "$base/package-lists/ai-linux.list.chroot"
  grep -qx 'docker-compose' "$base/package-lists/ai-linux.list.chroot"
  grep -q '^Exec=ai-linux-control$' "$base/includes.chroot/usr/share/applications/ai-linux-control.desktop"
  [[ -f "$ROOT/debian13/system/install.sh" && -f "$ROOT/docker-compose.yml" ]]
  bash -n "$base/includes.chroot/usr/local/bin/ai-linux-start"
  bash -n "$base/includes.chroot/usr/local/bin/ai-linux-control"
  bash -n "$base/includes.chroot/usr/local/bin/ai-linux-health"
  echo "CHECK OK: Debian 13 Live profile, launcher and AI Linux source are present."
}

case "$mode" in
  --check) check_sources; exit 0 ;;
  --build) ;;
  *) echo "Usage: $0 [--check|--build]" >&2; exit 2 ;;
esac
check_sources
[[ "$(id -u)" == 0 ]] || { echo "Run the build as root: sudo bash $0 --build" >&2; exit 1; }
[[ "$(dpkg --print-architecture)" == amd64 ]] || {
  echo "This ISO profile targets an amd64 builder." >&2; exit 1;
}
for cmd in lb debootstrap mksquashfs xorriso tar sha256sum; do
  command -v "$cmd" >/dev/null || {
    echo "Missing $cmd; on Debian 13 run: apt install live-build debootstrap squashfs-tools xorriso" >&2
    exit 1
  }
done
[[ ! -L "$WORK" ]] || { echo "Refusing symlinked build directory" >&2; exit 1; }
# Workdir is dedicated to this build, not to the user's repository.
rm -rf -- "$WORK"
mkdir -p "$WORK/config" "$WORK/config/includes.chroot/opt/ai-linux"
cp -a "$LIVE_DIR/config/." "$WORK/config/"
# GitHub contents API creates mode 0644 files; ensure desktop commands are
# executable in the actual chroot and on the installed system.
chmod 0755 "$WORK/config/includes.chroot/usr/local/bin/ai-linux-control" \
  "$WORK/config/includes.chroot/usr/local/bin/ai-linux-start" \
  "$WORK/config/includes.chroot/usr/local/bin/ai-linux-health"

# Include a reproducible repository SOURCE SNAPSHOT (not models, tokens, or caches).
# No automatic Docker, AI inference or privileged service is started at boot.
tar -C "$ROOT" \
  --exclude='./.git' --exclude='./.aistudio' --exclude='./.github' \
  --exclude='./.env' --exclude='./node_modules' --exclude='./dist' \
  --exclude='./build' --exclude='./debian13/live/work' --exclude='./.venv' \
  -cf - . | tar -C "$WORK/config/includes.chroot/opt/ai-linux" -xf -
# Disallow adding local credentials to the image, even if a new key file
# was created outside the standard .env name.
find "$WORK/config/includes.chroot/opt/ai-linux" -type f \
  \( -name '.env*' -o -name '*.pem' -o -name '*.key' -o -name 'id_rsa*' \) \
  ! -name '.env.example' -delete

cd "$WORK"
lb config \
  --distribution trixie \
  --architectures amd64 \
  --binary-images iso-hybrid \
  --debian-installer live \
  --archive-areas "main contrib non-free-firmware" \
  --bootappend-live "boot=live components locales=pl_PL.UTF-8 keyboard-layouts=pl hostname=ai-linux"
lb build 2>&1 | tee "$WORK/build.log"

iso="$(find "$WORK" -maxdepth 1 -type f -name '*.iso' -print -quit)"
[[ -n "$iso" && -s "$iso" ]] || { echo "ISO not produced; inspect $WORK/build.log" >&2; exit 1; }
sha256sum "$iso" > "$iso.sha256"
echo "ISO generated: $iso"
echo "SHA256: $iso.sha256"
echo "Next: verify boot, KDE login, disk install, network, Docker and SPAA in a VM."
