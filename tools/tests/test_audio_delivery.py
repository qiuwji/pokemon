"""Real compressed resources, source duration bounds and transactional export ownership."""
import importlib.util
from pathlib import Path
import struct
import tempfile
import unittest
from unittest.mock import patch
import wave

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('compress_audio', ROOT / 'tools/audio/compress-audio.py')
audio = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audio)


def snapshot(root):
    return {p.relative_to(root).as_posix(): p.read_bytes() for p in root.rglob('*') if p.is_file()}


class AudioDeliveryTests(unittest.TestCase):
    def fixture(self, root):
        path = root / 'generated/assets/audio/scene.wav'
        path.parent.mkdir(parents=True)
        with wave.open(str(path), 'wb') as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(10512)
            wav.writeframes(b''.join(struct.pack('<h', (i % 32 - 16) * 600) for i in range(10512)))
        return path

    def test_real_export_preserves_sources_and_decoder_duration_and_check_never_writes(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = self.fixture(root)
            original = source.read_bytes()
            report = audio.export(root)
            self.assertEqual(source.read_bytes(), original)
            self.assertEqual(report['files'], 1)
            self.assertLess(report['deliveryBytes'], report['sourceBytes'])
            before = snapshot(root)
            self.assertEqual(audio.verify(root), report)
            self.assertEqual(snapshot(root), before)
            source.with_suffix('.mp3').write_bytes(b'corrupted')
            with self.assertRaisesRegex(ValueError, 'Corrupt compressed'):
                audio.verify(root)
            source.write_bytes(original + b'changed')
            with self.assertRaisesRegex(ValueError, 'Stale audio source'):
                audio.verify(root)

    def test_failed_encoder_cannot_install_partial_outputs(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            self.fixture(root)
            before = snapshot(root)
            with self.assertRaises(FileNotFoundError):
                audio.export(root, ffmpeg=str(root / 'missing-encoder'))
            self.assertEqual(snapshot(root), before)

    def test_failed_commit_restores_existing_outputs_and_removes_new_files(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp).resolve()
            first, second = root / 'first.mp3', root / 'second.mp3'
            first.write_bytes(b'old')
            replace, calls = audio.os.replace, []
            def fail_once(source, target):
                calls.append(target)
                if len(calls) == 2:
                    raise OSError('disk failure')
                replace(source, target)
            with patch.object(audio.os, 'replace', fail_once):
                with self.assertRaisesRegex(OSError, 'disk failure'):
                    audio.commit({first: b'new', second: b'new'})
            self.assertEqual(snapshot(root), {'first.mp3': b'old'})

    def test_all_shipped_files_have_verified_sources_hashes_and_gapless_decoded_lengths(self):
        report = audio.verify(ROOT)
        self.assertGreaterEqual(report['files'], 75)
        self.assertLess(report['deliveryBytes'], report['sourceBytes'] / 8)

    def test_duration_guard_rejects_truncated_audio_and_excessive_encoder_padding(self):
        record = {'source': 'fixture.wav', 'sourceFrames': 44100, 'sourceRate': 44100}
        audio.validate_frames(44100, record)
        audio.validate_frames(44126, record)
        for frames in [44090, 44100 + audio.MP3_FRAME + 1]:
            with self.assertRaisesRegex(ValueError, 'Compressed duration changed'):
                audio.validate_frames(frames, record)
