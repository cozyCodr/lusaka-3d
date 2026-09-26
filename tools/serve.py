"""Static dev server with caching disabled, so edited ES modules always reload.

Usage: python3 tools/serve.py [port]   (default 5199, serves the repo root)
"""
import functools
import http.server
import os
import sys


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5199
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    handler = functools.partial(NoCache, directory=root)
    print(f"Serving {root} on http://localhost:{port}")
    http.server.ThreadingHTTPServer(("", port), handler).serve_forever()
