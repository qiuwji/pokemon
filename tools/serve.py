"""Local development server. Disable caching so nested ES modules update together."""
from control_relay import ControlHandler, ControlRelay
import argparse
import subprocess
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=5173)
args = parser.parse_args()

project = Path(__file__).resolve().parents[1]
build_lock = threading.Lock()
build_signature = None

def ensure_build():
    global build_signature
    with build_lock:
        signature = tuple((str(p), p.stat().st_mtime_ns, p.stat().st_size)
                          for name in ('src', 'generated')
                          for p in sorted((project / name).rglob('*')) if p.is_file())
        if signature != build_signature:
            subprocess.run(['node', str(project / 'tools/build.mjs')], check=True)
            build_signature = signature

class DevelopmentHandler(ControlHandler, SimpleHTTPRequestHandler):
    def do_GET(self):
        if not self.path.startswith('/control/'):
            try:
                ensure_build()
            except subprocess.CalledProcessError:
                self.send_error(503, 'Source build failed; see development terminal')
                return
        super().do_GET()

    def log_message(self, format, *args):
        if not self.path.startswith("/control/"):
            super().log_message(format, *args)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

ensure_build()
root = project / 'dist'
server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(DevelopmentHandler, directory=str(root)))
server.control_relay = ControlRelay()
server.serve_forever()
