"""Serve source and generated resources directly; no copied deployment tree."""
from control_relay import ControlHandler, ControlRelay
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, unquote


class DevelopmentHandler(ControlHandler, SimpleHTTPRequestHandler):
    def send_head(self):
        route = urlsplit(self.path)
        if route.path == '/':
            self.send_response(302)
            self.send_header('Location', '/src/index.html' + ('?' + route.query if route.query else ''))
            self.end_headers()
            return None
        decoded = unquote(route.path)
        parts = Path(decoded).parts
        if (len(parts) < 3 or parts[1] not in ('src', 'generated')
                or any(part in ('.', '..') for part in decoded.split('/'))):
            self.send_error(404)
            return None
        root = Path(self.directory).resolve()
        target = Path(self.translate_path(self.path)).resolve()
        if not target.is_relative_to(root / parts[1]) or not target.is_file():
            self.send_error(404)
            return None
        return super().send_head()

    def log_message(self, format, *args):
        if not self.path.startswith('/control/'):
            super().log_message(format, *args)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


def create_server(project, port=5173, host='127.0.0.1'):
    server = ThreadingHTTPServer((host, port),
                                 partial(DevelopmentHandler, directory=str(project)))
    server.control_relay = ControlRelay()
    return server


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=5173)
    parser.add_argument('--host', default='127.0.0.1',
                        help='Bind address; use 0.0.0.0 to serve on the local network.')
    args = parser.parse_args()
    with create_server(Path(__file__).resolve().parents[1], args.port, args.host) as server:
        server.serve_forever()
