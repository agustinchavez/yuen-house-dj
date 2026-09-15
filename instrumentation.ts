// Next.js calls register() once when the server starts. This is the only place
// the broadcast scheduler gets booted - if this file is removed or the runtime
// check fails, recorded shows silently never go to air.
export async function register() {
  // Skip the edge runtime: node-cron and the Liquidsoap socket are Node-only.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { startScheduler } = await import("./lib/scheduler");
  startScheduler();
}
