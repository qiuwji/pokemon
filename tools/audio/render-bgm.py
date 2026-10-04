"""Render a source MIDI/voicegroup to a portable BGM pack; no game/source writes.

Requires a separately built, pinned poryaaaa_render. This is an offline resource
tool, not a runtime synthesizer or a general AGB assembly interpreter.
"""
import argparse
from fractions import Fraction
import hashlib
import json
from pathlib import Path
import re
import shutil
import struct
import subprocess
import tempfile
import wave

PROJECT = Path(__file__).resolve().parents[2]


def midi_loop(path, rate):
    """Read SMF meta events and integrate tempo exactly, matching renderer rounding."""
    data = path.read_bytes()
    if len(data) < 14 or data[:4] != b'MThd':
        raise ValueError('Missing MIDI header')
    size, fmt, tracks, division = struct.unpack('>IHHH', data[4:14])
    if fmt not in (0, 1) or not division or division & 0x8000:
        raise ValueError('Only metrical MIDI formats 0/1 are supported')
    position, tempos, markers = 8 + size, [], {}
    for _ in range(tracks):
        if data[position:position + 4] != b'MTrk':
            raise ValueError('Missing MIDI track')
        length = int.from_bytes(data[position + 4:position + 8], 'big')
        end = position + 8 + length
        if end > len(data):
            raise ValueError('Truncated MIDI track')
        track = data[position + 8:end]
        position = end
        cursor, tick, running = 0, 0, None

        def byte():
            nonlocal cursor
            if cursor >= len(track):
                raise ValueError('Truncated MIDI event')
            value = track[cursor]
            cursor += 1
            return value

        def variable():
            result = 0
            for _ in range(4):
                value = byte()
                result = (result << 7) | (value & 127)
                if value < 128:
                    return result
            raise ValueError('Invalid MIDI variable length')

        while cursor < len(track):
            tick += variable()
            status = byte()
            if status < 128:
                if running is None:
                    raise ValueError('Missing MIDI running status')
                cursor -= 1
                status = running
            if status == 255:
                kind, count = byte(), variable()
                payload = track[cursor:cursor + count]
                if len(payload) != count:
                    raise ValueError('Truncated MIDI metadata')
                cursor += count
                if kind == 81:
                    if count != 3 or not int.from_bytes(payload, 'big'):
                        raise ValueError('Invalid MIDI tempo')
                    tempos.append((tick, int.from_bytes(payload, 'big')))
                if kind in (1, 6) and payload in (b'[', b']'):
                    markers.setdefault(payload, tick)
                if kind == 47:
                    break
            elif status in (240, 247):
                count = variable()
                if cursor + count > len(track):
                    raise ValueError('Truncated MIDI sysex')
                cursor += count
            elif 128 <= status < 240:
                running = status
                for _ in range(1 if status >> 4 in (12, 13) else 2):
                    if byte() >= 128:
                        raise ValueError('Invalid MIDI channel data')
            else:
                raise ValueError('Unsupported MIDI status')
    if b'[' not in markers or b']' not in markers or markers[b']'] <= markers[b'[']:
        raise ValueError('This BGM pack requires valid [ / ] loop markers')

    def frame(target):
        total, previous, tempo = Fraction(0), 0, 500000
        for tick, value in sorted(tempos):
            if tick >= target:
                break
            total += Fraction((tick - previous) * tempo * rate, division * 1000000)
            previous, tempo = tick, value
        total += Fraction((target - previous) * tempo * rate, division * 1000000)
        return int(total + Fraction(1, 2))

    return frame(markers[b'[']), frame(markers[b']'])


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def render(args):
    config = json.loads(args.config.read_text())
    if not re.fullmatch(r'[a-z][a-z0-9-]*', config['id']) or not re.fullmatch(r'MUS_[A-Z0-9_]+', config['song']):
        raise ValueError('Invalid music pack or original song identity')
    if not isinstance(config['title'], str) or not config['title'].strip() or not 0 <= config['cueVolume'] <= 1:
        raise ValueError('Invalid music title or playback volume')
    local_id = config['song'].lower()
    asset_name = local_id + '.wav'
    source = args.source.resolve()
    revision = subprocess.check_output(['git', '-C', str(source), 'rev-parse', 'HEAD'], text=True).strip()
    if revision != config['sourceRevision']:
        raise ValueError('Reference revision differs from configuration')
    midi = source / config['midi']
    rate = config['sampleRate']
    start, end = midi_loop(midi, rate)
    body = end - start
    # Keep intro + first cycle; repeat the second cycle to retain incoming tails.
    loop_start, loop_end = end, end + body
    destination = args.output.resolve()
    if destination.exists():
        raise ValueError('Output already exists; choose a new path before replacing an accepted pack')
    plan = {'song': config['song'], 'voicegroup': config['voicegroup'], 'output': str(destination),
            'introFrames': start, 'loopStartFrame': loop_start, 'loopEndFrame': loop_end,
            'sampleRate': rate, 'sourceRevision': revision}
    if args.check:
        print(json.dumps(plan, indent=2))
        return
    if args.renderer is None:
        raise ValueError('Pass --renderer with the pinned executable; see tools/audio/README.md')
    renderer = args.renderer.resolve()
    if not renderer.is_file():
        raise ValueError('Build the pinned poryaaaa renderer first; see tools/audio/README.md')
    command = [str(renderer), str(source), config['voicegroup'], '--midi', str(midi),
               '--song-volume', str(config['songVolume']), '--reverb', str(config['reverb']),
               '--polyphony', str(config['polyphony']), '--sample-rate', str(rate),
               '--pcm-mix-rate', str(config['pcmMixRate']), '--loop-count', '3', '--fadeout', '0', '--tail', '0']
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=destination.parent, prefix='.emerald-bgm-') as scratch:
        staging = Path(scratch)
        raw = staging / 'render.wav'
        result = subprocess.run(command + ['--output', str(raw)], capture_output=True, text=True, check=True)
        if result.stderr.strip():
            raise ValueError('Renderer diagnostic requires review: ' + result.stderr)
        with wave.open(str(raw)) as sound:
            if sound.getnchannels() != 2 or sound.getsampwidth() != 2 or sound.getframerate() != rate or sound.getnframes() < loop_end + body:
                raise ValueError('Unexpected renderer PCM output')
            params = sound.getparams()
            pcm = sound.readframes(loop_end)
        if not any(pcm):
            raise ValueError('Silent render rejected')
        output = staging / 'pack'
        output.mkdir()
        with wave.open(str(output / asset_name), 'wb') as sound:
            sound.setparams(params)
            sound.writeframes(pcm)
        cue = {'kind': 'music', 'source': f"assets/audio/{config['id']}/{asset_name}", 'volume': config['cueVolume'],
               'loop': True, 'loopStart': loop_start / rate, 'loopEnd': loop_end / rate,
               'fadeInMs': 0, 'fadeOutMs': 0}
        plugin = {'id': config['id'], 'apiVersion': 1, 'version': '1.0.0', 'dataVersion': 1, 'permissions': []}
        plugin_text = '// @generated by tools/audio/render-bgm.py; regenerate from source/config.\n'
        plugin_text += 'export const bgmPlugin = {\n  ...' + json.dumps(plugin, ensure_ascii=False) + ',\n'
        plugin_text += '  setup(api) { api.presentation.audio(' + json.dumps(local_id) + ', ' + json.dumps(cue) + '); },\n};\n'
        (output / 'plugin.js').write_text(plugin_text)
        # Hash every audio source input, not only the MIDI. The loader resolves nested banks.
        inputs = [{'path': str(path.relative_to(source)), 'sha256': digest(path)}
                  for path in sorted((source / 'sound').rglob('*'))
                  if path.is_file() and path.suffix in ('.mid', '.cfg', '.inc', '.wav', '.pcm', '.s')]
        metadata = {**plan, 'output': '.', 'id': config['id'], 'assetName': asset_name, 'cueId': config['id'] + ':' + local_id,
                    'midiLoopStartFrame': start, 'midiLoopEndFrame': end, 'frames': loop_end,
                    'durationSeconds': loop_end / rate, 'cue': cue, 'renderConfig': config,
                    'renderer': {'repository': 'https://github.com/huderlem/poryaaaa',
                                 'revision': config['rendererRevision'], 'binarySha256': digest(renderer)},
                    'assetSha256': digest(output / asset_name), 'inputs': inputs,
                    'verification': {'rendered': True, 'referenceListening': 'pending', 'inGameListening': 'pending'},
                    'fidelity': 'Source MIDI and original voicegroups/samples via m4a emulation; not verified bit-exact hardware output.'}
        (output / 'manifest.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n')
        (output / 'render.log').write_text(result.stdout.replace(str(source), '<reference>').replace(str(raw), '<render.wav>'))
        shutil.copyfile(PROJECT / 'tools/audio/install-bgm.py', output / 'install.py')
        preview = (PROJECT / 'tools/audio/preview.html').read_text()
        preview = preview.replace('{{song}}', config['song']).replace('{{asset}}', asset_name)
        (output / 'preview.html').write_text(preview)
        (output / 'README.md').write_text(f"# {config['title']} BGM 包\n\n"
            f"曲目：{config['song']}。先打开 preview.html 或 {asset_name} 试听。\n\n"
            f'在项目根执行 `python3 {destination.name}/install.py --check` 预演；去掉 --check 安装。\n'
            f"刷新游戏，以 `?plugins={config['id']}` 启用试听插件，走到对应地图并点击 ♪ 开启声音。\n"
            '插件默认关闭，不改变规则/存档；安装仅绑定当前同原曲的地图并复制音频/登记插件。\n'
            '原作数据重新导入覆盖 music 后，可再次运行安装命令。\n\n'
            '音乐包含引子和两遍循环，游戏循环第二遍以保留已建立的尾音。普通播放器会在文件末尾停止。\n'
            '这是源资料离线渲染试听版，硬件逐位保真、原作对照听音及游戏内听音尚未验收。\n'
            '完整战斗/剧情选曲和短曲恢复不在本单曲包范围。\n\n'
            '复生成器、固定依赖与命令见项目 tools/audio/README.md；循环、哈希和来源见 manifest.json。\n')
        if destination.exists():
            raise ValueError('Output appeared during rendering; refusing to replace it')
        output.rename(destination)
    print(json.dumps({**plan, 'durationSeconds': loop_end / rate}, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=PROJECT / 'work/pokeemerald')
    parser.add_argument('--config', type=Path, default=PROJECT / 'tools/audio/littleroot.json')
    parser.add_argument('--renderer', type=Path, help='Path to the separately built, pinned poryaaaa_render')
    parser.add_argument('--output', type=Path, default=PROJECT / 'emerald-littleroot-bgm')
    parser.add_argument('--check', action='store_true')
    render(parser.parse_args())
