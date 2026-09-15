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

: "${DASHBOARD_HOSTNAME:?must be set in infra.env}"
: "${STREAM_HOSTNAME:?must be set in infra.env}"

# Blank secrets are generated once and written back into infra.env, so re-runs
# keep the same values and the operator never has to invent passwords.
ensure_secret() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    local value; value="$(openssl rand -hex 24)"
    printf -v "$name" '%s' "$value"
    if grep -q "^${name}=" "$HERE/infra.env"; then
      sed -i "s|^${name}=.*|${name}=${value}|" "$HERE/infra.env"
    else
      echo "${name}=${value}" >> "$HERE/infra.env"
    fi
    echo "==> Generated ${name} (stored in infra/infra.env)"
  fi
  export "$name"
}
ensure_secret ICECAST_SOURCE_PASSWORD
ensure_secret ICECAST_ADMIN_PASSWORD
ensure_secret NEXTAUTH_SECRET

export RADIO_ROOT
export ICECAST_PORT="${ICECAST_PORT:-8000}"
export ICECAST_MOUNT="${ICECAST_MOUNT:-stream}"
export LIQUIDSOAP_PORT="${LIQUIDSOAP_PORT:-1234}"
export ICECAST_LIVE_MOUNT="${ICECAST_LIVE_MOUNT:-live}"
export FALLBACK_DIR="${FALLBACK_DIR:-$RADIO_ROOT/fallback}"
export ICECAST_ADMIN_EMAIL="${ICECAST_ADMIN_EMAIL:-admin@yuenhouse.org}"

echo "==> Installing packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
  ca-certificates curl gnupg apt-transport-https \
  debian-keyring debian-archive-keyring \
  software-properties-common gettext-base

# liquidsoap lives in Ubuntu's universe component, which is not always enabled
if command -v add-apt-repository >/dev/null 2>&1 && grep -qi ubuntu /etc/os-release; then
  add-apt-repository -y universe >/dev/null 2>&1 || true
fi

# Caddy is NOT in the Debian/Ubuntu archives - its own repository has to be
# added first, or the install below fails on a stock box.
if [[ ! -f /etc/apt/sources.list.d/caddy-stable.list ]]; then
  echo "==> Adding the Caddy repository"
  curl -1sLf "https://dl.cloudsmith.io/public/caddy/stable/gpg.key" \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf "https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt" \
    > /etc/apt/sources.list.d/caddy-stable.list
fi

apt-get update -qq
apt-get install -y -qq icecast2 liquidsoap ffmpeg caddy

# Node.js for the dashboard. Distro packages lag well behind what Next.js 16
# needs, so take it from NodeSource.
if ! command -v node >/dev/null 2>&1 || [[ "$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)" -lt 20 ]]; then
  echo "==> Installing Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs
fi
echo "==> Installed: node $(node --version 2>/dev/null || echo MISSING)"

# Record what we actually got: the .liq syntax is version sensitive, and this is
# the first thing to check if the config fails to parse.
echo "==> Installed: $(liquidsoap --version 2>&1 | head -1)"
echo "==> Installed: $(icecast2 -v 2>&1 | head -1 || echo icecast2)"

# next build needs more memory than a small VPS has; swap makes 1-2GB boxes safe
if [[ ! -f /swapfile ]] && [[ -z "$(swapon --show --noheadings 2>/dev/null)" ]] \
   && (( $(free -m | awk '/^Mem:/{print $2}') < 3000 )); then
  echo "==> Adding a 2G swapfile (RAM is under 3GB)"
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q "^/swapfile" /etc/fstab || echo "/swapfile none swap sw 0 0" >> /etc/fstab
fi

echo "==> Creating radio user and directories"
id -u radio &>/dev/null || useradd --system --home "$RADIO_ROOT" --shell /usr/sbin/nologin radio
mkdir -p "$RADIO_ROOT"/{config,uploads,archive,fallback,log,db,app}
chown -R radio:radio "$RADIO_ROOT"

echo "==> Rendering configs"
render() { envsubst < "$1" > "$2"; }

render "$HERE/liquidsoap/radio.liq.template" "$RADIO_ROOT/config/radio.liq"
render "$HERE/icecast/icecast.xml.template"  /etc/icecast2/icecast.xml
render "$HERE/caddy/Caddyfile.template"      /etc/caddy/Caddyfile
render "$HERE/dashboard.env.template"        "$RADIO_ROOT/config/dashboard.env"

# Optional SMTP settings pass straight through to the app
if [[ -n "${SMTP_HOST:-}" ]]; then
  {
    echo ""
    echo "# SMTP (from infra.env)"
    for v in SMTP_HOST SMTP_PORT SMTP_SECURE SMTP_USER SMTP_PASS SMTP_FROM; do
      [[ -n "${!v:-}" ]] && echo "$v=${!v}"
    done
  } >> "$RADIO_ROOT/config/dashboard.env"
