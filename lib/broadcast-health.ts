import type { IcecastStatus } from "./icecast";

// Shared shape for /api/admin/stats. The route and the admin page both import
// this, so a change to one without the other is a type error rather than a
// field that silently renders as undefined.

export interface OnAirShow {
  id: string;
  title: string;
  djName: string;
  showType: string;
  status: string;
  scheduledEnd: string;
}

export interface NextShow {
  id: string;
  title: string;
  djName: string;
  showType: string;
  scheduledStart: string;
}

export interface BroadcastStats {
  checkedAt: string;
  icecast: IcecastStatus;
  liquidsoap: { reachable: boolean };
  mountNames: { live: string; stream: string };
  shows: {
    byStatus: Record<string, number>;
    onAir: OnAirShow[];
    next: NextShow | null;
  };
  warnings: string[];
}

export interface HealthInput {
  icecast: IcecastStatus;
  liquidsoapReachable: boolean;
  onAir: Pick<OnAirShow, "showType" | "status">[];
  liveMount: string;
  streamMount: string;
}

/**
 * Turn raw service state into operator-facing warnings.
 *
 * The point is to catch disagreements between what the database believes and
 * what is actually streaming. Those are silent otherwise: a show sits in
 * BROADCASTING while Liquidsoap is unreachable, and the schedule looks
 * perfectly healthy while listeners hear nothing.
 */
export function buildWarnings({
  icecast,
  liquidsoapReachable,
  onAir,
  liveMount,
  streamMount,
}: HealthInput): string[] {
  const warnings: string[] = [];

  if (!icecast.reachable) {
    warnings.push("Icecast is unreachable. Nothing is being served to listeners.");
  }

  if (!liquidsoapReachable) {
    warnings.push(
      "Liquidsoap is unreachable. Recorded shows cannot be queued, so scheduled " +
        "shows will not go to air."
    );
  }

  if (icecast.reachable && !icecast.mounts.some((m) => m.mount === streamMount)) {
    warnings.push(
      `Icecast is up but nothing is publishing to /${streamMount}. Listeners hear ` +
        "silence - check that Liquidsoap is running."
    );
  }

  // Only meaningful when Icecast answered: an unreachable Icecast tells us
  // nothing about who is on air, and must not read as "the DJ left".
  if (icecast.reachable && !icecast.liveConnected) {
    const live = onAir.filter((s) => s.showType === "LIVE");
    if (live.length > 0) {
      warnings.push(
        `${live.length} show(s) marked LIVE but no DJ is connected to /${liveMount}.`
      );
    }
  }

  if (!liquidsoapReachable) {
    const recorded = onAir.filter((s) => s.showType === "RECORDED");
    if (recorded.length > 0) {
      warnings.push(
        `${recorded.length} show(s) marked BROADCASTING but Liquidsoap cannot be reached.`
      );
    }
  }

  return warnings;
}
