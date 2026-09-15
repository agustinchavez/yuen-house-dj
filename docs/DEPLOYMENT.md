# Deploying Yuen House Radio

The station runs on a single small Linux VPS. One box holds Icecast (the
streaming server), Liquidsoap (the broadcast chain), Caddy (TLS), and this
dashboard.

## What it costs

Bandwidth is the only variable that matters. At 128 kbps one listener-hour is
about **58 MB**, so a 1 TB/month allowance is roughly **17,000 listener-hours** —
about 23 people streaming around the clock, or far more for a station that is
only busy during shows.

A 2 GB VPS from Hetzner, DigitalOcean, Vultr or Linode at **$6–12/month** is
enough. 1 GB works at runtime but `next build` will likely run out of memory —
build locally and copy the output, or take the 2 GB.

## Before you start

Two DNS **A records**, both pointing at the server's IP:

| Host | Serves |
| --- | --- |
| `dj.yuenhouse.org` | this dashboard |
| `radio.yuenhouse.org` | the public stream, and the port DJs connect to |

## Provisioning

```bash
git clone https://github.com/agustinchavez/yuen-house-dj.git
cd yuen-house-dj
cp infra/infra.env.example infra/infra.env
# fill in the hostnames and generate the two passwords:
#   openssl rand -base64 24
sudo bash infra/setup.sh
```

`setup.sh` is idempotent — re-run it after editing `infra.env` to re-render the
configs. It validates the Liquidsoap script with `liquidsoap --check` before
starting anything, so a bad config fails during provisioning rather than as dead
air at 8pm.

## Deploying the dashboard

```bash
npm ci && npm run build          # build here or locally
sudo rsync -a --delete ./ /srv/radio/app/
sudo cp .env /srv/radio/config/dashboard.env   # see .env.example
sudo systemctl enable --now yuen-dashboard
```

Point `DATABASE_URL` at `/srv/radio/db/dashboard.db`, and `UPLOADS_DIR` /
`ARCHIVE_DIR` / `FALLBACK_DIR` at the matching `/srv/radio/*` directories.

Then seed the first admin so you can log in:

```bash
cd /srv/radio/app && npx prisma migrate deploy && npx tsx prisma/seed.ts
```

**Change the seeded password immediately** — `prisma/seed.ts` ships a known one.

## How audio actually flows

```
DJ (Mixxx) ──► Icecast /live ──┐
                               ├──► Liquidsoap ──► Icecast /stream ──► Caddy ──► listeners
recorded show (scheduler) ─────┤        (picks highest priority)
automated fallback playlist ───┘
```

Priority is **live DJ > scheduled recorded show > automated playlist**, and
`mksafe` guarantees the stream never goes silent.

Two things follow from this shape:

- **Live audio goes through Icecast, not Liquidsoap's harbor.** That is what
  makes "is a DJ on air" answerable: the `/live` mount exists in Icecast's stats
  only while a source client is connected. Checking for *any* Icecast source
  would always be true, because Liquidsoap holds `/stream` open permanently.
- **Icecast listens on `0.0.0.0`** so Mixxx can reach it — source clients speak
  plain Icecast protocol and cannot go through Caddy's TLS. Listeners still
  arrive over HTTPS via Caddy. Restrict the port at the firewall if you can.

## DJ broadcast settings

Shown on each approved live show's page, driven by `STREAM_HOSTNAME`,
`ICECAST_PORT` and `ICECAST_LIVE_MOUNT`:

| Field | Value |
| --- | --- |
| Server | `radio.yuenhouse.org` |
| Port | `8000` |
| Mount | `/live` |
| Password | `ICECAST_SOURCE_PASSWORD` |

## Checks

```bash
systemctl status icecast2 yuen-liquidsoap yuen-dashboard caddy
curl -s https://radio.yuenhouse.org/status-json.xsl | head   # stream alive
journalctl -u yuen-dashboard -f | grep scheduler             # scheduler ticking
```

The dashboard should log `[scheduler] Broadcast scheduler started` on boot. If
it does not, recorded shows will never air even though the stream sounds fine.

## When something is wrong

Run the preflight first — it names the broken link instead of making you guess:

```bash
cd /srv/radio/app && npm run check:broadcast
```

It checks the database, Icecast reachability, whether anything is publishing to
the stream mount, whether Liquidsoap answers, **whether the queue name actually
exists in the running Liquidsoap**, that the fallback directory has audio in it,
and that ffprobe is on PATH. Exit code is non-zero if anything failed.

### The Liquidsoap config will not parse

`setup.sh` refuses to start anything in this case, so the server is fine — only
the file needs fixing. Almost always a syntax difference between Liquidsoap
versions; `setup.sh` prints the installed version when it runs.

```bash
sudo -u radio liquidsoap --check /srv/radio/config/radio.liq
```

To bisect, comment out the `live` source and its entry in the `fallback` list.
If it then parses, the problem is `input.http`; if not, it is the rest of the
chain. Edit the **template** in `infra/liquidsoap/`, then re-run `setup.sh` —
the rendered file is overwritten each time.

### The stream is silent

In order: is anything in `FALLBACK_DIR`? Is `yuen-liquidsoap` running? Does
Icecast list the stream mount?

```bash
systemctl status yuen-liquidsoap
tail -50 /srv/radio/log/liquidsoap.log
curl -s -u admin:PASSWORD http://127.0.0.1:8000/admin/stats.xml | grep mount
```

### A DJ cannot connect

Their source client needs the **plain** port, not HTTPS — Mixxx cannot go
through Caddy's TLS. Confirm port 8000 is reachable from outside
(`nc -vz radio.yuenhouse.org 8000`) and that they are using mount `/live` with
the source password.

### Recorded shows never air

The scheduler runs inside the dashboard process, not Liquidsoap. Check it
booted:

```bash
journalctl -u yuen-dashboard | grep scheduler
```

You want `[scheduler] Broadcast scheduler started`. If it is absent, the
dashboard is down or `instrumentation.ts` did not run.

## Gotchas

- **`LIQUIDSOAP_QUEUE` must match the `request.queue` id in `radio.liq`.** The
  queue id *is* the telnet command prefix. A mismatch is invisible until air
  time, when the push is rejected as an unknown command.
- **Put files in `FALLBACK_DIR` before going live**, or the automated hours are
  silence. Liquidsoap watches the directory and picks up new files without a
  restart.
- **The scheduler only runs inside the dashboard process.** If `yuen-dashboard`
  is down, Icecast and Liquidsoap stay perfectly healthy and no recorded show
  goes to air.
- **On first run the completion sweep will close out old shows** whose scheduled
  end has passed. That is expected — nothing had ever written `COMPLETED` before.
