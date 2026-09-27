"""Static dev server with caching disabled, so edited ES modules always reload.

Usage: python3 tools/serve.py [port] [--capture]
  (default port 5199, serves the repo root)

--capture also accepts POST /__capture/<name>.jpg and writes the body to
docs/screenshots/<name>.jpg; used by the in-page screenshot helper
(window.lusaka.capture). Local development only.
"""
import functools
import http.server
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAPTURE = "--capture" in sys.argv


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_POST(self):
        m = re.fullmatch(r"/__capture/([a-z0-9-]+)\.jpg", self.path)
        if not CAPTURE or not m:
            self.send_error(404)
            return
        body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        out = os.path.join(ROOT, "docs", "screenshots", f"{m.group(1)}.jpg")
        os.makedirs(os.path.dirname(out), exist_ok=True)
        with open(out, "wb") as fh:
            fh.write(body)
        self.send_response(204)
        self.end_headers()


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    port = int(args[0]) if args else 5199
    handler = functools.partial(NoCache, directory=ROOT)
    print(f"Serving {ROOT} on http://localhost:{port}" + (" (capture enabled)" if CAPTURE else ""))
    http.server.ThreadingHTTPServer(("127.0.0.1", port), handler).serve_forever()
