"""Real local HTTP boundary and generic scenario assertions; no game-domain mocking claims."""
import json
import sys
import threading
import unittest
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOLS))
from control_relay import ControlHandler, ControlRelay
from control import request, run_scenario


class RelayTests(unittest.TestCase):
    def test_relay_routes_sequence_and_idempotency_without_rule_access(self):
        relay = ControlRelay()
        client = relay.handle('POST', 'connect', {})['client']
        relay.handle('POST', 'reply', {'client': client, 'message': {'protocol': 1, 'type': 'hello', 'session': 's', 'nextSequence': 1}})
        body = {'id': 'a', 'command': 'core.field.move', 'input': {'direction': 'up'}}
        receipt = relay.handle('POST', 'command', body)
        self.assertEqual(receipt['sequence'], 1)
        self.assertEqual(relay.handle('POST', 'command', body), receipt)
        with self.assertRaisesRegex(ValueError, 'conflict'):
            relay.handle('POST', 'command', dict(body, input={'direction': 'down'}))
        commands = relay.handle('POST', 'poll', {'client': client})['messages']
        self.assertEqual(len(commands), 1)
        relay.handle('POST', 'reply', {'client': client, 'message': dict(commands[0], type='result', ok=True, result=True)})
        self.assertFalse(relay.handle('GET', 'result/a', {})['pending'])
        self.assertEqual(relay.handle('POST', 'command', body), receipt)
        self.assertEqual(relay.handle('POST', 'poll', {'client': client})['messages'], [])
        relay.handle('POST', 'connect', {})
        with self.assertRaisesRegex(ValueError, 'expired'):
            relay.handle('POST', 'poll', {'client': client})

    def test_http_routes_and_scenario_uses_real_transport(self):
        class Handler(ControlHandler, SimpleHTTPRequestHandler):
            def log_message(self, *args): pass
        server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(TOOLS)))
        server.control_relay = ControlRelay()
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        endpoint = 'http://127.0.0.1:' + str(server.server_port) + '/control'
        try:
            client = request(endpoint + '/connect', {})['client']
            request(endpoint + '/reply', {'client': client, 'message': {'protocol': 1, 'type': 'hello', 'session': 's', 'nextSequence': 1}})
            self.assertTrue(request(endpoint + '/status')['connected'])
            def peer():
                # Protocol port substitute only; game behavior is covered by JS/plugin tests.
                import time
                for _ in range(100):
                    messages = request(endpoint + '/poll', {'client': client})['messages']
                    if messages:
                        for message in messages:
                            request(endpoint + '/reply', {'client': client, 'message': dict(message, type='result', ok=True, result={'value': 2})})
                        return
                    time.sleep(0.01)
            peer_thread = threading.Thread(target=peer)
            peer_thread.start()
            result = run_scenario(endpoint, {'steps': [{'command': 'core.query', 'assert': [{'path': 'value', 'equals': 2}]}]})
            self.assertTrue(result['ok'])
            peer_thread.join()
        finally:
            server.shutdown(); server.server_close(); thread.join()


if __name__ == '__main__':
    unittest.main()
