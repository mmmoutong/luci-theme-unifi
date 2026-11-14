#!/usr/bin/env python3
"""Local-only preview; serves original theme files and an isolated demo harness."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs
import argparse
ROOT = Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        parsed = urlparse(path)
        path = parsed.path
        if path == '/':
            page = 'login.html' if parse_qs(parsed.query).get('page') == ['login'] else 'index.html'
            return str(ROOT / 'preview' / page)
        if path == '/luci-static/bootstrap/cascade.css': return str(ROOT / 'preview/bootstrap.css')
        if path.startswith('/luci-static/'):
            target = ROOT / 'htdocs' / path.lstrip('/')
        else: target = ROOT / path.lstrip('/')
        target = target.resolve()
        return str(target) if target.is_relative_to(ROOT) else str(ROOT / 'NOT_FOUND')
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
if __name__ == '__main__':
    p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=8765);a=p.parse_args()
    print(f'Preview: http://127.0.0.1:{a.port}',flush=True)
    ThreadingHTTPServer(('127.0.0.1',a.port),Handler).serve_forever()
