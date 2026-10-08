"""Native introduction resource bounds and provenance; no automated gameplay."""
import hashlib
import json
from pathlib import Path
import unittest
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]


class NewGameArtTests(unittest.TestCase):
    def test_all_shipped_assets_match_the_generated_provenance(self):
        manifest = json.loads((ROOT / 'generated/packs/emerald/new-game-source.json').read_text())
        self.assertEqual(manifest['revision'], '731ad5bfd6e6f265508d0efcca0ba42f9dcf5881')
        self.assertIn('graphics/pokemon/lotad/anim_front.png', manifest['inputs'])
        self.assertIn('src/main_menu.c', manifest['inputs'])
        self.assertIn('sound/direct_sound_samples/cries/lotad.wav', manifest['inputs'])
        for path, digest in manifest['outputs'].items():
            self.assertEqual(hashlib.sha256((ROOT / path).read_bytes()).hexdigest(), digest, path)

    def test_palette_stages_and_lotad_second_frame_are_present(self):
        platform = Image.open(ROOT / 'generated/assets/ui/new-game-platform.png')
        self.assertEqual(platform.size, (256, 9 * 160))
        self.assertNotEqual(platform.crop((0, 0, 256, 160)).tobytes(), platform.crop((0, 1280, 256, 1440)).tobytes())
        lotad = Image.open(ROOT / 'generated/assets/ui/new-game-lotad.png')
        self.assertEqual(lotad.size, (64, 128))
        self.assertNotEqual(lotad.crop((0, 0, 64, 64)).tobytes(), lotad.crop((0, 64, 64, 128)).tobytes())
        self.assertEqual(lotad.getpixel((0, 0))[3], 0)

    def test_naming_portraits_use_the_selected_emerald_actors_palette(self):
        manifest = json.loads((ROOT / 'generated/packs/emerald/new-game-source.json').read_text())
        self.assertNotIn('graphics/naming_screen/rival.pal', manifest['inputs'])
        for gender, actor in [('male', 'brendan'), ('female', 'may')]:
            path = f'graphics/object_events/palettes/{actor}.pal'
            self.assertIn(path, manifest['inputs'])
            palette = [tuple(map(int, line.split())) for line in (ROOT / 'work/pokeemerald' / path).read_text().splitlines()[3:] if line.strip()]
            source = Image.open(ROOT / f'work/pokeemerald/graphics/object_events/pics/people/{actor}/walking.png').crop((0, 0, 16, 32))
            portrait = Image.open(ROOT / f'generated/assets/ui/new-game-icon-{gender}.png')
            self.assertEqual(portrait.size, (16, 32))
            self.assertEqual(list(portrait.getdata()), [(*palette[index], 0 if index == 0 else 255) for index in source.getdata()])
