"""Source projection contracts: canonical writes, read-only previews and input collision refusal."""
from pathlib import Path
from types import SimpleNamespace
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from workspace import WorkspaceView
from imports.context import ImportSession


class SourceLayoutTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.project = Path(self.temp.name).resolve()
        (self.project / 'src/content').mkdir(parents=True)
        (self.project / 'generated/assets').mkdir(parents=True)
        (self.project / 'src/content/manifest.json').write_text('{"version":1,"files":[]}')
        (self.project / 'generated/assets/example.bin').write_bytes(b'old')

    def session(self, check):
        with patch('imports.context.PROJECT', self.project):
            session = ImportSession(SimpleNamespace(target=None, check=check), 'example',
                                    policy={'content': [], 'outputs': ['assets/example.bin']})
        self.addCleanup(session.workspace.close)
        return session

    def test_preview_leaves_sources_and_dist_untouched(self):
        session = self.session(True)
        self.assertEqual((session.dist / 'assets/example.bin').read_bytes(), b'old')
        session.binary(session.dist / 'assets/example.bin', b'new')
        with patch('imports.context.PROJECT', self.project):
            session.finish()
        self.assertEqual((self.project / 'generated/assets/example.bin').read_bytes(), b'old')
        self.assertFalse((self.project / 'dist').exists())

    def test_commit_routes_to_generated_and_cannot_write_unowned_output(self):
        session = self.session(False)
        session.binary(session.dist / 'assets/example.bin', b'new')
        with patch('imports.context.PROJECT', self.project):
            session.finish()
        self.assertEqual((self.project / 'generated/assets/example.bin').read_bytes(), b'new')
        self.assertFalse((self.project / 'dist').exists())
        session.binary(session.dist / 'app.js', b'unowned')
        with self.assertRaisesRegex(ValueError, 'cannot write'):
            session.finish()
        self.assertFalse((self.project / 'src/app.js').exists())

    def test_duplicate_input_is_rejected_and_unsafe_paths_cannot_route(self):
        (self.project / 'src/assets').mkdir()
        (self.project / 'src/assets/example.bin').write_bytes(b'conflict')
        with self.assertRaisesRegex(ValueError, 'Duplicate build input'):
            WorkspaceView(self.project)
        (self.project / 'src/assets/example.bin').unlink()
        view = WorkspaceView(self.project)
        self.addCleanup(view.close)
        with self.assertRaises(ValueError):
            view.destination(view.root / '../escape', generated=True)


if __name__ == '__main__':
    unittest.main()
