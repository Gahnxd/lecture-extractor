import re

def srt_to_plain_text(srt_content: str) -> str:
    """
    Convert SRT content into a rough plain-text transcript:
    - remove numeric counters
    - remove timestamps
    - keep cue text, de-duplicate consecutive identical lines
    """
    lines = srt_content.splitlines()
    out = []
    
    # regex for "00:00:10,810 --> 00:00:13,750"
    # Note: SRT uses comma for milliseconds, VTT uses dot. 
    # But usually broad regex captures both or specific one.
    timestamp_re = re.compile(
        r"^\d{1,3}:\d{2}:\d{2}[,.]\d{3}\s+-->\s+\d{1,3}:\d{2}:\d{2}[,.]\d{3}"
    )

    last_kept = None
    
    for line in lines:
        stripped = line.strip()
        
        # 1. Skip blank lines
        if not stripped:
            continue
            
        # 2. Skip numeric counter lines (just digits)
        if stripped.isdigit():
            continue
            
        # 3. Skip timestamps
        if timestamp_re.match(stripped):
            continue
            
        # 4. Text line
        # Avoid consecutive duplicates if needed, though less common in full SRT than segmented VTT
        if stripped != last_kept:
            out.append(stripped)
            last_kept = stripped

    return "\n".join(out).strip() + "\n"
