"""Import configured actor timelines from the read-only C reference; leave pixels untouched."""
from imports.context import PROJECT, ImportSession, arguments, source_argument
import argparse
import json
import re
import struct
from pathlib import Path
parser = argparse.ArgumentParser()
source_argument(parser)
args = arguments(parser, profile=True)
session = ImportSession(args, "import-actor-animations.py")
root = Path(args.source)
target = session.target
text = (root / 'src/data/object_events/object_event_anims.h').read_text()
data = session.load()
def sequence(spec, directions):
    spec = {'name': spec} if isinstance(spec, str) else spec
    name = spec['name']
    offset = spec.get('indexOffset', 0)
    result = {}
    loop = None
    for direction, suffix in directions.items():
        body = re.search(r'\bsAnim_' + name + suffix + r'\[\]\s*=\s*\{(.*?)\};', text, re.S)
        if not body:
            raise ValueError('Unknown native sprite sequence: ' + name + suffix)
        result[direction] = [{'index': int(i) + offset, 'durationMs': int(n) * 1000 / 60}
                             for i, n in re.findall(r'ANIMCMD_FRAME\((\d+),\s*(\d+)', body.group(1))]
        looping = 'ANIMCMD_JUMP' in body.group(1)
        if loop is not None and loop != looping:
            raise ValueError('Inconsistent direction loop')
        loop = looping
    return {'loop': loop, 'directions': result} | ({'clock': spec['clock']} if 'clock' in spec else {})

for config in session.profile['actorAnimations']:
    actor_id = config['actor']
    if actor_id not in data['actors']:
        raise ValueError('Missing prerequisite actor: ' + actor_id)
    actor = data['actors'][actor_id]
    header = (target / f'assets/actor-{actor_id}.png').read_bytes()[:24]
    width = struct.unpack('>I', header[16:20])[0]
    actor['frameCount'] = width // actor['w']
    clips = {key: sequence(spec, config['directions']) for key, spec in config['sequences'].items()}
    for key, source in config['held'].items():
        clips[key] = {'loop': False, 'directions': {direction: [frames[-1]]
                        for direction, frames in clips[source]['directions'].items()}}
    actor['animations'] = {pose: {mode: clips[clip] for mode, clip in modes.items()}
                            for pose, modes in config['poses'].items()}
    print('Imported actor sprite timelines from C:', actor_id, 'frames:', actor['frameCount'])
session.content(data)

session.finish()
