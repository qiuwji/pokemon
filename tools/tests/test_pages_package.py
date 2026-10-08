"""Pages shipping boundaries and nested project URL resolution."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from urllib.parse import urljoin

spec = importlib.util.spec_from_file_location('pages_package', Path(__file__).parents[1] / 'package-pages.py')
pages = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pages)


class PagesPackageTests(unittest.TestCase):
    def fixture(self, root):
        for file, body in {'src/index.html': '<base href="../"><script src="src/app.js"></script>',
                           'src/app.js': 'import "../generated/content.js";',
                           'generated/content.js': 'export const content = {};',
                           'docs/private.md': 'not shipped', 'work/reference.txt': 'not shipped'}.items():
            path = root / file
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(body)

    def test_shipping_only_runtime_preserves_subdirectory_links_and_inputs(self):
        with tempfile.TemporaryDirectory() as temp:
            root, output = Path(temp) / 'repo', Path(temp) / 'pages'
            self.fixture(root)
            before = {p.relative_to(root): p.read_bytes() for p in root.rglob('*') if p.is_file()}
            pages.package(root, output)
            self.assertEqual({p.relative_to(output).as_posix() for p in output.rglob('*') if p.is_file()},
                             {'index.html', '.nojekyll', 'src/index.html', 'src/app.js', 'generated/content.js'})
            self.assertEqual(before, {p.relative_to(root): p.read_bytes() for p in root.rglob('*') if p.is_file()})
            self.assertIn('location.search + location.hash', (output / 'index.html').read_text())
            entry = urljoin('https://example.github.io/pokemon/', 'src/index.html')
            base = urljoin(entry, '../')
            script = urljoin(base, 'src/app.js')
            module = urljoin(script, '../generated/content.js')
            self.assertEqual(module, 'https://example.github.io/pokemon/generated/content.js')
            self.assertTrue((output / module.split('/pokemon/')[1]).is_file())

    def test_output_in_repository_or_nonempty_directory_is_rejected_without_writes(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / 'repo'
            self.fixture(root)
            with self.assertRaises(ValueError):
                pages.package(root, root / 'dist')
            output = Path(temp) / 'pages'
            output.mkdir()
            (output / 'keep').write_text('keep')
            with self.assertRaises(ValueError):
                pages.package(root, output)
            self.assertEqual(list(output.iterdir()), [output / 'keep'])

    def test_runtime_symlink_never_copies_external_material(self):
        with tempfile.TemporaryDirectory() as temp:
            root, output = Path(temp) / 'repo', Path(temp) / 'pages'
            self.fixture(root)
            (root / 'src/private').symlink_to(root / 'docs', target_is_directory=True)
            with self.assertRaises(ValueError):
                pages.package(root, output)
            self.assertFalse(output.exists())


if __name__ == '__main__':
    unittest.main()
