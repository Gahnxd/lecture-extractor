import re
import sys
import json
import time
from urllib.parse import urljoin, urlparse
from pathlib import Path
import requests
import questionary
from rich.console import Console
from rich.prompt import Prompt
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
from rich.table import Table

console = Console()


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

        i += 1

    # Join lines; you can change this to paragraphs if you want
    return "\n".join(out).strip() + "\n"


def fetch_text(url: str, headers: dict | None = None, timeout: int = 30) -> str:
    r = requests.get(url, headers=headers, timeout=timeout)
    r.raise_for_status()
    r.encoding = r.encoding or "utf-8"
    return r.text


def download_transcript():
    """Handle a single download session."""
    folder_name = Prompt.ask("  [bold cyan]📁 Folder name[/bold cyan]").strip()
    if not folder_name:
        console.print("[bold red]  ✗ Error: Folder name cannot be empty.[/bold red]")
        return False

    m3u8_url = Prompt.ask("\n  [bold cyan]🔗 M3U8 URL[/bold cyan]").strip()
    if not m3u8_url:
        console.print("[bold red]  ✗ Error: M3U8 URL cannot be empty.[/bold red]")
        return False

    console.print()

    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "*/*",
    }

    with console.status("[bold yellow]⏳ Fetching playlist...[/bold yellow]", spinner="dots"):
        m3u8_text = fetch_text(m3u8_url, headers=headers)
        vtt_paths = parse_m3u8_for_vtt_paths(m3u8_text)

    if not vtt_paths:
        console.print("[bold red]  ✗ No .vtt segments found in the m3u8.[/bold red]")
        console.print(m3u8_text[:400])
        return False

    vtt_urls = [urljoin(m3u8_url, path) for path in vtt_paths]

    asset_id = folder_name
    out_dir = Path(asset_id)
    out_dir.mkdir(parents=True, exist_ok=True)

    merged_vtt_path = out_dir / f"{asset_id}_raw.vtt"
    merged_txt_path = out_dir / f"{asset_id}_transcript.txt"

    console.print(f"  [green]✓[/green] Found [bold cyan]{len(vtt_urls)}[/bold cyan] VTT segments")

    merged_vtt_parts = ["WEBVTT\n"]
    all_plain_parts = []

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(complete_style="green", finished_style="bright_green"),
        TaskProgressColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("[cyan]Downloading...", total=len(vtt_urls))
        
        for vtt_url in vtt_urls:
            vtt_text = fetch_text(vtt_url, headers=headers)
            vtt_text_clean = re.sub(r"^\ufeff?WEBVTT[^\n]*\n", "", vtt_text, flags=re.IGNORECASE)
            merged_vtt_parts.append(vtt_text_clean.strip() + "\n\n")
            all_plain_parts.append(vtt_to_plain_text(vtt_text_clean))
            progress.update(task, advance=1)
            time.sleep(0.05)

    merged_vtt = "".join(merged_vtt_parts).strip() + "\n"
    merged_txt = "\n".join(p.strip() for p in all_plain_parts if p.strip()).strip() + "\n"

    merged_vtt_path.write_text(merged_vtt, encoding="utf-8")
    merged_txt_path.write_text(merged_txt, encoding="utf-8")

    console.print()
    console.print(Panel(
        f"[green]✓ Complete![/green]\n\n"
        f"[dim]Raw VTT:[/dim]   [bold blue]{merged_vtt_path.resolve()}[/bold blue]\n"
        f"[dim]Transcript:[/dim] [bold blue]{merged_txt_path.resolve()}[/bold blue]",
        title="[bold green]📄 Output Files[/bold green]",
        border_style="green",
        padding=(0, 2)
    ))
    return True


def main():
    console.print()
    console.print(Panel.fit(
        "[bold white]📚 Lecture Extractor[/bold white]\n[dim]Extract transcripts from M3U8 playlists[/dim]",
        border_style="bright_magenta",
        padding=(0, 2)
    ))
    console.print()

    while True:
        download_transcript()
        console.print()
        
        choice = questionary.select(
            "What would you like to do?",
            choices=[
                "📥 Download another transcript",
                "👋 Quit"
            ],
            style=questionary.Style([
                ("selected", "fg:cyan bold"),
                ("pointer", "fg:cyan bold"),
                ("highlighted", "fg:cyan"),
                ("question", "fg:white bold"),
            ])
        ).ask()

        if choice is None or "Quit" in choice:
            console.print("\n  [dim]Goodbye! 👋[/dim]\n")
            break
        
        console.print()


if __name__ == "__main__":
    main()