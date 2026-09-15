const ICECAST_HOST = process.env.ICECAST_HOST || "127.0.0.1";
const ICECAST_PORT = process.env.ICECAST_PORT || "8000";
const ICECAST_ADMIN_PASSWORD = process.env.ICECAST_ADMIN_PASSWORD || "";

// The mount DJs connect their source client to (Mixxx, butt).
export const LIVE_MOUNT = process.env.ICECAST_LIVE_MOUNT || "live";
// The mount Liquidsoap publishes and listeners actually hear.
export const STREAM_MOUNT = process.env.ICECAST_MOUNT || "stream";

export interface IcecastMount {
  mount: string;
  listeners: number;
  title: string | null;
  serverName: string | null;
}

export interface IcecastStatus {
  reachable: boolean;
  /** True when a DJ's source client is connected to the live mount. */
  liveConnected: boolean;
  /** Listeners on the public stream mount. */
  listenerCount: number;
  currentTitle: string | null;
  mounts: IcecastMount[];
}

const normalize = (mount: string) => mount.replace(/^\//, "");

const tag = (block: string, name: string): string | null => {
  const m = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? m[1].trim() : null;
};

/**
 * Parse Icecast's /admin/stats.xml into one entry per connected mount.
 *
 * A mount only appears as a <source> element while a source client is actually
 * connected, which is what makes "is a DJ on air" answerable: Liquidsoap always
 * holds the stream mount open, so checking for *any* source is always true -
 * the live mount has to be looked at specifically.
 */
export function parseIcecastStats(xml: string): IcecastMount[] {
  const mounts: IcecastMount[] = [];
  const re = /<source\s+mount="([^"]+)">([\s\S]*?)<\/source>/g;

  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    const [, mount, block] = match;
    const listeners = tag(block, "listeners");

    mounts.push({
      mount: normalize(mount),
      listeners: listeners ? parseInt(listeners, 10) || 0 : 0,
      title: tag(block, "title") ?? tag(block, "yp_currently_playing"),
      serverName: tag(block, "server_name"),
    });
  }

  return mounts;
}

export async function getIcecastStatus(): Promise<IcecastStatus> {
  const offline: IcecastStatus = {
    reachable: false,
    liveConnected: false,
    listenerCount: 0,
    currentTitle: null,
    mounts: [],
  };

  try {
    const res = await fetch(`http://${ICECAST_HOST}:${ICECAST_PORT}/admin/stats.xml`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`admin:${ICECAST_ADMIN_PASSWORD}`).toString("base64")}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return offline;

    const mounts = parseIcecastStats(await res.text());
    const live = mounts.find((m) => m.mount === normalize(LIVE_MOUNT));
    const stream = mounts.find((m) => m.mount === normalize(STREAM_MOUNT));

    return {
      reachable: true,
      liveConnected: !!live,
      listenerCount: stream?.listeners ?? 0,
      // Prefer what the live DJ is sending, else whatever the stream reports
      currentTitle: live?.title ?? stream?.title ?? null,
      mounts,
    };
  } catch {
    return offline;
  }
}
