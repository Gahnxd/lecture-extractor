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

from utils import fetch_text
from vtt import parse_m3u8_for_vtt_paths, vtt_to_plain_text
from srt import srt_to_plain_text

console = Console()


def download_transcript():
    """Handle a single download session."""
    folder_name = Prompt.ask("  [bold cyan]📁 Folder name[/bold cyan]").strip()
    if not folder_name:
        console.print("[bold red]  ✗ Error: Folder name cannot be empty.[/bold red]")
        return False

    input_url = Prompt.ask("\n  [bold cyan]🔗 URL (M3U8 or SRT)[/bold cyan]").strip()
    if not input_url:
        console.print("[bold red]  ✗ Error: URL cannot be empty.[/bold red]")
        return False

    console.print()

    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "*/*",
    }

    asset_id = folder_name
    out_dir = Path(asset_id)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Check if it is an SRT file
    if input_url.lower().endswith(".srt"):
        with console.status("[bold yellow]⏳ Fetching SRT...[/bold yellow]", spinner="dots"):
            try:
                srt_content = fetch_text(input_url, headers=headers)
            except Exception as e:
                console.print(f"[bold red]  ✗ Error fetching SRT: {e}[/bold red]")
                return False

        merged_srt_path = out_dir / f"{asset_id}_raw.srt"
        merged_txt_path = out_dir / f"{asset_id}_transcript.txt"

        plain_text = srt_to_plain_text(srt_content)

        merged_srt_path.write_text(srt_content, encoding="utf-8")
        merged_txt_path.write_text(plain_text, encoding="utf-8")
        
        console.print(Panel(
            f"[green]✓ Complete![/green]\n\n"
            f"[dim]Raw SRT:[/dim]   [bold blue]{merged_srt_path.resolve()}[/bold blue]\n"
            f"[dim]Transcript:[/dim] [bold blue]{merged_txt_path.resolve()}[/bold blue]",
            title="[bold green]📄 Output Files[/bold green]",
            border_style="green",
            padding=(0, 2)
        ))
        return True

    # Assume M3U8 otherwise
    with console.status("[bold yellow]⏳ Fetching playlist...[/bold yellow]", spinner="dots"):
        try:
            m3u8_text = fetch_text(input_url, headers=headers)
        except Exception as e:
            console.print(f"[bold red]  ✗ Error fetching playlist: {e}[/bold red]")
            return False

        vtt_paths = parse_m3u8_for_vtt_paths(m3u8_text)

    if not vtt_paths:
        console.print("[bold red]  ✗ No .vtt segments found in the m3u8.[/bold red]")
        console.print(m3u8_text[:400])
        return False

    vtt_urls = [urljoin(input_url, path) for path in vtt_paths]

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
            try:
                vtt_text = fetch_text(vtt_url, headers=headers)
                vtt_text_clean = re.sub(r"^\ufeff?WEBVTT[^\n]*\n", "", vtt_text, flags=re.IGNORECASE)
                merged_vtt_parts.append(vtt_text_clean.strip() + "\n\n")
                all_plain_parts.append(vtt_to_plain_text(vtt_text_clean))
            except Exception as e:
                console.print(f"[bold red]  ✗ Error fetching segment {vtt_url}: {e}[/bold red]")
            
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
        "[bold white]📚 Lecture Extractor[/bold white]\n[dim]Extract transcripts from M3U8 playlists or SRT files[/dim]",
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