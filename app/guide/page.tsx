import NavBar from "@/components/NavBar";
import Link from "next/link";

// Station settings come from the server environment so the guide always shows
// the real values. The source password is deliberately NOT here - it appears
// only on an approved show's page, so reading the guide never substitutes for
// having an approved slot.
export const dynamic = "force-dynamic";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-white">
        {n}
      </span>
      <div className="min-w-0">
        <p className="font-medium text-white">{title}</p>
        <div className="mt-1 text-sm leading-relaxed text-zinc-400">{children}</div>
      </div>
    </li>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-10 scroll-mt-20">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function GuidePage() {
  const host = process.env.STREAM_HOSTNAME || "radio.yuenhouse.org";
  const port = process.env.ICECAST_PORT || "8000";
  const mount = `/${process.env.ICECAST_LIVE_MOUNT || "live"}`;

  return (
    <div className="min-h-screen bg-zinc-950">
      <NavBar />
      <main className="mx-auto max-w-3xl px-6 py-8 pb-20">
        <h1 className="text-2xl font-bold text-white">DJ Guide</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Everything you need to get your show on Yuen House Radio — from zero
          to on air.
        </p>

        {/* table of contents */}
        <nav className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            On this page
          </p>
          <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            {[
              ["#how-it-works", "How the station works"],
              ["#setup", "One-time setup (Mixxx)"],
              ["#live", "Doing a live show"],
              ["#recorded", "Recording & uploading a show"],
              ["#settings", "Broadcast settings reference"],
              ["#quality", "Sound quality tips"],
              ["#rules", "House rules"],
              ["#troubleshooting", "Troubleshooting"],
            ].map(([href, label]) => (
              <li key={href}>
                <a href={href} className="text-zinc-300 hover:text-white">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <Section id="how-it-works" title="How the station works">
          <p className="text-sm leading-relaxed text-zinc-400">
            The station never stops. A 24/7 rotation plays whenever nothing
            else is scheduled. When your <em>recorded</em> show’s air time
            arrives, it takes over automatically. When you connect{" "}
            <em>live</em>, you outrank everything — the stream switches to you
            the moment your software connects, and hands back to the rotation
            when you disconnect. Nothing goes on air without Agustin approving
            it first, and nothing needs a human at the controls at 2am.
          </p>
          <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4 font-mono text-xs text-zinc-400">
            live DJ &nbsp;&gt;&nbsp; scheduled recorded show &nbsp;&gt;&nbsp;
            24/7 rotation
          </div>
        </Section>

        <Section id="setup" title="One-time setup (Mixxx)">
          <p className="mb-4 text-sm text-zinc-400">
            <a
              href="https://mixxx.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white underline underline-offset-2 hover:text-zinc-300"
            >
              Mixxx
            </a>{" "}
            is free DJ software (Mac, Windows, Linux) and it does everything
            this station needs: mixing, recording, and live broadcasting. You
            only have to set it up once.
          </p>
          <ol className="space-y-5">
            <Step n={1} title="Install Mixxx and point it at your music">
              Download it from mixxx.org, open it, and let it scan the folder
              where you keep your music. You mix with files on your own
              computer — the station never needs your library.
            </Step>
            <Step n={2} title="Learn the surface (30 minutes, tops)">
              Two decks, a crossfader, EQ knobs, headphone cueing. Load a
              track on each deck and practice blending one into the other.
              That skill is 90% of radio DJing.
            </Step>
            <Step n={3} title="Set your recording format">
              In <span className="text-zinc-200">Preferences → Recording</span>,
              choose MP3 at 320 kbps (or WAV if you have the disk space).
              This is what you’ll upload for recorded shows.
            </Step>
            <Step n={4} title="Enter the broadcast settings">
              In{" "}
              <span className="text-zinc-200">
                Preferences → Live Broadcasting
              </span>
              , fill in the values from the{" "}
              <a href="#settings" className="text-white underline underline-offset-2">
                reference below
              </a>
              . Leave it disabled for now — you only switch it on during an
              approved live slot.
            </Step>
          </ol>
        </Section>

        <Section id="live" title="Doing a live show">
          <ol className="space-y-5">
            <Step n={1} title="Request a slot">
              Go to{" "}
              <Link href="/shows/request" className="text-white underline underline-offset-2">
                Request Show
              </Link>
              , pick a date, time and length, give it a title. It lands in
              Agustin’s approval queue — you’ll get an email when it’s
              approved (or a note explaining why not).
            </Step>
            <Step n={2} title="Get your password">
              Open your approved show’s page (it’s on your{" "}
              <Link href="/dashboard" className="text-white underline underline-offset-2">
                Dashboard
              </Link>
              ). The <em>Mixxx Broadcast Settings</em> card there includes the
              source password — the one thing this guide leaves out on
              purpose.
            </Step>
            <Step n={3} title="At showtime, go live">
              Open Mixxx and turn on{" "}
              <span className="text-zinc-200">
                Options → Enable Live Broadcasting
              </span>
              . Within a few seconds the station switches to you. Start your
              first track <em>before</em> connecting if you don’t want dead
              air as your opener.
            </Step>
            <Step n={4} title="Confirm you're actually on">
              Check the{" "}
              <Link href="/dashboard" className="text-white underline underline-offset-2">
                Dashboard
              </Link>
              ’s On Air panel — it should show your stream within ~30
              seconds. Or just open the public stream in another tab (mute
              your monitors first: the stream runs a few seconds behind you).
            </Step>
            <Step n={5} title="Ending your show">
              Say goodbye, let the last track finish, then disable Live
              Broadcasting. The rotation takes back over automatically.
              Running long is fine only if nobody is scheduled after you —
              check the{" "}
              <Link href="/schedule" className="text-white underline underline-offset-2">
                Schedule
              </Link>
              .
            </Step>
          </ol>
        </Section>

        <Section id="recorded" title="Recording &amp; uploading a show">
          <ol className="space-y-5">
            <Step n={1} title="Record your mix in Mixxx">
              Hit <span className="text-zinc-200">Options → Record Mix</span>{" "}
              before your first track and stop it after your last. The file
              lands in your Mixxx recordings folder, in the format you set
              during setup.
            </Step>
            <Step n={2} title="Listen back once">
              Skim the start, a few transitions, and the end. Two minutes of
              checking saves airing a mix with a dead first minute.
            </Step>
            <Step n={3} title="Upload it and pick a slot">
              Go to{" "}
              <Link href="/shows/upload" className="text-white underline underline-offset-2">
                Upload
              </Link>
              , attach the file (MP3, WAV, FLAC, AAC or OGG — up to 500MB),
              give it a title, and request the date and time it should air.
            </Step>
            <Step n={4} title="Approval, then it airs itself">
              Once approved it appears on the public schedule, and at air
              time the station plays it automatically. You don’t need to be
              online, awake, or on this continent.
            </Step>
          </ol>
          <p className="mt-4 text-sm text-zinc-500">
            Your uploads live under{" "}
            <Link href="/shows/library" className="text-zinc-300 underline underline-offset-2">
              My Uploads
            </Link>
            ; past shows under{" "}
            <Link href="/shows/history" className="text-zinc-300 underline underline-offset-2">
              History
            </Link>
            .
          </p>
        </Section>

        <Section id="settings" title="Broadcast settings reference">
          <p className="mb-3 text-sm text-zinc-400">
            For <span className="text-zinc-200">Preferences → Live
            Broadcasting</span> in Mixxx (or any Icecast-capable tool — BUTT
            works great for mic-only shows):
          </p>
          <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-zinc-800">
                {[
                  ["Type", "Icecast 2"],
                  ["Host / Server", host],
                  ["Port", port],
                  ["Mount", mount],
                  ["Login", "source"],
                  ["Password", "on your approved show’s page"],
                  ["Format", "MP3, 192–320 kbps, stereo"],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td className="px-4 py-2.5 text-zinc-500">{k}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-zinc-200">
                      {v}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            The password is per-station, not per-DJ — please treat it like a
            key to the transmitter, because that’s literally what it is.
          </p>
        </Section>

        <Section id="quality" title="Sound quality tips">
          <ul className="space-y-2 text-sm leading-relaxed text-zinc-400">
            <li>
              <span className="text-zinc-200">Stay out of the red.</span>{" "}
              Keep the master meter peaking yellow. A hot signal distorts on
              the stream even when it sounds fine in your headphones.
            </li>
            <li>
              <span className="text-zinc-200">Mind your gain per track.</span>{" "}
              Quiet bedroom recordings next to loud club masters is the most
              common radio sin. Use each deck’s gain to even them out.
            </li>
            <li>
              <span className="text-zinc-200">Match your slot length.</span>{" "}
              A 60-minute slot with a 40-minute file means 20 minutes of
              rotation fills the rest; a 70-minute file gets cut off.
            </li>
            <li>
              <span className="text-zinc-200">Talking?</span> Get the mic
              close, kill background music in the room, and do a 30-second
              test recording first.
            </li>
          </ul>
        </Section>

        <Section id="rules" title="House rules">
          <ul className="space-y-2 text-sm leading-relaxed text-zinc-400">
            <li>Nothing airs without approval — that’s the whole system.</li>
            <li>
              Be on time for live slots. Ten minutes of dead air is ten
              minutes of rotation, which is fine — but your listeners came
              for you.
            </li>
            <li>
              Can’t make it? Cancel from your show’s page as early as you
              can so the slot can be reused.
            </li>
            <li>Don’t share the source password outside the DJ list.</li>
            <li>
              Keep it something you’d play with the house door open. It’s a
              house station — the house hears it.
            </li>
          </ul>
        </Section>

        <Section id="troubleshooting" title="Troubleshooting">
          <div className="space-y-4 text-sm leading-relaxed text-zinc-400">
            <div>
              <p className="font-medium text-zinc-200">
                Mixxx says it can’t connect
              </p>
              <p className="mt-1">
                Check, in order: is your show approved and is it your slot?
                Are host, port, mount and password exactly as shown on your
                show page (mount includes the slash)? Is Login set to{" "}
                <span className="font-mono text-xs">source</span>? Still
                stuck — some campus and coffee-shop networks block port{" "}
                {port}; try a phone hotspot to confirm, then find friendlier
                wifi.
              </p>
            </div>
            <div>
              <p className="font-medium text-zinc-200">
                I’m connected but the stream hasn’t switched to me
              </p>
              <p className="mt-1">
                Give it a few seconds and make sure a track is actually
                playing in Mixxx — connecting with nothing playing broadcasts
                silence, which is hard to distinguish from not working.
              </p>
            </div>
            <div>
              <p className="font-medium text-zinc-200">My upload fails</p>
              <p className="mt-1">
                The file must be MP3, WAV, FLAC, AAC or OGG and under 500MB.
                A two-hour WAV can blow past that — export as 320 kbps MP3
                instead (a two-hour show is then roughly 300MB).
              </p>
            </div>
            <div>
              <p className="font-medium text-zinc-200">
                My recorded show didn’t air
              </p>
              <p className="mt-1">
                Was it approved (check its status), and had the air time
                actually arrived? If both and it still didn’t play, tell
                Agustin — that’s a station problem, not a you problem.
              </p>
            </div>
            <div>
              <p className="font-medium text-zinc-200">Anything else</p>
              <p className="mt-1">Ask Agustin. Seriously, just ask.</p>
            </div>
          </div>
        </Section>
      </main>
    </div>
  );
}
