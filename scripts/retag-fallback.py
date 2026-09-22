#!/usr/bin/env python3
"""Tag the 24/7 library from filenames, enriched with artists from YouTube.

Run ON THE SERVER, once:  sudo python3 scripts/retag-fallback.py [archive.txt]

Why this exists: files ripped with yt-dlp carry no ID3 tags, and Liquidsoap
only updates the stream title when a track HAS one - so the radio dial froze
on the last tagged song ever played.

What it does, per "NNN - Title.mp3" file in the fallback directory:
  - title  <- from the filename (always)
  - artist <- from YouTube oEmbed for the Nth video id in the archive file,
              but ONLY if that video's title actually matches this filename.
              A shuffled or partial archive degrades to "no artist", never to
              a wrong one.
Files without the "NNN - " prefix (e.g. hand-uploaded, already tagged) are
left untouched. Safe to re-run.
"""
import json
import os
import pwd
import re
import subprocess
import sys
import time
import urllib.request

FALLBACK_DIR = os.environ.get("FALLBACK_DIR", "/srv/radio/fallback")
ARCHIVE = sys.argv[1] if len(sys.argv) > 1 else "/root/archive.txt"

def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", s.lower())

def oembed_lookup(video_id: str):
    url = f"https://www.youtube.com/oembed?url=https://youtu.be/{video_id}&format=json"
    try:
        with urllib.request.urlopen(url, timeout=10) as r:
            d = json.load(r)
        return d.get("title", ""), d.get("author_name", "")
    except Exception:
        return "", ""

def main() -> None:
    ids = []
    if os.path.exists(ARCHIVE):
        with open(ARCHIVE) as f:
            ids = [ln.split()[-1] for ln in f if ln.strip()]
        print(f"archive: {len(ids)} video ids from {ARCHIVE}")
    else:
        print(f"no archive file at {ARCHIVE} - tagging titles only, no artists")

    files = sorted(
        f for f in os.listdir(FALLBACK_DIR)
        if re.match(r"^\d+\s*-\s*.+\.mp3$", f)
    )
    print(f"library: {len(files)} numbered mp3 files in {FALLBACK_DIR}\n")

    radio = pwd.getpwnam("radio")
    tagged = with_artist = 0

    for i, name in enumerate(files):
        path = os.path.join(FALLBACK_DIR, name)
        title = re.sub(r"^\d+\s*-\s*", "", name[:-4]).strip()

        artist = ""
        if i < len(ids):
            yt_title, channel = oembed_lookup(ids[i])
            time.sleep(0.15)  # be polite; ~90s total for the library
            if yt_title and (norm(title) in norm(yt_title) or norm(yt_title) in norm(title)):
                artist = re.sub(r"\s*-\s*Topic$", "", channel).strip()
                # a YouTube title like "Artist - Song" beats the bare channel name
                m = re.match(r"^(.{2,50}?)\s*[-–]\s*", yt_title)
                if m and norm(m.group(1)) != norm(title):
                    artist = m.group(1).strip()

        tmp = path + ".tagging.mp3"
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", path, "-c", "copy",
               "-id3v2_version", "3", "-metadata", f"title={title}"]
        if artist:
            cmd += ["-metadata", f"artist={artist}"]
        cmd.append(tmp)

        if subprocess.run(cmd).returncode == 0 and os.path.getsize(tmp) > 0:
            os.replace(tmp, path)
            os.chown(path, radio.pw_uid, radio.pw_gid)
            tagged += 1
            with_artist += 1 if artist else 0
            label = f"{artist} - {title}" if artist else title
            print(f"  [{i+1:3}/{len(files)}] {label}")
        else:
            if os.path.exists(tmp):
                os.remove(tmp)
            print(f"  [{i+1:3}/{len(files)}] FAILED to retag {name} - left as-is")

    print(f"\nDone: {tagged} tagged, {with_artist} with artists, "
          f"{tagged - with_artist} title-only.")
    print("Liquidsoap picks the new tags up as each track next comes around.")

if __name__ == "__main__":
    main()
