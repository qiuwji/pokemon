"""Local development server. Disable caching so nested ES modules update together."""
from control_relay import ControlHandler, ControlRelay
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=5173)
args = parser.parse_args()

class DevelopmentHandler(ControlHandler, SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        if not self.path.startswith("/control/"):
            super().log_message(format, *args)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

root = Path(__file__).resolve().parents[1] / 'dist'
server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(DevelopmentHandler, directory=str(root)))
server.control_relay = ControlRelay()
server.serve_forever()
