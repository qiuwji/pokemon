"""Translate supported source movement arrays to story data; fail rather than drop unknown steps."""
import re

FRAME_MS = 1000 / 60


def movement_commands(block, actor, *, map_id=None):
    if block['kind'] != 'movement':
        raise ValueError('Expected movement array: ' + block['label'])
    commands, locked = [], False
    for instruction in block['instructions']:
        op = instruction['op']
        if op == 'step_end':
            if locked:
                raise ValueError('Unbalanced facing lock: ' + block['label'])
            return commands
        if op in ('lock_facing_direction', 'unlock_facing_direction'):
            next_locked = op == 'lock_facing_direction'
            if next_locked == locked:
                raise ValueError('Unbalanced facing lock: ' + block['label'])
            locked = next_locked
            continue
        delay = re.fullmatch(r'delay_(\d+)', op)
        if delay:
            commands.append({'type': 'wait', 'ms': int(delay[1]) * FRAME_MS})
            continue
        face = re.fullmatch(r'(?:face|walk_in_place_faster)_(up|down|left|right)', op)
        if face:
            commands.append({'type': 'face', 'actor': actor, 'dir': face[1]})
            continue
        walk = re.fullmatch(r'walk(_fast)?_(up|down|left|right)', op)
        if walk:
            command = {'type': 'move', 'actor': actor, 'path': [walk[2]]}
            if walk[1]:
                command['running'] = True
            if locked:
                command['keepFacing'] = True
            commands.append(command)
            continue
        # Jump landing dust is not emitted by our presentation-only in-place hop.
        if op == 'disable_jump_landing_ground_effect':
            continue
        hop = re.fullmatch(r'jump_in_place_(up|down|left|right)', op)
        if hop and map_id:
            commands.extend([
                {'type': 'face', 'actor': actor, 'dir': hop[1]},
                {'type': 'presentation', 'id': 'emerald:actor-hop', 'payload': {'map': map_id, 'actor': actor}},
            ])
            continue
        raise ValueError(f'Unsupported movement {op}: {block["path"]}:{instruction["line"]}')
    raise ValueError('Missing step_end: ' + block['label'])


def movement_document(packet, label, actor, *, map_id=None):
    block = packet['blocks'].get(label)
    if block is None:
        raise ValueError('Unknown packet movement label: ' + label)
    if not isinstance(actor,str) or not actor:
        raise ValueError('Actor ID is required')
    return {'source': {key: block[key] for key in ('label','path','line','sha256')},
            'commands': movement_commands(block,actor,map_id=map_id)}


def main():
    import argparse
    import json
    from pathlib import Path
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--packet', type=Path, required=True, help='Verified extraction packet; read only')
    parser.add_argument('--label', required=True)
    parser.add_argument('--actor', required=True, help='Stable web actor ID, not a C local ID')
    parser.add_argument('--map', dest='map_id', help='Required for in-place visual hops')
    args = parser.parse_args()
    packet = json.loads(args.packet.read_text(encoding='utf-8'))
    print(json.dumps(movement_document(packet,args.label,args.actor,map_id=args.map_id),ensure_ascii=False,indent=2))


if __name__ == '__main__':
    import sys
    try:
        main()
    except (ValueError,KeyError,OSError) as error:
        print('Movement conversion failed: ' + str(error),file=sys.stderr)
        raise SystemExit(1)
