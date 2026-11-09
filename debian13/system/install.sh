#!/bin/sh
# Install Debian 13 platform API and SPAA daemon on a real Debian 13 host.
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root (sudo ./install.sh)." >&2
  exit 1
fi
SOURCE_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PYTHON=$(command -v python3 || true)
if [ -z "$PYTHON" ]; then
  echo "Python 3 is required." >&2
  exit 1
fi
SPAA_SOURCE="$SOURCE_DIR/../../integrations/agent-rest/agent_rest.py"
if [ ! -f "$SPAA_SOURCE" ]; then
  echo "SPAA source missing. Install from full Testowe checkout." >&2
  exit 1
fi
if ! getent group debian13 >/dev/null 2>&1; then
  addgroup --system debian13
fi
if ! getent passwd debian13 >/dev/null 2>&1; then
  adduser --system --ingroup debian13 --home /var/lib/debian13 \
    --no-create-home --shell /usr/sbin/nologin debian13
fi

install -d -o root -g root -m 0755 /usr/local/lib/debian13/system
for module in server.py work_store.py original_agents.py alex_bridge.py alex_handoff.py mcp_server.py readiness.py; do
  install -o root -g root -m 0644 "$SOURCE_DIR/$module" "/usr/local/lib/debian13/system/$module"
done
install -o root -g root -m 0644 "$SPAA_SOURCE" /usr/local/lib/debian13/system/spaa_daemon.py
install -d -o debian13 -g debian13 -m 0750 /var/lib/debian13/workspace
install -d -o root -g debian13 -m 0750 /etc/debian13

if [ ! -e /etc/debian13/system.env ]; then
  token=$("$PYTHON" -c 'import secrets; print(secrets.token_urlsafe(48))')
  umask 027
  {
    printf 'DEBIAN13_API_TOKEN=%s\n' "$token"
    printf 'MODEL_CHAT_URL=\nMODEL_API_KEY=\nMODEL_NAME=\n'
  } > /etc/debian13/system.env
fi
if ! grep -Eq '^AGENT_API_TOKEN=[[:graph:]]{32,}$' /etc/debian13/system.env; then
  sed -i '/^AGENT_API_TOKEN=/d' /etc/debian13/system.env
  token=$("$PYTHON" -c 'import secrets; print(secrets.token_urlsafe(48))')
  printf 'AGENT_API_TOKEN=%s\n' "$token" >> /etc/debian13/system.env
fi
chown root:debian13 /etc/debian13/system.env
chmod 0640 /etc/debian13/system.env

install -o root -g root -m 0644 "$SOURCE_DIR/systemd/debian13-system.service" \
  /etc/systemd/system/debian13-system.service
install -o root -g root -m 0644 "$SOURCE_DIR/systemd/testowe-spaa.service" \
  /etc/systemd/system/testowe-spaa.service
systemctl daemon-reload
systemctl enable --now debian13-system.service testowe-spaa.service

echo "Debian 13 platform API and SPAA daemon installed."
echo "Local API: http://127.0.0.1:8080; SPAA: http://127.0.0.1:8091"
echo "Keep /etc/debian13/system.env private."
