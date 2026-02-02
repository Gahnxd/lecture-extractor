import requests

def fetch_text(url: str, headers: dict | None = None, timeout: int = 30) -> str:
    r = requests.get(url, headers=headers, timeout=timeout)
    r.raise_for_status()
    r.encoding = r.encoding or "utf-8"
    return r.text
