import re

def parse_m3u8_for_vtt_paths(m3u8_text: str) -> list[str]:
    """
    Extract .vtt segment paths from an m3u8 file.
    """
    vtt_paths = []
    for line in m3u8_text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.lower().endswith(".vtt"):
            vtt_paths.append(line)
    return vtt_paths


def vtt_to_plain_text(vtt: str) -> str:
    """
    Convert WebVTT content into a rough plain-text transcript:
    - remove WEBVTT header
    - remove NOTE / STYLE blocks
    - remove timestamps
    - keep cue text, de-duplicate consecutive identical lines
    """
    lines = vtt.splitlines()
    out = []
    i = 0

    # remove UTF-8 BOM if present
    if lines and lines[0].startswith("\ufeff"):
        lines[0] = lines[0].lstrip("\ufeff")

    # Simple state machine to skip NOTE/STYLE blocks
    skip_block = False

    timestamp_re = re.compile(
        r"^\d{2}:\d{2}:\d{2}\.\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}\.\d{3}"
    )

    last_kept = None

    while i < len(lines):
        line = lines[i].rstrip()

        # Skip WEBVTT header line
        if i == 0 and line.strip().upper().startswith("WEBVTT"):
            i += 1
            continue

        # Handle NOTE/STYLE blocks
        if line.startswith("NOTE") or line.startswith("STYLE"):
            skip_block = True
            i += 1
            continue

        if skip_block:
            # Blocks end at blank line
            if line.strip() == "":
                skip_block = False
            i += 1
            continue

        # Skip timestamps and cue indices
        if timestamp_re.match(line.strip()):
            i += 1
            continue

        # Skip numeric cue identifiers
        if line.strip().isdigit():
            i += 1
            continue

        text = line.strip()
        if text:
            # Avoid consecutive duplicates (common with segmented VTT)
            if text != last_kept:
                out.append(text)
                last_kept = text

    # Join lines; you can change this to paragraphs if you want
        i += 1

    return "\n".join(out).strip() + "\n"
