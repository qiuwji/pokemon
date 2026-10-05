"""Exercise the real importer against the pinned reference, with isolated outputs."""
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from PIL import Image

PROJECT = Path(__file__).resolve().parents[2]


class DetailSpriteImportTests(unittest.TestCase):
    def test_animation_source_preview_transparency_and_partial_metadata(self):
        with tempfile.TemporaryDirectory() as temporary:
            target = Path(temporary) / 'dist'
            shutil.copytree(PROJECT / 'dist/content', target / 'content')
            metadata = target / 'packs/emerald/detail-sprite-frames.js'
            metadata.parent.mkdir(parents=True)
            metadata.write_text('export const DETAIL_SPRITE_FRAMES = {\n  custom: 1,\n};\n')
            command = [sys.executable, str(PROJECT / 'tools/import.py'), 'detail-sprites',
                       '--species', 'poochyena', '--target', str(target)]
            preview = subprocess.run(command + ['--check'], cwd=temporary, text=True, capture_output=True)
            self.assertEqual(preview.returncode, 0, preview.stderr)
            self.assertFalse((target / 'assets').exists())
            generated = subprocess.run(command, cwd=temporary, text=True, capture_output=True)
            self.assertEqual(generated.returncode, 0, generated.stderr)
            with Image.open(target / 'assets/poochyena-detail.png') as image:
                self.assertEqual(image.size, (64, 128))
                for y in (0, 64):
                    self.assertEqual(image.crop((0, y, 64, y + 64)).getchannel('A').getextrema(), (0, 255))
            self.assertIn('custom: 1', metadata.read_text())
            self.assertIn('poochyena: 2', metadata.read_text())
            sources = json.loads((target / 'assets/detail-sprite-source.json').read_text())['inputs']
            self.assertIn('graphics/pokemon/poochyena/anim_front.png', sources)
            self.assertNotIn('graphics/pokemon/poochyena/front.png', sources)
            self.assertIn('graphics/pokemon/icon_palettes/icon_palette_2.pal', sources)
            palette = [tuple(map(int, line.split())) for line in
                       (PROJECT / 'work/pokeemerald/graphics/pokemon/icon_palettes/icon_palette_2.pal').read_text().splitlines()[3:19]]
            with Image.open(PROJECT / 'work/pokeemerald/graphics/pokemon/poochyena/icon.png') as native, Image.open(target / 'assets/poochyena-icon.png') as actual:
                for value, color in zip(native.getdata(), actual.getdata()):
                    self.assertEqual(color, (*palette[int(value) % 16], 255 if int(value) % 16 else 0))
            repeat = subprocess.run(command + ['--check'], cwd=temporary, text=True, capture_output=True)
            self.assertEqual(repeat.returncode, 0, repeat.stderr)
            self.assertIn('"files": []', repeat.stdout)


if __name__ == '__main__':
    unittest.main()
