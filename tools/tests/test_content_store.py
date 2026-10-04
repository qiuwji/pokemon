import hashlib
import io
import json
import shutil
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from imports.context import ImportSession, PROJECT


class ContentStoreTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.dist = Path(self.temporary.name) / 'dist'
        shutil.copytree(PROJECT / 'dist/content', self.dist / 'content')

    def session(self, check=False):
        return ImportSession(SimpleNamespace(target=self.dist, check=check), 'import-encounters.py')

    def hashes(self):
        return {str(path.relative_to(self.dist)): hashlib.sha256(path.read_bytes()).hexdigest()
                for path in self.dist.rglob('*') if path.is_file()}

    def edit(self, session):
        data = session.load()
        data['maps']['Route101']['encounterRate'] += 1
        return data

    def test_check_reports_changes_without_any_writes(self):
        session = self.session(check=True)
        before = self.hashes()
        session.content(self.edit(session))
        with redirect_stdout(io.StringIO()) as report:
            session.finish()
        result = json.loads(report.getvalue())
        self.assertEqual(result['files'], ['content/maps/Route101/map.json'])
        self.assertEqual(before, self.hashes())

    def test_commit_only_changes_owned_map_metadata(self):
        session = self.session()
        before = self.hashes()
        session.content(self.edit(session))
        with redirect_stdout(io.StringIO()):
            session.finish()
        after = self.hashes()
        self.assertEqual([path for path in before if before[path] != after[path]], ['content/maps/Route101/map.json'])
        self.assertEqual(self.session().load()['maps']['Route101']['encounterRate'], 21)

    def test_noop_preserves_noncanonical_fragments_and_manifest_bytes(self):
        for path in self.dist.rglob('*.json'):
            path.write_text(json.dumps(json.loads(path.read_text()),
                                       ensure_ascii=False, separators=(',', ':')) + '\n\n')
        before = self.hashes()
        for check in (True, False):
            with self.subTest(check=check):
                session = self.session(check=check)
                session.content(session.load())
                with redirect_stdout(io.StringIO()) as output:
                    session.finish()
                self.assertEqual(json.loads(output.getvalue())['files'], [])
                self.assertEqual(before, self.hashes())

    def test_reverted_proposal_discards_previously_staged_content(self):
        session = self.session()
        data = session.load()
        before = self.hashes()
        changed = json.loads(json.dumps(data))
        changed['maps']['Route101']['encounterRate'] += 1
        session.content(changed)
        session.content(data)
        with redirect_stdout(io.StringIO()) as output:
            session.finish()
        self.assertEqual(json.loads(output.getvalue())['files'], [])
        self.assertEqual(before, self.hashes())

    def test_other_domain_changes_reject_before_writes(self):
        session = self.session()
        data = session.load()
        data['evolutions'] = {}
        before = self.hashes()
        with self.assertRaisesRegex(ValueError, 'cannot modify evolutions'):
            session.content(data)
        self.assertEqual(before, self.hashes())

    def test_invalid_reference_rejects_before_writes(self):
        session = self.session()
        data = session.load()
        data['maps']['Route101']['encounters'][0]['species'] = 'missing'
        before = self.hashes()
        with self.assertRaises(Exception):
            session.content(data)
        self.assertEqual(before, self.hashes())

    def test_replacement_failure_restores_previous_bytes(self):
        session = self.session()
        session.content(self.edit(session))
        # A second valid owned map file makes failure happen after a successful replace.
        data = session.load()
        data['maps']['Route101']['encounterRate'] += 1
        data['maps']['Route103']['encounterRate'] += 1
        session.content(data)
        before = self.hashes()
        import os
        original = os.replace
        calls = 0
        def replace(source, target):
            nonlocal calls
            calls += 1
            if calls == 2:
                raise OSError('injected write failure')
            return original(source, target)
        with patch('imports.context.os.replace', replace), redirect_stdout(io.StringIO()):
            with self.assertRaisesRegex(OSError, 'injected write failure'):
                session.finish()
        self.assertEqual(before, self.hashes())
        self.assertFalse(list(self.dist.rglob('.import-*')))

if __name__ == '__main__':
    unittest.main()
