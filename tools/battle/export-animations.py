"""Extract battle scripts, native sprite tiles and the fixed-point sine table. Reference is read-only.

The audit covers the complete move table; authored choreography only covers animation-scope.json.
--check compares bytes without creating directories or changing any input/output.
"""
import argparse
import hashlib
import io
import json
import math
import re
import subprocess
import struct
import wave
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
REVISION = '731ad5bfd6e6f265508d0efcca0ba42f9dcf5881'


def split_args(text):
    """RGB(a,b,c) and other macro expressions remain one argument, never evaluated."""
    return [v.strip() for v in re.split(r',\s*(?![^()]*\))', text) if v.strip()]


def extract(source):
    programs, labels, instructions = {}, [], []
    for number, raw in enumerate(source.splitlines(), 1):
        line = raw.split('@', 1)[0].strip()
        if not line or line.startswith('.') or line.startswith('#'):
            continue
        match = re.fullmatch(r'(\w+)::?', line)
        if match:
            if instructions:
                for label in labels:
                    programs[label] = instructions
                labels, instructions = [], []
            labels.append(match[1])
        elif labels:
            op, _, args = line.partition(' ')
            instructions.append({'op': op, 'args': split_args(args), 'line': number})
    for label in labels:
        programs[label] = instructions
    return programs


def dependencies(programs, label):
    seen, ops, callbacks, tags = set(), set(), set(), set()
    def visit(name):
        if name in seen or name not in programs:
            return
        seen.add(name)
        for cmd in programs[name]:
            ops.add(cmd['op'])
            if cmd['op'] in ('createsprite', 'createvisualtask', 'createsoundtask'):
                callbacks.add(cmd['args'][0])
            if cmd['op'] == 'loadspritegfx':
                tags.add(cmd['args'][0])
            for arg in cmd['args']:
                if arg in programs:
                    visit(arg)
    visit(label)
    return {'labels': sorted(seen), 'commands': sorted(ops), 'callbacks': sorted(callbacks), 'tags': sorted(tags)}


