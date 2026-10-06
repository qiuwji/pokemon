"""Offline audio-tool contracts; use synthetic source/pack data, never installed plugins."""
import hashlib
import importlib.util
import json
from pathlib import Path
import struct
import tempfile
import unittest
from unittest.mock import patch


def module(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(name + '.py'))
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


installer = module('install-bgm')
renderer = module('render-bgm')


def files(directory):
    return {str(p.relative_to(directory)): p.read_bytes() for p in directory.rglob('*') if p.is_file()}


def fixture(root):
    project, pack = root / 'project', root / 'pack'
    (project / 'dist/plugins').mkdir(parents=True)
    (project / 'dist/content/maps').mkdir(parents=True)
    pack.mkdir()
    (project / 'dist/plugins/catalog.json').write_text('{"version":1,"plugins":[]}')
    (project / 'dist/content/manifest.json').write_text(json.dumps({'files': [
        {'section': 'maps', 'key': 'town', 'path': 'maps/town.json'},
        {'section': 'maps', 'key': 'other', 'path': 'maps/other.json'}]}))
    (project / 'dist/content/maps/town.json').write_text('{"music":"MUS_TEST","title":"town"}')
    (project / 'dist/content/maps/other.json').write_text('{"music":"OTHER"}')
    audio = b'fixture-resource'
    (pack / 'mus_test.wav').write_bytes(audio)
    (pack / 'plugin.js').write_text('// fixture')
    (pack / 'manifest.json').write_text(json.dumps({'id': 'test-music', 'song': 'MUS_TEST',
        'assetName': 'mus_test.wav', 'cueId': 'test-music:mus_test',
        'assetSha256': hashlib.sha256(audio).hexdigest(),
        'cue': {'source': 'assets/audio/test-music/mus_test.wav'}}))
    return project, pack


class AudioTools(unittest.TestCase):
    def test_loop_integrates_changed_tempo_in_integer_frames(self):
        # 24 ticks/beat; '[' at 0.5s; tempo doubles at 1s; ']' at 2s.
        track = bytes.fromhex('00ff510307a12018ff01015b18ff51030f424018ff01015d00ff2f00')
        midi = b'MThd' + struct.pack('>IHHH', 6, 0, 1, 24) + b'MTrk' + struct.pack('>I', len(track)) + track
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / 'song.mid'; path.write_bytes(midi)
            self.assertEqual(renderer.midi_loop(path, 44100), (22050, 88200))
            path.write_bytes(midi[:-1])
            with self.assertRaisesRegex(ValueError, 'Truncated'):
                renderer.midi_loop(path, 44100)

    def test_preview_install_and_reinstall_only_owned_music(self):
        with tempfile.TemporaryDirectory() as d:
            project, pack = fixture(Path(d)); before = files(project)
            report = installer.install(pack, project, True)
            self.assertEqual(report['maps'], ['town']); self.assertEqual(files(project), before)
            installer.install(pack, project)
            self.assertEqual(json.loads((project / 'dist/content/maps/town.json').read_text())['music'], 'test-music:mus_test')
            self.assertEqual((project / 'dist/content/maps/other.json').read_bytes(), before['dist/content/maps/other.json'])
            self.assertFalse(json.loads((project / 'dist/plugins/catalog.json').read_text())['plugins'][0]['enabled'])
            self.assertEqual(installer.install(pack, project, True)['files'], [])

    def test_corrupt_audio_fails_before_any_game_write(self):
        with tempfile.TemporaryDirectory() as d:
            project, pack = fixture(Path(d)); before = files(project)
            (pack / 'mus_test.wav').write_bytes(b'corrupt')
            with self.assertRaisesRegex(ValueError, 'checksum'):
                installer.install(pack, project)
            self.assertEqual(files(project), before)

    def test_file_commit_failure_restores_already_committed_files(self):
        with tempfile.TemporaryDirectory() as d:
            project, pack = fixture(Path(d)); before = files(project)
            replace, calls = installer.os.replace, []

            def fail_once(source, destination):
                calls.append(destination)
                if len(calls) == 2:
                    raise OSError('disk failure')
                replace(source, destination)

            with patch.object(installer.os, 'replace', fail_once):
                with self.assertRaisesRegex(OSError, 'disk failure'):
                    installer.install(pack, project)
            self.assertEqual(files(project), before)


