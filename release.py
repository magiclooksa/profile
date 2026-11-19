#!/usr/bin/env python3
"""
Builds a release of the Magic Look site: a zip to copy to the Windows Server and apply there
with deploy/windows/install-release.ps1 (see docs/deploy-windows-server.md).

    python release.py                  # code only: the usual update
    python release.py --full           # also public/ (photos, films, data): the first install
    python release.py --bump patch     # raise the version (patch, minor or major) first
    python release.py --bump minor --tag   # ...and commit it and tag it vX.Y.Z in Git

Steps: check the tools and that everything is committed, optionally raise the version,
npm ci, npm test, npm run build (type check and site build), npm run build:server, then
write release/magic-look-<version>-<time>.zip with a RELEASE.json manifest and a .sha256 file.

Why "code only" by default: once the dashboard is in use, the live content (public/data and
uploaded photos) is on the server, not in Git. A code release never touches it.

Needs Python 3.9 or later and Node.js 20.11 or later. Uses the standard library only.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import zipfile
from typing import NoReturn
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT_DIR = ROOT / "release"
NAME = "magic-look"

# Never shipped: design sources (PSD, PDF), CI settings, local files.
EXCLUDE_PREFIXES = ("design/", ".github/", ".vscode/", ".claude/")
EXCLUDE_FILES = {"release.py"}
# Shipped only with --full.
CONTENT_PREFIX = "public/"
# Built here and shipped, though Git ignores it: the server runs it with plain Node.
BUILT_DIRS = ("server-dist",)

MIN_NODE = (20, 11)


# ─── output ─────────────────────────────────────────────────────────────────────────────────────

def say(message: str) -> None:
    print(f"\n==> {message}", flush=True)


def fail(message: str) -> NoReturn:
    print(f"\nERROR: {message}", file=sys.stderr, flush=True)
    sys.exit(1)


# ─── commands ───────────────────────────────────────────────────────────────────────────────────

def tool(name: str) -> str:
    """The full path of a command; on Windows npm is npm.cmd, which subprocess cannot find alone."""
    found = shutil.which(name)
    if not found:
        fail(f"'{name}' was not found. Install it and make sure it is on the PATH.")
    return found


def run(*args: str, capture: bool = False) -> str:
    try:
        result = subprocess.run(
            list(args), cwd=ROOT, check=True, text=True, encoding="utf-8",
            stdout=subprocess.PIPE if capture else None,
        )
    except subprocess.CalledProcessError as error:
        fail(f"'{' '.join(Path(a).name if i == 0 else a for i, a in enumerate(args))}' failed (exit code {error.returncode}).")
    return (result.stdout or "").strip() if capture else ""


def git(*args: str) -> str:
    return run(tool("git"), *args, capture=True)


# ─── checks ─────────────────────────────────────────────────────────────────────────────────────

def check_node() -> str:
    version = run(tool("node"), "--version", capture=True).lstrip("v")
    major, minor = (int(part) for part in version.split(".")[:2])
    if (major, minor) < MIN_NODE:
        fail(f"Node.js {version} is too old; {MIN_NODE[0]}.{MIN_NODE[1]} or later is needed.")
    return version


def check_clean(allow_dirty: bool) -> bool:
    """True when the working tree has uncommitted changes (only allowed with --allow-dirty)."""
    dirty = git("status", "--porcelain") != ""
    if dirty and not allow_dirty:
        fail("There are uncommitted changes. Commit them first, so the release matches a commit,\n"
             "       or run again with --allow-dirty to package the working tree as it is.")
    return dirty


# ─── version ────────────────────────────────────────────────────────────────────────────────────

def read_version() -> str:
    return json.loads((ROOT / "package.json").read_text(encoding="utf-8"))["version"]


def bumped(version: str, part: str) -> str:
    match = re.fullmatch(r"(\d+)\.(\d+)\.(\d+)", version)
    if not match:
        fail(f"package.json has a version that is not X.Y.Z: {version}")
    major, minor, patch = (int(n) for n in match.groups())
    if part == "major":
        return f"{major + 1}.0.0"
    if part == "minor":
        return f"{major}.{minor + 1}.0"
    return f"{major}.{minor}.{patch + 1}"


def write_version(version: str) -> None:
    """Sets the version in package.json and package-lock.json, keeping their 2-space format."""
    package_file = ROOT / "package.json"
    package = json.loads(package_file.read_text(encoding="utf-8"))
    package["version"] = version
    package_file.write_text(json.dumps(package, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    lock_file = ROOT / "package-lock.json"
    if lock_file.exists():
        lock = json.loads(lock_file.read_text(encoding="utf-8"))
        lock["version"] = version
        if "" in lock.get("packages", {}):
            lock["packages"][""]["version"] = version
        lock_file.write_text(json.dumps(lock, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


# ─── packaging ──────────────────────────────────────────────────────────────────────────────────

def project_files(full: bool) -> list[str]:
    """Files in Git plus new files Git does not ignore, minus what a release never carries."""
    listed = git("ls-files", "--cached", "--others", "--exclude-standard", "-z")
    files = []
    for path in sorted(set(filter(None, listed.split("\0")))):
        if path in EXCLUDE_FILES or path.startswith(EXCLUDE_PREFIXES):
            continue
        if path.startswith(CONTENT_PREFIX) and not full:
            continue
        if (ROOT / path).is_file():  # skips files deleted but not yet committed
            files.append(path)
    for folder in BUILT_DIRS:
        base = ROOT / folder
        if not base.is_dir():
            fail(f"{folder}/ is missing: the server build did not produce it.")
        files.extend(p.relative_to(ROOT).as_posix() for p in sorted(base.rglob("*")) if p.is_file())
    return files


def write_zip(target: Path, files: list[str], manifest: dict) -> None:
    # Photos and films are already compressed; storing them as they are is much faster.
    stored = re.compile(r"\.(jpe?g|png|webp|avif|gif|mp4|webm|mov|zip|pdf|psd|woff2?)$", re.IGNORECASE)
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        archive.writestr("RELEASE.json", json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
        for path in files:
            method = zipfile.ZIP_STORED if stored.search(path) else zipfile.ZIP_DEFLATED
            archive.write(ROOT / path, arcname=path, compress_type=method)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def human_size(size: float) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if size < 1024 or unit == "GB":
            return f"{size:.1f} {unit}" if unit != "B" else f"{int(size)} B"
        size /= 1024
    return f"{size:.1f} GB"


# ─── main ───────────────────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Build a release zip of the Magic Look site.")
    parser.add_argument("--full", action="store_true",
                        help="include public/ (photos, films and data); use it for the first install only")
    parser.add_argument("--bump", choices=("patch", "minor", "major"),
                        help="raise the version in package.json before building")
    parser.add_argument("--tag", action="store_true",
                        help="commit the version change and tag it vX.Y.Z (needs --bump)")
    parser.add_argument("--allow-dirty", action="store_true",
                        help="package uncommitted changes too (the manifest records it)")
    parser.add_argument("--skip-install", action="store_true", help="skip npm ci")
    parser.add_argument("--skip-tests", action="store_true", help="skip npm test")
    args = parser.parse_args()

    if args.tag and not args.bump:
        fail("--tag needs --bump: a tag names a new version.")
    if args.tag and args.allow_dirty:
        fail("--tag cannot be used with --allow-dirty: a tag must point at committed work.")

    # Arabic file names and messages print correctly on any Windows console.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    say("Checking the tools")
    node = check_node()
    npm = tool("npm")
    print(f"    Node.js {node}, npm {run(npm, '--version', capture=True)}")
    dirty = check_clean(args.allow_dirty)

    version = read_version()
    if args.bump:
        version = bumped(version, args.bump)
        say(f"Raising the version to {version}")
        write_version(version)

    if not args.skip_install:
        say("Installing dependencies (npm ci)")
        run(npm, "ci")
    if not args.skip_tests:
        say("Running the tests")
        run(npm, "test")
    say("Type check and site build")
    run(npm, "run", "build")
    say("Building the server")
    run(npm, "run", "build:server")

    if args.tag:
        say(f"Committing and tagging v{version}")
        git("add", "package.json", "package-lock.json")
        git("commit", "-m", f"chore: release v{version}")
        git("tag", "-a", f"v{version}", "-m", f"Release v{version}")

    say("Packaging")
    files = project_files(args.full)
    stamp = dt.datetime.now().strftime("%Y%m%d-%H%M")
    kind = "full" if args.full else "code"
    OUT_DIR.mkdir(exist_ok=True)
    target = OUT_DIR / f"{NAME}-{version}-{stamp}-{kind}.zip"
    manifest = {
        "name": NAME,
        "version": version,
        "kind": kind,
        "builtAt": dt.datetime.now().astimezone().isoformat(timespec="seconds"),
        "commit": git("rev-parse", "HEAD"),
        "branch": git("rev-parse", "--abbrev-ref", "HEAD"),
        "uncommittedChanges": dirty,
        "node": node,
        "files": len(files),
    }
    write_zip(target, files, manifest)
    checksum = sha256(target)
    target.with_name(target.name + ".sha256").write_text(f"{checksum}  {target.name}\n", encoding="utf-8")

    say("Release ready")
    print(f"    {target.relative_to(ROOT)}  ({human_size(target.stat().st_size)}, {len(files)} files)")
    print(f"    SHA-256 {checksum}")
    if dirty:
        print("    Warning: built from uncommitted changes.")
    print("\n    On the server (PowerShell, as administrator):")
    print(f"    .\\deploy\\windows\\install-release.ps1 -Zip C:\\path\\to\\{target.name}")
    if args.tag:
        print(f"\n    Push the tag when ready: git push && git push origin v{version}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        fail("Stopped.")
