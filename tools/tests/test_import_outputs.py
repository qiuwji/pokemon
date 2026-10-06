"""Output contract and strict shared parsing; no image runtime or production writes required."""
import io
import json
import tempfile
import subprocess
import sys
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from types import SimpleNamespace
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from imports.context import ImportSession, PROJECT, require_files
from imports.battle_moves import parse_moves


class ImportOutputTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.target = Path(temporary.name) / 'pack'
        self.args = SimpleNamespace(target=self.target, check=True)

    def test_binary_preview_does_not_create_target(self):
        session = ImportSession(self.args, 'import-audio.py')
        session.binary(self.target / 'assets/audio/cry.wav', b'new-wave')
        with redirect_stdout(io.StringIO()) as report:
            session.finish()
        self.assertEqual(json.loads(report.getvalue())['files'], ['assets/audio/cry.wav'])
        self.assertFalse(self.target.exists())

    def test_binary_commit_and_wrong_owner_reject(self):
        self.args.check = False
        session = ImportSession(self.args, 'import-audio.py')
        target = self.target / 'assets/audio/cry.wav'
        session.binary(target, b'wave')
        with redirect_stdout(io.StringIO()):
            session.finish()
        self.assertEqual(target.read_bytes(), b'wave')
        session.text(self.target / 'engine/rules/gen3/map-weather.js', 'overwrite')
        with self.assertRaisesRegex(ValueError, 'cannot write'):
            session.finish()
        self.assertFalse((self.target / 'engine').exists())
        self.assertEqual(target.read_bytes(), b'wave')

    def test_missing_glob_fails_before_empty_generation(self):
        with self.assertRaisesRegex(ValueError, 'Missing required reference files'):
            require_files(self.target, '*/map.json')

    def test_machine_count_policy_is_configured_and_fails_before_writes(self):
        config = self.target.parent / 'invalid-config.json'
        config.write_text(json.dumps({'expectedTMCount': 51, 'expectedHMCount': 8}))
        result = subprocess.run([sys.executable, str(PROJECT / 'tools/import.py'), 'machine-learning',
                                 '--config', str(config), '--target', str(self.target)],
                                cwd=self.target.parent, text=True, capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('expectedTMCount: expected 51, parsed 50', result.stderr)
        self.assertFalse(self.target.exists())

    def test_shared_parser_matches_full_existing_reference(self):
        # This test uses the fixed read-only reference; it never regenerates production data.
        source = PROJECT / 'work/pokeemerald'
        moves = parse_moves((source / 'src/data/battle_moves.h').read_text(),
                            (source / 'src/battle_util.c').read_text())
        self.assertEqual(len(moves), 354)
        self.assertEqual(moves['earthquake']['target'], 'all-others')
        self.assertTrue(moves['tackle']['contact'])
        self.assertTrue(moves['uproar']['sound'])
        self.assertEqual(moves['curse']['target'], 'selected')

    def test_shared_parser_rejects_unknown_target_and_missing_fields(self):
        body = '[MOVE_TEST] = {\n.target = MOVE_TARGET_ALIEN,\n},'
        sound = 'sSoundMovesTable[] = { MOVE_UPROAR };'
        with self.assertRaisesRegex(ValueError, 'Unknown target test'):
            parse_moves(body, sound)
        with self.assertRaisesRegex(ValueError, 'Missing symbolic field test.type'):
            parse_moves(body.replace('ALIEN', 'SELECTED'), sound)
        with self.assertRaisesRegex(ValueError, 'No moves parsed'):
            parse_moves('', sound)

if __name__ == '__main__':
    unittest.main()
