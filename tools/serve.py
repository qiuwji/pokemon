"""Local development server. Disable caching so nested ES modules update together."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=5173)
args = parser.parse_args()

class DevelopmentHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

root = Path(__file__).resolve().parents[1] / 'dist'
ThreadingHTTPServer(('127.0.0.1', args.port), partial(DevelopmentHandler, directory=str(root))).serve_forever()
