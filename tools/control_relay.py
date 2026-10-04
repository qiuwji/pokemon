"""Local HTTP bridge: transports protocol-1 JSON; never imports or modifies game rules."""
import json
import threading
import time
import uuid
from collections import deque
from urllib.parse import urlsplit, parse_qs


class ControlRelay:
    def __init__(self):
        self.lock = threading.Condition()
        self.polling = False
        self.poll_deadline = 0
        self.client = None
        self.hello = None
        self.next_sequence = 1
        self.queue = deque()
        self.results = {}
        self.last_poll = 0

    def handle(self, method, route, body):
        parts = urlsplit(route)
        route = parts.path
        params = parse_qs(parts.query)
        wait_ms = body.get('waitMs', params.get('waitMs', [0])[0])
        try:
            wait_ms = int(wait_ms)
        except (ValueError, TypeError):
            raise ValueError('Invalid waitMs')
        if not 0 <= wait_ms <= 25000:
            raise ValueError('Invalid waitMs')
        with self.lock:
            if route == 'connect' and method == 'POST':
                self.lock.notify_all()
                self.client = uuid.uuid4().hex
                self.polling = False
                self.poll_deadline = 0
                self.hello = None
                self.queue.clear()
                self.results.clear()
                self.next_sequence = 1
                self.last_poll = time.monotonic()
                return {'client': self.client}
            if route == 'status' and method == 'GET':
                return {'connected': bool(self.hello) and (time.monotonic() - self.last_poll < 5 or self.poll_deadline > time.monotonic()),
                        'hello': self.hello, 'pending': len(self.queue)}
            if route == 'command' and method == 'POST':
                if not self.hello or (time.monotonic() - self.last_poll >= 5 and self.poll_deadline <= time.monotonic()):
                    raise ValueError('No connected game; open ?control=1')
                if len(self.queue) >= 32:
                    raise ValueError('Control queue full')
                request_id = body.get('id') or uuid.uuid4().hex
                if not isinstance(request_id, str) or not 1 <= len(request_id) <= 128:
                    raise ValueError('Invalid request id')
                command, data = body.get('command'), body.get('input', {})
                if not isinstance(command, str) or not isinstance(data, dict) or body.get('policy', 'reject') not in ('wait', 'reject'):
                    raise ValueError('Invalid control command')
                fingerprint = json.dumps([command, data, body.get('policy', 'reject'), body.get('observe'), body.get('observeInput')], sort_keys=True)
                if request_id in self.results:
                    record = self.results[request_id]
                    if record['fingerprint'] != fingerprint:
                        raise ValueError('Request id conflict')
                    return {'id': request_id, 'sequence': record['sequence']}
                while len(self.results) >= 256:
                    completed = next((key for key, value in self.results.items() if value['result'] is not None), None)
                    if completed is None:
                        raise ValueError('Too many pending requests')
                    del self.results[completed]
                request = {'protocol': 1, 'type': 'command', 'session': self.hello['session'],
                           'id': request_id, 'sequence': self.next_sequence,
                           'command': command, 'input': data, 'policy': body.get('policy', 'reject')}
                for key in ('observe', 'observeInput'):
                    if key in body:
                        request[key] = body[key]
                if len(json.dumps(request).encode()) > 16384:
                    raise ValueError('Control request too large')
                self.results[request_id] = {'sequence': self.next_sequence, 'fingerprint': fingerprint, 'result': None}
                self.next_sequence += 1
                self.queue.append(request)
                self.lock.notify_all()
                return {'id': request_id, 'sequence': request['sequence']}
            if route.startswith('result/') and method == 'GET':
                record = self.results.get(route[7:])
                if record is None:
                    raise ValueError('Unknown or expired request')
                owner = self.client
                deadline = time.monotonic() + wait_ms / 1000
                while record['result'] is None and self.client == owner:
                    remaining = deadline - time.monotonic()
                    if remaining <= 0:
                        break
                    self.lock.wait(remaining)
                if self.client != owner:
                    raise ValueError('Control connection expired')
                return {'pending': record['result'] is None, 'response': record['result']}
            if body.get('client') != self.client or not self.client:
                raise ValueError('Control connection expired')
            if route == 'poll' and method == 'POST':
                owner = self.client
                if self.polling:
                    raise ValueError('A command poll is already active')
                self.polling = True
                self.last_poll = time.monotonic()
                self.poll_deadline = self.last_poll + wait_ms / 1000 + 1
                try:
                    deadline = time.monotonic() + wait_ms / 1000
                    while not self.queue and self.client == owner:
                        remaining = deadline - time.monotonic()
                        if remaining <= 0:
                            break
                        self.lock.wait(remaining)
                    if self.client != owner:
                        raise ValueError('Control connection expired')
                    messages = list(self.queue)
                    self.queue.clear()
                    return {'messages': messages}
                finally:
                    if self.client == owner:
                        self.polling = False
                        self.poll_deadline = 0
                        self.last_poll = time.monotonic()
            if route == 'reply' and method == 'POST':
                message = body.get('message', {})
                if not isinstance(message, dict):
                    raise ValueError('Expected protocol object')
                if message.get('protocol') != 1:
                    raise ValueError('Invalid protocol')
                if message.get('type') == 'hello':
                    if self.hello is not None or not isinstance(message.get('session'), str) or message.get('nextSequence') != 1:
                        raise ValueError('Invalid hello')
                    self.hello = message
                elif message.get('session') == (self.hello or {}).get('session'):
                    record = self.results.get(message.get('id'))
                    if not record or record['sequence'] != message.get('sequence'):
                        raise ValueError('Unknown response')
                    record['result'] = message
                else:
                    raise ValueError('Response session mismatch')
                self.lock.notify_all()
                return {'ok': True}
            if route == 'close' and method == 'POST':
                self.client = None
                self.hello = None
                self.poll_deadline = 0
                self.lock.notify_all()
                return {'ok': True}
            raise ValueError('Unknown control route')


class ControlHandler:
    """Mix into the local static handler. Browser requests must be same-origin."""
    def control_request(self, method):
        if not self.path.startswith('/control/'):
            return False
        try:
            origin = self.headers.get('Origin')
            if origin and origin != 'http://' + self.headers.get('Host', ''):
                raise ValueError('Control requires same origin')
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 <= size <= 2097152:
                raise ValueError('Control payload too large')
            body = json.loads(self.rfile.read(size)) if size else {}
            if not isinstance(body, dict):
                raise ValueError('Expected JSON object')
            response = self.server.control_relay.handle(method, self.path[len('/control/'):], body)
            status = 200
        except (ValueError, KeyError, TypeError) as error:
            response, status = {'error': str(error)}, 400
        raw = json.dumps(response, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        try:
            self.wfile.write(raw)
        except (BrokenPipeError, ConnectionResetError):
            pass
        return True

    def do_GET(self):
        if not self.control_request('GET'):
            super().do_GET()

    def do_POST(self):
        if not self.control_request('POST'):
            self.send_error(404)
