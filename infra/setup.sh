#!/usr/bin/env bash
#
# Yuen House Radio - one-time provisioning for a fresh Debian/Ubuntu VPS.
# Run as root:   sudo bash infra/setup.sh
#
# Idempotent: safe to re-run to re-render configs after changing infra.env.

set -euo pipefail

RADIO_ROOT="${RADIO_ROOT:-/srv/radio}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ $EUID -ne 0 ]]; then
  echo "Run as root: sudo bash infra/setup.sh" >&2
  exit 1
fi

# --- configuration ---------------------------------------------------------
# Values come from infra/infra.env, which is gitignored and holds the passwords.
if [[ ! -f "$HERE/infra.env" ]]; then
  echo "Missing $HERE/infra.env - copy infra.env.example and fill it in." >&2
  exit 1
fi
set -a; source "$HERE/infra.env"; set +a

: "${ICECAST_SOURCE_PASSWORD:?must be set in infra.env}"
: "${ICECAST_ADMIN_PASSWORD:?must be set in infra.env}"
: "${DASHBOARD_HOSTNAME:?must be set in infra.env}"
: "${STREAM_HOSTNAME:?must be set in infra.env}"

export RADIO_ROOT
export ICECAST_PORT="${ICECAST_PORT:-8000}"
export ICECAST_MOUNT="${ICECAST_MOUNT:-stream}"
export LIQUIDSOAP_PORT="${LIQUIDSOAP_PORT:-1234}"
export HARBOR_PORT="${HARBOR_PORT:-8005}"
export FALLBACK_DIR="${FALLBACK_DIR:-$RADIO_ROOT/fallback}"
export ICECAST_ADMIN_EMAIL="${ICECAST_ADMIN_EMAIL:-admin@yuenhouse.org}"

echo "==> Installing packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq icecast2 liquidsoap ffmpeg caddy gettext-base curl

echo "==> Creating radio user and directories"
id -u radio &>/dev/null || useradd --system --home "$RADIO_ROOT" --shell /usr/sbin/nologin radio
mkdir -p "$RADIO_ROOT"/{config,uploads,archive,fallback,log,db,app}
chown -R radio:radio "$RADIO_ROOT"

echo "==> Rendering configs"
render() { envsubst < "$1" > "$2"; }

render "$HERE/liquidsoap/radio.liq.template" "$RADIO_ROOT/config/radio.liq"
render "$HERE/icecast/icecast.xml.template"  /etc/icecast2/icecast.xml
render "$HERE/caddy/Caddyfile.template"      /etc/caddy/Caddyfile

# These files contain the source password in plaintext - there is no way around
# that, Icecast and Liquidsoap both need it - so lock them down.
chmod 600 "$RADIO_ROOT/config/radio.liq" /etc/icecast2/icecast.xml
chown radio:radio "$RADIO_ROOT/config/radio.liq"
chown icecast2:icecast /etc/icecast2/icecast.xml

echo "==> Installing systemd units"
cp "$HERE/systemd/yuen-liquidsoap.service" "$HERE/systemd/yuen-dashboard.service" /etc/systemd/system/
systemctl daemon-reload

echo "==> Enabling Icecast"
sed -i 's/^ENABLE=.*/ENABLE=true/' /etc/default/icecast2 2>/dev/null || true
systemctl enable --now icecast2
systemctl restart icecast2

echo "==> Validating the Liquidsoap script before starting it"
if ! sudo -u radio liquidsoap --check "$RADIO_ROOT/config/radio.liq"; then
  echo "Liquidsoap config failed to parse - not starting the service." >&2
  exit 1
fi

echo "==> Starting Liquidsoap and Caddy"
systemctl enable --now yuen-liquidsoap
systemctl restart yuen-liquidsoap
systemctl enable --now caddy
systemctl reload caddy

cat <<EOF

Done.

  Stream      https://${STREAM_HOSTNAME}/${ICECAST_MOUNT}
  Dashboard   https://${DASHBOARD_HOSTNAME}   (deploy the app to $RADIO_ROOT/app first)
  Mixxx       host ${STREAM_HOSTNAME}  port ${HARBOR_PORT}  mount live

Next:
  1. Drop some MP3s in $FALLBACK_DIR so the automated hours are not silent.
  2. Deploy the dashboard, then: systemctl enable --now yuen-dashboard
  3. Check it:  curl -s https://${STREAM_HOSTNAME}/status-json.xsl | head

EOF