fi

# These files contain the source password in plaintext - there is no way around
# that, Icecast and Liquidsoap both need it - so lock them down.
chmod 600 "$RADIO_ROOT/config/radio.liq" /etc/icecast2/icecast.xml "$RADIO_ROOT/config/dashboard.env"
chown radio:radio "$RADIO_ROOT/config/radio.liq" "$RADIO_ROOT/config/dashboard.env"
chown icecast2:icecast /etc/icecast2/icecast.xml

echo "==> Installing systemd units"
cp "$HERE/systemd/yuen-liquidsoap.service" /etc/systemd/system/

# Resolve npm's real path rather than assuming /usr/bin - NodeSource and nvm
# put it elsewhere, and systemd needs an absolute ExecStart.
NPM_PATH="$(command -v npm || echo /usr/bin/npm)"
sed "s|ExecStart=/usr/bin/npm|ExecStart=${NPM_PATH}|" \
  "$HERE/systemd/yuen-dashboard.service" > /etc/systemd/system/yuen-dashboard.service

systemctl daemon-reload

echo "==> Enabling Icecast"
sed -i 's/^ENABLE=.*/ENABLE=true/' /etc/default/icecast2 2>/dev/null || true
systemctl enable --now icecast2
systemctl restart icecast2

echo "==> Validating the Liquidsoap script before starting it"
if ! sudo -u radio liquidsoap --check "$RADIO_ROOT/config/radio.liq"; then
  cat >&2 <<'EOT'

The Liquidsoap config did not parse, so nothing was started. Nothing is broken
on the server - only this file needs fixing.

Most likely a syntax difference between Liquidsoap versions. Check the version
printed above against the syntax in infra/liquidsoap/radio.liq.template, then:

  sudo -u radio liquidsoap --check /srv/radio/config/radio.liq   # re-check
  sudo bash infra/setup.sh                                        # re-run

To narrow it down, comment out the `live` source and the fallback list entry
that uses it: that isolates whether the problem is input.http or the rest of
the chain.
EOT
  exit 1
fi

echo "==> Starting Liquidsoap and Caddy"
systemctl enable --now yuen-liquidsoap
systemctl restart yuen-liquidsoap
systemctl enable --now caddy
systemctl reload caddy

echo "==> Building the dashboard"
REPO_ROOT="$(cd "$HERE/.." && pwd)"
(cd "$REPO_ROOT" && npm ci --no-audit --no-fund && npm run build)

echo "==> Deploying the dashboard to $RADIO_ROOT/app"
# The database, uploads and config all live OUTSIDE app/, so --delete here can
# never touch station data. Local dev files (.env, dev.db, data/) stay behind.
#
# Every exclude is anchored with a leading slash: an unanchored rsync pattern
# matches at ANY depth, and "data" once silently stripped
# node_modules/@prisma/studio-core/dist/data/ out of the deploy.
rsync -a --delete \
  --exclude "/.git" --exclude "/.env" --exclude "/.env.*" \
  --exclude "/dev.db" --exclude "/data" --exclude "/infra/infra.env" \
  "$REPO_ROOT"/ "$RADIO_ROOT/app/"
chown -R radio:radio "$RADIO_ROOT/app"

echo "==> Migrating the database and ensuring an admin exists"
sudo -u radio bash -c '
  set -e
  set -a; source "'"$RADIO_ROOT"'/config/dashboard.env"; set +a
  cd "'"$RADIO_ROOT"'/app"
  npx prisma migrate deploy
  npx tsx prisma/seed.ts
'

echo "==> Starting the dashboard"
systemctl enable --now yuen-dashboard
systemctl restart yuen-dashboard

cat <<EOF

Done. The station is running.

  Stream      https://${STREAM_HOSTNAME}/${ICECAST_MOUNT}
  Dashboard   https://${DASHBOARD_HOSTNAME}
  Mixxx       host ${STREAM_HOSTNAME}  port ${ICECAST_PORT}  mount /${ICECAST_LIVE_MOUNT}
              (the source password is shown to each DJ on their show page)

If the seed created your admin account, its password was printed ONCE above -
scroll up and save it now.

If a firewall is active (ufw), open 80, 443 and ${ICECAST_PORT}:
  ufw allow 80,443,${ICECAST_PORT}/tcp

Last two steps:
  1. Drop MP3s into ${FALLBACK_DIR} - until then, unclaimed hours are silence.
  2. Verify everything:  cd $RADIO_ROOT/app && npm run check:broadcast

To deploy changes later:  git pull && sudo bash infra/setup.sh
EOF