def export(source, scope):
    revision = subprocess.check_output(['git', '-C', str(source), 'rev-parse', 'HEAD'], text=True).strip()
    if revision != REVISION:
        raise ValueError('Battle reference must use fixed revision ' + REVISION)
    if subprocess.run(['git', '-C', str(source), 'diff', '--quiet', 'HEAD']).returncode:
        raise ValueError('Battle reference has modified tracked files')
    inputs = {}
    def read(path):
        data = (source / path).read_bytes()
        inputs[path] = hashlib.sha256(data).hexdigest()
        return data
    text = read('data/battle_anim_scripts.s').decode()
    programs = extract(text)
    # The dispatch table is the owner of move coverage, including aliases and MOVE_NONE.
    table = text.split('gBattleAnims_Moves::', 1)[1].split('gBattleAnims_StatusConditions::', 1)[0]
    moves = [(label, 'MOVE_' + label[5:]) for label in re.findall(r'\.4byte\s+(Move_\w+)', table) if label != 'Move_COUNT']
    if len(moves) != 355:
        raise ValueError('Expected MOVE_NONE and all 354 Gen3 move entries')
    selected = {id: 'Move_' + id.upper() for id in scope['moves']}
    needed = set()
    for label in selected.values():
        if label not in programs:
            raise ValueError('Missing selected native script ' + label)
        needed.update(dependencies(programs, label)['labels'])
    audit = {id[5:].lower(): {'entry': label, 'choreography': id[5:].lower() in selected,
                              **dependencies(programs, label)} for label, id in moves}
    trig = read('src/trig.c').decode().split('gSineTable[] =', 1)[1].split('};', 1)[0]
    sine = [round(float(value) * 256) for value in re.findall(r'Q_8_8\((-?[\d.]+)\)', trig)][:256]
    if len(sine) != 256:
        raise ValueError('Expected 256 native sine values')
    degrees = read('src/trig.c').decode().split('gSineDegreeTable[] =', 1)[1].split('};', 1)[0]
    degree_sine = [round(float(value) * 4096) for value in re.findall(r'Q_4_12\((-?[\d.]+)\)', degrees)][:180]
    outputs, assets = {}, {}
    for id, config in scope['assets'].items():
        image = Image.open(io.BytesIO(read(config.get('imagePath') or 'graphics/battle_anims/sprites/' + config['image'])))
        palette = Image.open(io.BytesIO(read(config.get('palettePath') or 'graphics/battle_anims/sprites/' + config['palette']))).getpalette()
        if 'replaceFrame' in config:
            replacement = config['replaceFrame']
            opened = Image.open(io.BytesIO(read(replacement['imagePath'])))
            image.paste(opened, (0, replacement['frame'] * config['height']))
        width, height = config['width'], config['height']
        tiles = [image.crop((x, y, x + 8, y + 8)) for y in range(0, image.height, 8) for x in range(0, image.width, 8)]
        if 'tileOrder' in config:
            tiles = [tiles[index] for index in config['tileOrder']]
        tiles_per_frame = width * height // 64
        frames = (len(tiles) + tiles_per_frame - 1) // tiles_per_frame
        sheet = Image.new('RGBA', (width, frames * height))
        for index, tile in enumerate(tiles):
            rgba = Image.new('RGBA', (8, 8))
            rgba.putdata([(*palette[int(v)*3:int(v)*3+3], 0 if int(v) == 0 else 255) for v in tile.getdata()])
            frame, local = divmod(index, tiles_per_frame)
            sheet.paste(rgba, ((local % (width // 8)) * 8, frame * height + (local // (width // 8)) * 8))
        buffer = io.BytesIO()
        sheet.save(buffer, format='PNG')
        path = 'generated/assets/battle/' + id + '.png'
        outputs[path] = buffer.getvalue()
        assets[id] = {'resource': 'battle-anim-' + id, 'path': path, 'width': width, 'height': height, 'frames': frames}
    for terrain, folder in scope.get('entryBackgrounds', {}).items():
        base = 'graphics/battle_environment/' + folder + '/'
        image = Image.open(io.BytesIO(read(base + 'anim_tiles.png')))
        data = read(base + 'anim_map.bin')
        entries = struct.unpack('<' + 'H' * (len(data) // 2), data)
        palette = [tuple(map(int, line.split())) for line in read(base + 'palette.pal').decode().splitlines()[3:] if line.strip()]
        screen = Image.new('RGBA', (256, 256))
        for address, entry in enumerate(entries):
            index, bank = entry & 1023, (entry >> 12) - 2
            tile = image.crop((index % (image.width // 8) * 8, index // (image.width // 8) * 8,
                               index % (image.width // 8) * 8 + 8, index // (image.width // 8) * 8 + 8))
            painted = Image.new('RGBA', (8, 8))
            painted.putdata([(*palette[bank * 16 + int(v)], 255) if int(v) else (0, 0, 0, 0) for v in tile.getdata()])
            if entry & 1024:
                painted = painted.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            if entry & 2048:
                painted = painted.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
            screen.paste(painted, (address % 32 * 8, address // 32 * 8))
        buffer = io.BytesIO()
        screen.save(buffer, format='PNG')
        id = 'entry_' + terrain
        path = 'generated/assets/battle/' + id + '.png'
        outputs[path] = buffer.getvalue()
        assets[id] = {'resource': 'battle-anim-' + id, 'path': path, 'width': 256, 'height': 256, 'frames': 1}
        # BG3 uses two 32×32 screen blocks, not a repeated 240-pixel crop.
        board_tiles = Image.open(io.BytesIO(read(base + 'tiles.png')))
        board_map = read(base + 'map.bin')
        board_entries = struct.unpack('<' + 'H' * (len(board_map) // 2), board_map)
        board = Image.new('RGBA', (512, 112))
        for y in range(14):
            for x in range(64):
                entry = board_entries[(x // 32) * 1024 + y * 32 + x % 32]
                index, bank = entry & 1023, (entry >> 12) - 2
                tx, ty = index % (board_tiles.width // 8) * 8, index // (board_tiles.width // 8) * 8
                tile = board_tiles.crop((tx, ty, tx + 8, ty + 8))
                painted = Image.new('RGBA', (8, 8))
                painted.putdata([(*palette[bank * 16 + int(v)], 255) if int(v) else (0, 0, 0, 255) for v in tile.getdata()])
                if entry & 1024:
                    painted = painted.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
                if entry & 2048:
                    painted = painted.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
                board.paste(painted, (x * 8, y * 8))
        buffer = io.BytesIO()
        board.save(buffer, format='PNG')
        id = 'board_' + terrain
        path = 'generated/assets/battle/' + id + '.png'
        outputs[path] = buffer.getvalue()
        assets[id] = {'resource': 'battle-anim-' + id, 'path': path, 'width': 512, 'height': 112, 'frames': 1}
    audio_manifest = ROOT / 'generated/assets/audio/emerald-audio/manifest.json'
    audio_data = audio_manifest.read_bytes()
    audio_frames = {track['cueId']: math.ceil(track['durationSeconds'] * 60)
                    for track in json.loads(audio_data)['tracks'] if track['kind'] == 'sound'}
    audio_inputs = {str(audio_manifest.relative_to(ROOT)): hashlib.sha256(audio_data).hexdigest()}
    for cue, path in scope.get('sounds', {}).items():
        data = (ROOT / path).read_bytes()
        audio_inputs[path] = hashlib.sha256(data).hexdigest()
        with wave.open(io.BytesIO(data)) as sound:
            audio_frames[cue] = math.ceil(sound.getnframes() / sound.getframerate() * 60)
    module = {'assets': assets, 'sine': sine, 'degreeSine': degree_sine, 'audioFrames': audio_frames}
    outputs['generated/packs/emerald/battle-animation-assets.js'] = (
        '// Generated by tools/battle/export-animations.py; do not edit.\nexport const NATIVE_BATTLE_ASSETS = ' + json.dumps(module, ensure_ascii=False, indent=2) + ';\n').encode()
    outputs['generated/packs/emerald/battle-animation-audit.json'] = (json.dumps({'revision': revision, 'moves': audit,
        'selectedSourcePrograms': {id: programs[id] for id in sorted(needed)}}, indent=2) + '\n').encode()
    # Source callbacks/macros are hashed as well as the scripts; an unchanged script is insufficient evidence.
    for path in ['src/battle_anim.c', 'src/battle_anim_mons.c', 'src/battle_anim_mon_movement.c',
                 'src/battle_anim_normal.c', 'src/battle_anim_effects_3.c', 'src/battle_anim_fire.c',
                 'src/battle_anim_water.c', 'src/data/battle_anim.h', 'asm/macros/battle_anim_script.inc',
                 'src/battle_interface.c', 'src/battle_controller_player.c', 'src/battle_controller_opponent.c',
                 'src/battle_intro.c', 'src/battle_main.c', 'src/battle_gfx_sfx_util.c', 'src/battle_anim_throw.c',
                 'src/pokeball.c', 'src/data.c', 'src/palette.c', 'data/battle_scripts_1.s']:
        read(path)
    manifest = {'revision': revision, 'inputs': inputs, 'outputs': {p: hashlib.sha256(v).hexdigest() for p, v in outputs.items()},
                'audioInputs': audio_inputs,
                'moveTableEntries': len(audit), 'choreographedMoves': scope['moves'], 'visualValidation': 'pending'}
    outputs['generated/packs/emerald/battle-animation-manifest.json'] = (json.dumps(manifest, indent=2) + '\n').encode()
    return outputs


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=ROOT / 'work/pokeemerald')
    parser.add_argument('--target', type=Path, default=ROOT)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    scope = json.loads((ROOT / 'tools/battle/animation-scope.json').read_text())
    outputs = export(args.source, scope)
    changed = [name for name, data in outputs.items() if not (args.target / name).is_file() or (args.target / name).read_bytes() != data]
    if not args.check:
        for name in changed:
            path = args.target / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(outputs[name])
    print(json.dumps({'mode': 'check' if args.check else 'write', 'changed': changed}))
    return 1 if args.check and changed else 0


if __name__ == '__main__':
    raise SystemExit(main())
