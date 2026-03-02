export interface IcecastStatus {
  listener_count: number;
  source_connected: boolean;
  current_title: string | null;
}

export async function getIcecastStatus(): Promise<IcecastStatus> {
  const host = process.env.ICECAST_HOST || "localhost";
  const port = process.env.ICECAST_PORT || "8000";
  const password = process.env.ICECAST_ADMIN_PASSWORD || "";

  try {
    const res = await fetch(
      `http://${host}:${port}/admin/stats.xml`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`admin:${password}`).toString("base64")}`,
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return { listener_count: 0, source_connected: false, current_title: null };
    }

    const xml = await res.text();

    const listenersMatch = xml.match(/<listeners>(\d+)<\/listeners>/);
    const sourceMatch = xml.match(/<source mount="[^"]*">/);
    const titleMatch = xml.match(/<title>([^<]*)<\/title>/);

    return {
      listener_count: listenersMatch ? parseInt(listenersMatch[1], 10) : 0,
      source_connected: !!sourceMatch,
      current_title: titleMatch ? titleMatch[1] : null,
    };
  } catch {
    return { listener_count: 0, source_connected: false, current_title: null };
  }
}
