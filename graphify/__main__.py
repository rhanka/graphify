"""graphify CLI - `graphify install` sets up the Claude Code skill."""
from __future__ import annotations
import json
import shutil
import sys
from pathlib import Path

_SKILL_REGISTRATION = (
    "\n# graphify\n"
    "- **graphify** (`~/.claude/skills/graphify/SKILL.md`) "
    "- any input to knowledge graph. Trigger: `/graphify`\n"
    "When the user types `/graphify`, invoke the Skill tool "
    "with `skill: \"graphify\"` before doing anything else.\n"
)


def _bundled_skill() -> Path:
    """Path to the skill.md bundled with this package."""
    return Path(__file__).parent / "skill.md"


def install() -> None:
    skill_src = _bundled_skill()
    if not skill_src.exists():
        print("error: skill.md not found in package - reinstall graphify", file=sys.stderr)
        sys.exit(1)

    # Copy skill to ~/.claude/skills/graphify/SKILL.md
    skill_dst = Path.home() / ".claude" / "skills" / "graphify" / "SKILL.md"
    skill_dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy(skill_src, skill_dst)
    print(f"  skill installed  →  {skill_dst}")

    # Register in ~/.claude/CLAUDE.md
    claude_md = Path.home() / ".claude" / "CLAUDE.md"
    if claude_md.exists():
        content = claude_md.read_text()
        if "graphify" in content:
            print(f"  CLAUDE.md        →  already registered (no change)")
        else:
            claude_md.write_text(content.rstrip() + _SKILL_REGISTRATION)
            print(f"  CLAUDE.md        →  skill registered in {claude_md}")
    else:
        claude_md.parent.mkdir(parents=True, exist_ok=True)
        claude_md.write_text(_SKILL_REGISTRATION.lstrip())
        print(f"  CLAUDE.md        →  created at {claude_md}")

    print()
    print("Done. Open Claude Code in any directory and type:")
    print()
    print("  /graphify .")
    print()


def main() -> None:
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print("Usage: graphify <command>")
        print()
        print("Commands:")
        print("  install                 copy skill to ~/.claude/skills/ and register in CLAUDE.md")
        print("  benchmark [graph.json]  measure token reduction vs naive full-corpus approach")
        print("  hook install            install post-commit git hook (auto-rebuilds graph on commit)")
        print("  hook uninstall          remove post-commit git hook")
        print("  hook status             check if hook is installed")
        print()
        return

    cmd = sys.argv[1]
    if cmd == "install":
        install()
    elif cmd == "hook":
        from graphify.hooks import install as hook_install, uninstall as hook_uninstall, status as hook_status
        subcmd = sys.argv[2] if len(sys.argv) > 2 else ""
        if subcmd == "install":
            print(hook_install(Path(".")))
        elif subcmd == "uninstall":
            print(hook_uninstall(Path(".")))
        elif subcmd == "status":
            print(hook_status(Path(".")))
        else:
            print("Usage: graphify hook [install|uninstall|status]", file=sys.stderr)
            sys.exit(1)
    elif cmd == "benchmark":
        from graphify.benchmark import run_benchmark, print_benchmark
        graph_path = sys.argv[2] if len(sys.argv) > 2 else "graphify-out/graph.json"
        # Try to load corpus_words from detect output
        corpus_words = None
        detect_path = Path(".graphify_detect.json")
        if detect_path.exists():
            try:
                detect_data = json.loads(detect_path.read_text())
                corpus_words = detect_data.get("total_words")
            except Exception:
                pass
        result = run_benchmark(graph_path, corpus_words=corpus_words)
        print_benchmark(result)
    else:
        print(f"error: unknown command '{cmd}'", file=sys.stderr)
        print("Run 'graphify --help' for usage.", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
