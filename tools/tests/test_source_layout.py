"""Source projection contracts: canonical writes, read-only previews and input collision refusal."""
from pathlib import Path
from types import SimpleNamespace
import sys
import tempfile
import unittest
import threading
import urllib.request
import urllib.error
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from workspace import WorkspaceView
from imports.context import ImportSession
from serve import create_server


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
        self.assertEqual((session.target / 'assets/example.bin').read_bytes(), b'old')
        session.binary(session.target / 'assets/example.bin', b'new')
        with patch('imports.context.PROJECT', self.project):
            session.finish()
        self.assertEqual((self.project / 'generated/assets/example.bin').read_bytes(), b'old')
        self.assertFalse((self.project / 'dist').exists())

    def test_commit_routes_to_generated_and_cannot_write_unowned_output(self):
        session = self.session(False)
        session.binary(session.target / 'assets/example.bin', b'new')
        with patch('imports.context.PROJECT', self.project):
            session.finish()
        self.assertEqual((self.project / 'generated/assets/example.bin').read_bytes(), b'new')
        self.assertFalse((self.project / 'dist').exists())
        session.binary(session.target / 'app.js', b'unowned')
        with self.assertRaisesRegex(ValueError, 'cannot write'):
            session.finish()
        self.assertFalse((self.project / 'src/app.js').exists())

    def test_duplicate_input_is_rejected_and_unsafe_paths_cannot_route(self):
        (self.project / 'src/assets').mkdir()
        (self.project / 'src/assets/example.bin').write_bytes(b'conflict')
        with self.assertRaisesRegex(ValueError, 'Duplicate source input'):
            WorkspaceView(self.project)
        (self.project / 'src/assets/example.bin').unlink()
        view = WorkspaceView(self.project)
        self.addCleanup(view.close)
        with self.assertRaises(ValueError):
            view.destination(view.root / '../escape', generated=True)

    def test_server_reads_both_owners_and_edits_without_materializing_output(self):
        (self.project / 'src/index.html').write_text('<base href="../">source')
        server = create_server(self.project, 0)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            base = f'http://127.0.0.1:{server.server_port}'
            response = urllib.request.urlopen(base + '/?control=1')
            self.assertTrue(response.url.endswith('/src/index.html?control=1'))
            self.assertEqual(response.read(), b'<base href="../">source')
            self.assertEqual(urllib.request.urlopen(base + '/generated/assets/example.bin').read(), b'old')
            (self.project / 'generated/assets/example.bin').write_bytes(b'edited')
            self.assertEqual(urllib.request.urlopen(base + '/generated/assets/example.bin').read(), b'edited')
            self.assertEqual(urllib.request.urlopen(base + '/control/status').status, 200)
            self.assertEqual({p.name for p in self.project.iterdir()}, {'src', 'generated'})
        finally:
            server.shutdown()
            server.server_close()
            thread.join()

    def test_server_does_not_expose_other_project_files_or_traversal(self):
        (self.project / 'private.txt').write_text('not a game resource')
        server = create_server(self.project, 0)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            base = f'http://127.0.0.1:{server.server_port}'
            for route in ['/private.txt', '/src/../private.txt', '/src/%2e%2e/private.txt', '/src/content/']:
                with self.assertRaises(urllib.error.HTTPError) as error:
                    urllib.request.urlopen(base + route)
                self.assertEqual(error.exception.code, 404)
        finally:
            server.shutdown()
            server.server_close()
            thread.join()


if __name__ == '__main__':
    unittest.main()
