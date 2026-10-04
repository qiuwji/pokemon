"""Send one game command through the local development relay. Print only JSON."""
import argparse
import json
from pathlib import Path
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def request(url, data=None, timeout=5):
    raw = None if data is None else json.dumps(data).encode()
    with urlopen(Request(url, data=raw, headers={'Content-Type': 'application/json'}), timeout=timeout) as response:
        return json.load(response)


def execute(endpoint, body, timeout=10):
    receipt = request(endpoint + '/command', body)
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        wait_ms = min(25000, max(1, int((deadline - time.monotonic()) * 1000)))
        result = request(endpoint + '/result/' + receipt['id'] + '?waitMs=' + str(wait_ms), timeout=wait_ms / 1000 + 2)
        if not result['pending']:
            return result['response']
    raise ValueError('Result timeout; query result/' + receipt['id'] + ' or reuse the same id, never blindly replay')


def value_at(value, path):
    for key in path.split('.') if path else []:
        value = value[int(key)] if isinstance(value, list) else value[key]
    return value


def run_scenario(endpoint, scenario, timeout=10):
    steps = scenario.get('steps', [])
    if not isinstance(steps, list) or not 1 <= len(steps) <= 128:
        raise ValueError('Scenario requires 1-128 steps')
    records = []
    for step in steps:
        body = {'command': step['command'], 'input': step.get('input', {}), 'policy': step.get('policy', 'reject')}
        if 'state' in step:
            body.update(observe='ai-control:observe', observeInput=json.dumps(step['state']))
        response = execute(endpoint, body, timeout)
        if not response['ok']:
            raise ValueError('Scenario command failed: ' + json.dumps(response))
        for check in step.get('assert', []):
            value = value_at(response['result'], check['path'])
            passed = value == check['equals'] if 'equals' in check else value >= check['gte']
            if not passed:
                raise ValueError('Scenario assertion failed: ' + step['command'] + ':' + check['path'])
        records.append({'command': step['command'], 'ok': True, 'assertions': len(step.get('assert', []))})
    return {'ok': True, 'name': scenario.get('name', 'scenario'), 'steps': records}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:5173/control')
    parser.add_argument('--submit', action='store_true', help='Submit without waiting; useful for dialogue-blocked actions')
    parser.add_argument('--result', help='Read an existing request result without replaying')
    parser.add_argument('--scenario', type=Path, help='JSON command/assertion steps; stops on first failure')
    parser.add_argument('--command', help='For example ai-control:observe or core.field.move')
    parser.add_argument('--input', default='{}', help='JSON object')
    parser.add_argument('--id', help='Stable retry id; reuse only with identical command/input')
    parser.add_argument('--state', choices=['summary', 'world', 'battle', 'party', 'bag', 'collection', 'all'], help='Attach post-command AI observation')
    parser.add_argument('--since', type=int, help='Observation event cursor; use with --state')
    parser.add_argument('--timeout', type=float, default=10)
    parser.add_argument('--wait', action='store_true', help='Wait for readiness, not retry a handler failure')
    args = parser.parse_args()
    endpoint = args.url.rstrip('/')
    try:
        if args.result:
            print(json.dumps(request(endpoint + '/result/' + args.result), ensure_ascii=False)); return 0
        if args.scenario:
            if args.command:
                raise ValueError('Choose command or scenario')
            print(json.dumps(run_scenario(endpoint, json.loads(args.scenario.read_text()), args.timeout), ensure_ascii=False)); return 0
        if not args.command:
            print(json.dumps(request(endpoint + '/status'), ensure_ascii=False)); return 0
        body = {'command': args.command, 'input': json.loads(args.input), 'policy': 'wait' if args.wait else 'reject'}
        if args.state:
            body['observe'] = 'ai-control:observe'
            body['observeInput'] = json.dumps({'detail': args.state, **({'since': args.since} if args.since is not None else {})})
        elif args.since is not None:
            raise ValueError('--since requires --state')
        if args.id:
            body['id'] = args.id
        if args.submit:
            print(json.dumps(request(endpoint + '/command', body))); return 0
        response = execute(endpoint, body, args.timeout)
        print(json.dumps(response, ensure_ascii=False)); return 0 if response['ok'] else 1
    except (ValueError, KeyError, TypeError, HTTPError, URLError) as error:
        detail = error.read().decode() if isinstance(error, HTTPError) else str(error)
        print(json.dumps({'error': detail}, ensure_ascii=False)); return 1


if __name__ == '__main__':
    sys.exit(main())