class AudioBundleTools(unittest.TestCase):
    def test_music_fades_are_pack_policy_without_changing_sound_or_loop(self):
        bundler = module('bundle-audio')
        data = {'cue': {'loopStart': 2, 'loopEnd': 8, 'fadeInMs': 0, 'fadeOutMs': 0}}
        fades = {'fadeInMs': 500, 'fadeOutMs': 250}
        _, _, music = bundler.resolve_cue('bundle', 'MUS_TEST', 'music', 'music', None, data, fades)
        self.assertEqual(music['fadeInMs'], 500)
        self.assertEqual(music['loopStart'], 2)
        _, _, sound = bundler.resolve_cue('bundle', 'SE_TEST', 'sound', 'sounds', None, data, fades)
        self.assertEqual(sound['fadeInMs'], 0)
        self.assertFalse(sound['loop'])
        with self.assertRaisesRegex(ValueError, 'fade policy'):
            bundler.resolve_cue('bundle', 'MUS_TEST', 'music', 'music', None, data, {'fadeInMs': -1})

    def test_shared_provenance_survives_consolidation_without_duplicate_input_tables(self):
        bundler = module('bundle-audio')
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            project, _pack = fixture(root)
            build = root / 'rendered'
            build.mkdir()
            songs = ['SE_ONE', 'SE_TWO']
            inputs = [{'path': 'sound/sample.wav', 'sha256': 'a' * 64}]
            for song in songs:
                folder = build / song
                folder.mkdir()
                audio = song.encode()
                (folder / 'track.wav').write_bytes(audio)
                (folder / 'manifest.json').write_text(json.dumps({
                    'id': song.lower(), 'song': song, 'sourceRevision': 'source',
                    'renderer': {'revision': 'renderer'}, 'assetName': 'track.wav',
                    'assetSha256': hashlib.sha256(audio).hexdigest(), 'inputs': inputs,
                    'frames': 10, 'durationSeconds': 1, 'midiLoopStartFrame': 0,
                    'midiLoopEndFrame': 10, 'cue': {'source': 'track.wav', 'loop': False},
                }))
            spec = root / 'bundle.json'
            spec.write_text(json.dumps({'id': 'bundle', 'title': 'test',
                'sourceRevision': 'source', 'rendererRevision': 'renderer',
                'sounds': [{'song': song} for song in songs]}))
            before = files(project)
            bundler.install(spec, build, project, check=True)
            self.assertEqual(files(project), before)
            bundler.install(spec, build, project)
            manifest = json.loads((project / 'dist/assets/audio/bundle/manifest.json').read_text())
            self.assertEqual(len(manifest['sourceInputSets']), 1)
            for track in manifest['tracks']:
                self.assertEqual(manifest['sourceInputSets'][track['inputSet']],
                                 {'sound/sample.wav': 'a' * 64})
                asset = project / 'dist' / track['source']
                self.assertEqual(hashlib.sha256(asset.read_bytes()).hexdigest(), track['assetSha256'])


class SourceAudioTests(unittest.TestCase):
    def test_portable_pack_installs_into_source_inputs_and_repeated_preview_is_empty(self):
        with tempfile.TemporaryDirectory() as temp:
            project, pack = fixture(Path(temp))
            (project / 'dist').rename(project / 'src')
            (project / 'generated').mkdir()
            before = files(project)
            installer.install(pack, project, check=True)
            self.assertEqual(files(project), before)
            installer.install(pack, project)
            self.assertFalse((project / 'dist').exists())
            self.assertTrue((project / 'generated/plugins/test-music.js').exists())
            self.assertTrue((project / 'generated/assets/audio/test-music/mus_test.wav').exists())
            self.assertEqual(json.loads((project / 'src/content/maps/town.json').read_text())['music'],
                             'test-music:mus_test')
            self.assertEqual(installer.install(pack, project, check=True)['files'], [])


if __name__ == '__main__':
    unittest.main()
