# monitor a folder and auto-trigger --update when files change
from __future__ import annotations
import time
from pathlib import Path


_WATCHED_EXTENSIONS = {
    ".py", ".ts", ".js", ".go", ".rs", ".java", ".cpp", ".c", ".rb", ".swift", ".kt",
    ".cs", ".scala", ".php", ".cc", ".cxx", ".hpp", ".h", ".kts",
    ".md", ".txt", ".rst", ".pdf",
    ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg",
}


def _run_update(watch_path: Path) -> None:
    """Write a flag file and print a notification when files change."""
    flag = watch_path / ".graphify" / "needs_update"
    flag.parent.mkdir(parents=True, exist_ok=True)
    flag.write_text("1")
    print(f"\n[graphify watch] New or changed files detected in {watch_path}")
    print("[graphify watch] Run `/graphify --update` in Claude Code to update the graph.")
    print(f"[graphify watch] Flag written to {flag}")


def watch(watch_path: Path, debounce: float = 3.0) -> None:
    """
    Watch watch_path for new or modified files and re-run graphify --update.

    debounce: seconds to wait after the last change before triggering (avoids
    running on every keystroke when many files are saved at once).
    """
    try:
        from watchdog.observers import Observer
        from watchdog.events import FileSystemEventHandler
    except ImportError as e:
        raise ImportError("watchdog not installed. Run: pip install watchdog") from e

    last_trigger: float = 0.0
    pending: bool = False

    class Handler(FileSystemEventHandler):
        def on_any_event(self, event):
            nonlocal last_trigger, pending
            if event.is_directory:
                return
            path = Path(event.src_path)
            if path.suffix.lower() not in _WATCHED_EXTENSIONS:
                return
            if any(part.startswith(".") for part in path.parts):
                return
            last_trigger = time.monotonic()
            pending = True

    handler = Handler()
    observer = Observer()
    observer.schedule(handler, str(watch_path), recursive=True)
    observer.start()

    print(f"[graphify watch] Watching {watch_path.resolve()} — press Ctrl+C to stop")
    print(f"[graphify watch] Debounce: {debounce}s — will update {debounce}s after last change")

    try:
        while True:
            time.sleep(0.5)
            if pending and (time.monotonic() - last_trigger) >= debounce:
                pending = False
                _run_update(watch_path)
    except KeyboardInterrupt:
        print("\n[graphify watch] Stopped.")
    finally:
        observer.stop()
        observer.join()


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Watch a folder and auto-update the graphify graph")
    parser.add_argument("path", nargs="?", default=".", help="Folder to watch (default: .)")
    parser.add_argument("--debounce", type=float, default=3.0,
                        help="Seconds to wait after last change before updating (default: 3)")
    args = parser.parse_args()
    watch(Path(args.path), debounce=args.debounce)
