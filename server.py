#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import posixpath
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HOST = "0.0.0.0"
PORT = 4173
DANBOORU_BASE = "https://danbooru.donmai.us/tags.json"


class AppHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/danbooru-tags":
            self._handle_danbooru_proxy(parsed.query)
            return
        super().do_GET()

    def _handle_danbooru_proxy(self, raw_query: str):
        try:
            query = urllib.parse.parse_qs(raw_query)
            page = max(1, int(query.get("page", ["1"])[0]))
            limit = min(200, max(1, int(query.get("limit", ["200"])[0])))

            upstream_query = urllib.parse.urlencode(
                {
                    "search[order]": "count",
                    "page": page,
                    "limit": limit,
                }
            )
            upstream_url = f"{DANBOORU_BASE}?{upstream_query}"
            req = urllib.request.Request(
                upstream_url,
                headers={
                    "User-Agent": "drpg-local-tag-manager/1.0",
                    "Accept": "application/json",
                },
            )
            with urllib.request.urlopen(req, timeout=20) as response:
                payload = response.read()
                status = response.status

            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(payload)
        except Exception as exc:  # noqa: BLE001
            self.send_response(502)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            body = {
                "error": "proxy_error",
                "message": str(exc),
            }
            self.wfile.write(json.dumps(body, ensure_ascii=False).encode("utf-8"))

    def translate_path(self, path: str):
        parsed_path = urllib.parse.urlparse(path).path
        path = posixpath.normpath(urllib.parse.unquote(parsed_path))
        parts = [p for p in path.split("/") if p and p not in {".", ".."}]
        root = os.getcwd()
        for part in parts:
            root = os.path.join(root, part)
        return root


if __name__ == "__main__":
    with ThreadingHTTPServer((HOST, PORT), AppHandler) as server:
        print(f"Serving on http://{HOST}:{PORT}")
        server.serve_forever()
