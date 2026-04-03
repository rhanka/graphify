# per-file extraction cache — skip unchanged files on re-run
from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path


def file_hash(path: Path) -> str:
    """SHA256 of file contents, hex digest."""
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def cache_dir(root: Path = Path(".")) -> Path:
    """Returns .graphify/cache/ — creates it if needed."""
    d = Path(root) / ".graphify" / "cache"
    d.mkdir(parents=True, exist_ok=True)
    return d


def load_cached(path: Path, root: Path = Path(".")) -> dict | None:
    """Return cached extraction for this file if hash matches, else None.

    Cache key: SHA256 of file contents.
    Cache value: stored as .graphify/cache/{hash}.json
    Returns None if no cache entry or file has changed.
    """
    try:
        h = file_hash(path)
    except OSError:
        return None
    entry = cache_dir(root) / f"{h}.json"
    if not entry.exists():
        return None
    try:
        return json.loads(entry.read_text())
    except (json.JSONDecodeError, OSError):
        return None


def save_cached(path: Path, result: dict, root: Path = Path(".")) -> None:
    """Save extraction result for this file.

    Stores as .graphify/cache/{hash}.json where hash = SHA256 of current file contents.
    result should be a dict with 'nodes' and 'edges' lists.
    """
    h = file_hash(path)
    entry = cache_dir(root) / f"{h}.json"
    entry.write_text(json.dumps(result))


def cached_files(root: Path = Path(".")) -> set[str]:
    """Return set of file paths that have a valid cache entry (hash still matches)."""
    d = cache_dir(root)
    return {p.stem for p in d.glob("*.json")}


def clear_cache(root: Path = Path(".")) -> None:
    """Delete all .graphify/cache/*.json files."""
    d = cache_dir(root)
    for f in d.glob("*.json"):
        f.unlink()
