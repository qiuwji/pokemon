"""Single strict parser for original move metadata used by both import workflows."""
import re

TARGETS = {
    'SELECTED': 'selected', 'BOTH': 'opponents', 'RANDOM': 'random',
    'USER': 'self', 'FOES_AND_ALLY': 'all-others',
    'DEPENDS': 'user-or-selected', 'USER_OR_SELECTED': 'user-or-selected',
    'OPPONENTS_FIELD': 'opponents-field',
}


def parse_moves(moves, battle_util):
    sound_block = re.search(r'sSoundMovesTable\[\].*?\{(.*?)\}', battle_util, re.S)
    if not sound_block:
        raise ValueError('Missing sound move reference')
    sounds = {name.lower() for name in re.findall(r'MOVE_(\w+)', sound_block[1])}
    result = {}
    for raw, body in re.findall(r'\[MOVE_(\w+)\]\s*=\s*\{(.*?)\n\s*\},', moves, re.S):
        ident = raw.lower()
        if ident == 'none':
            continue
        if ident in result:
            raise ValueError('Duplicate move metadata: ' + ident)
        def number(field):
            match = re.search(r'\.' + field + r'\s*=\s*(-?\d+)\s*,', body)
            if not match:
                raise ValueError(f'Missing numeric field {ident}.{field}')
            return int(match[1])
        def word(field, prefix):
            match = re.search(r'\.' + field + r'\s*=\s*' + prefix + r'_(\w+)', body)
            if not match:
                raise ValueError(f'Missing symbolic field {ident}.{field}')
            return match[1]
        target = word('target', 'MOVE_TARGET')
        if target not in TARGETS:
            raise ValueError(f'Unknown target {ident}: {target}')
        move_type = word('type', 'TYPE').lower()
        flags = [name.lower() for name in re.findall(r'FLAG_(\w+)', body)]
        result[ident] = {
            'name': ident.replace('_', ' '),
            'effect': ident if ident in ('surf', 'earthquake') else word('effect', 'EFFECT').lower(),
            'power': number('power'), 'type': 'normal' if move_type == 'mystery' else move_type,
            'accuracy': number('accuracy'), 'pp': number('pp'),
            'chance': number('secondaryEffectChance'), 'priority': number('priority'),
            'target': TARGETS[target], 'contact': 'makes_contact' in flags,
            'sound': ident in sounds, 'flags': flags,
        }
    if not result:
        raise ValueError('No moves parsed from reference')
    return result
