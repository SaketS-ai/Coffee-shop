#!/usr/bin/env python3
"""
Local dev orchestrator for Social Cup Dallas.

Usage:
    python manage.py runserver   Start backend + frontend dev servers together
    python manage.py migrate     Run pending database migrations
    python manage.py seed        Run the dev database seed

This project has no Python/Django backend - it's Node/Express + React/Vite +
PostgreSQL (see CLAUDE.md). This script only wraps the existing `npm run dev`
/ `npm run migrate` / `npm run seed` scripts in backend/ (and the project
root, for the frontend dev server) so they can be run together or checked
against Postgres from one command. It never starts or stops Postgres itself
- that runs as its own independent local service, per CLAUDE.md.
"""
import argparse
import os
import socket
import subprocess
import sys
import threading
import time
from pathlib import Path
from urllib.parse import urlparse

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"


def read_env_file(path: Path) -> dict:
    values = {}
    if not path.exists():
        return values
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def check_postgres_reachable(database_url: str, timeout: float = 3.0) -> bool:
    parsed = urlparse(database_url)
    host = parsed.hostname or "localhost"
    port = parsed.port or 5432
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def stream_output(process: subprocess.Popen, prefix: str) -> None:
    assert process.stdout is not None
    for line in process.stdout:
        print(f"[{prefix}] {line}", end="", flush=True)


def kill_process_tree(process: subprocess.Popen) -> None:
    if process.poll() is not None:
        return
    if os.name == "nt":
        # npm.cmd -> node (npm) -> ts-node-dev -> respawned server is a real
        # child-process chain, so /T (tree kill) reaches all of it - the
        # same approach used manually throughout this project's dev sessions
        # to clean up otherwise-orphaned ts-node-dev processes.
        subprocess.run(
            ["taskkill", "/F", "/T", "/PID", str(process.pid)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    else:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()


def require_postgres() -> str | None:
    """Returns DATABASE_URL if backend/.env has one and Postgres answers on
    that host/port, otherwise prints a clear error and returns None. Shared
    by every command below that touches the database."""
    backend_env = read_env_file(BACKEND_DIR / ".env")
    database_url = backend_env.get("DATABASE_URL")

    if not database_url:
        print(
            "backend/.env is missing DATABASE_URL. Copy backend/.env.example "
            "to backend/.env and configure it before running this command.",
            file=sys.stderr,
        )
        return None

    print("Checking PostgreSQL is reachable...", flush=True)
    if not check_postgres_reachable(database_url):
        print(
            "Could not reach PostgreSQL using DATABASE_URL from backend/.env.\n"
            "This script does not start Postgres itself - it runs as its own "
            "local service. Make sure it's running, then try again.",
            file=sys.stderr,
        )
        return None
    print("PostgreSQL is reachable.\n", flush=True)
    return database_url


def run_npm_script(cwd: Path, script: str) -> int:
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    result = subprocess.run([npm_cmd, "run", script], cwd=str(cwd))
    return result.returncode


def run_migrate() -> int:
    if not require_postgres():
        return 1
    print("Running database migrations (npm run migrate)...\n", flush=True)
    return run_npm_script(BACKEND_DIR, "migrate")


def run_seed() -> int:
    if not require_postgres():
        return 1
    print("Running database seed (npm run seed)...\n", flush=True)
    return run_npm_script(BACKEND_DIR, "seed")


def run_server() -> int:
    if not require_postgres():
        return 1

    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    popen_kwargs = dict(stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)

    print("Starting backend (npm run dev)...", flush=True)
    backend_process = subprocess.Popen([npm_cmd, "run", "dev"], cwd=str(BACKEND_DIR), **popen_kwargs)

    print("Starting frontend (npm run dev)...", flush=True)
    frontend_process = subprocess.Popen([npm_cmd, "run", "dev"], cwd=str(ROOT_DIR), **popen_kwargs)

    threading.Thread(target=stream_output, args=(backend_process, "backend"), daemon=True).start()
    threading.Thread(target=stream_output, args=(frontend_process, "frontend"), daemon=True).start()

    print("\nBoth servers starting. Press Ctrl+C to stop both.\n", flush=True)

    try:
        while backend_process.poll() is None and frontend_process.poll() is None:
            time.sleep(0.5)
        if backend_process.poll() is not None:
            print(f"\n[backend] exited unexpectedly with code {backend_process.poll()}", flush=True)
        if frontend_process.poll() is not None:
            print(f"\n[frontend] exited unexpectedly with code {frontend_process.poll()}", flush=True)
    except KeyboardInterrupt:
        print("\nStopping backend and frontend...", flush=True)
    finally:
        kill_process_tree(backend_process)
        kill_process_tree(frontend_process)

    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Social Cup local dev orchestrator")
    subparsers = parser.add_subparsers(dest="command")
    subparsers.add_parser("runserver", help="Start backend + frontend dev servers (checks Postgres first)")
    subparsers.add_parser("migrate", help="Run pending database migrations (wraps `npm run migrate` in backend/)")
    subparsers.add_parser("seed", help="Run the dev database seed (wraps `npm run seed` in backend/)")

    args = parser.parse_args()

    if args.command == "runserver":
        return run_server()
    if args.command == "migrate":
        return run_migrate()
    if args.command == "seed":
        return run_seed()

    parser.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
