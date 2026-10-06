"""Export the native Fly bird using the original player palette (OBJ palette slot 0).

python3 tools/plugins/export-flight-art.py [--source /path/pokeemerald] [--check]
Requires Pillow from tools/requirements.txt. The reference checkout is read-only.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]


def export(source, target, check):
    inputs = {}

    def read(relative):
        data = (source / relative).read_bytes()
        inputs[relative] = hashlib.sha256(data).hexdigest()
        return data

    bird = Image.open(io.BytesIO(read('graphics/field_effects/pics/bird.png')))
    if bird.mode != 'P' or bird.size != (32, 32):
        raise ValueError('Expected native 32x32 indexed Fly bird')
    outputs = {}
    for gender, palette in [('male', 'brendan'), ('female', 'may')]:
        lines = read(f'graphics/object_events/palettes/{palette}.pal').decode().splitlines()
        colors = [tuple(map(int, line.split())) for line in lines[3:] if line.strip()]
        if len(colors) != 16:
            raise ValueError('Expected a 16-color player palette')
        image = Image.new('RGBA', bird.size)
        image.putdata([(*colors[index], 0 if index == 0 else 255) for index in bird.getdata()])
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')
        outputs[f'fly-bird-{gender}.png'] = buffer.getvalue()
    outputs['source.json'] = (json.dumps({
        'source': 'pret/pokeemerald',
        'reference': 'src/field_effect.c:CreateFlyBirdSprite / SpriteCB_FlyBirdSwoopDown',
        'dimensions': [32, 32], 'transparentIndex': 0,
        'inputs': inputs,
        'outputs': {name: hashlib.sha256(data).hexdigest() for name, data in outputs.items()},
    }, indent=2) + '\n').encode()
    changed = []
    for name, data in outputs.items():
        path = target / name
        if not path.exists() or path.read_bytes() != data:
            changed.append(name)
            if not check:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(data)
    print(json.dumps({'check': check, 'files': changed}, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=ROOT / 'work/pokeemerald')
    parser.add_argument('--target', type=Path, default=ROOT / 'generated/plugins/high-flight/assets')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    export(args.source, args.target, args.check)
