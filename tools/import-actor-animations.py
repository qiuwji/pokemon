"""Import named Acro timelines from the read-only C reference; leave pixel sheets untouched."""
import argparse
import json
import re
import struct
from pathlib import Path
parser = argparse.ArgumentParser()
parser.add_argument('source')
args = parser.parse_args()
root = Path(args.source)
dist = Path(__file__).resolve().parents[1] / 'dist'
text = (root / 'src/data/object_events/object_event_anims.h').read_text()
data = json.loads((dist / 'content.json').read_text())
actor = data['actors']['BrendanAcroBike']
header = (dist / 'assets/actor-BrendanAcroBike.png').read_bytes()[:24]
width = struct.unpack('>I', header[16:20])[0]
actor['frameCount'] = width // actor['w']
directions = {'down': 'South', 'up': 'North', 'left': 'West', 'right': 'East'}
def sequence(name):
    result = {}
    loop = None
    for direction, suffix in directions.items():
        body = re.search(r'\bsAnim_' + name + suffix + r'\[\]\s*=\s*\{(.*?)\};', text, re.S)
        if not body:
            raise ValueError('Unknown native sprite sequence: ' + name + suffix)
        result[direction] = [{'index': int(i), 'durationMs': int(n) * 1000 / 60} for i, n in re.findall(r'ANIMCMD_FRAME\((\d+),\s*(\d+)', body.group(1))]
        looping = 'ANIMCMD_JUMP' in body.group(1)
        if loop is not None and loop != looping:
            raise ValueError('Inconsistent direction loop')
        loop = looping
    return {'loop': loop, 'directions': result}
rise = sequence('BunnyHopBackWheel')
lower = sequence('StandingWheelieBackWheel')
raised = {'loop': False, 'directions': {d: [frames[-1]] for d, frames in rise['directions'].items()}}
actor['animations'] = {
    'wheelie-rise': {'idle': rise, 'move': rise},
    'wheelie-lower': {'idle': lower, 'move': lower},
    'wheelie': {'idle': raised, 'move': sequence('MovingWheelie')},
    'hop': {'idle': rise, 'move': rise},
}
(dist / 'content.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
print('Imported Acro sprite timelines from C; frames:', actor['frameCount'])
