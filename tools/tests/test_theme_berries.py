"""Export real native sprites and compare pixels, not merely PNG dimensions."""
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import unittest
from PIL import Image

PROJECT = Path(__file__).resolve().parents[2]
SOURCE = PROJECT / 'work/pokeemerald'


def native_image(path, palette_slot):
    with Image.open(SOURCE / 'graphics/object_events/pics/berry_trees' / path) as sheet:
        colors = [tuple(map(int, line.split())) for line in
                  (SOURCE / f'graphics/object_events/palettes/npc_{palette_slot}.pal').read_text().splitlines()[3:]]
        image = Image.new('RGBA', sheet.size)
        image.putdata([(*colors[index], 255 if index else 0) for index in sheet.getdata()])
        return image


class ThemeBerryTests(unittest.TestCase):
    def test_horizontal_frames_alias_palette_and_sprout_have_the_exact_native_visible_pixels(self):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder)
            subprocess.run([sys.executable, str(PROJECT / 'tools/ui/export-theme.py'), '--target', str(target)],
                           cwd=PROJECT, check=True, capture_output=True)
            table = (SOURCE / 'src/data/object_events/berry_tree_graphics_tables.h').read_text()
            for berry in ['oran','cheri','pecha','leppa','chesto','rawst','aspear','persim','pinap']:
                symbol = 'ITEM_' + berry.upper() + '_BERRY'
                picture = re.search(r'\['+symbol+r' - FIRST_BERRY_INDEX\]\s*= sPicTable_(\w+)BerryTree', table)[1].lower()
                palette = re.search(r'\['+symbol+r' - FIRST_BERRY_INDEX\]\s*= gBerryTreePaletteSlotTable_(\w+)', table)[1]
                slots = re.search(r'gBerryTreePaletteSlotTable_'+palette+r'\[\] = \{([^}]+)', table)[1]
                sheet = native_image(picture + '.png', int(slots.split(',')[2]))
                self.assertEqual(sheet.size, (96, 32))
                for stage, left in [('taller',0),('flowering',32),('ripe',64)]:
                    with self.subTest(berry=berry, stage=stage):
                        actual = Image.open(target / f'berry-{berry}-{stage}.png').convert('RGBA')
                        self.assertIsNotNone(actual.getchannel('A').getbbox(), 'invisible mature sprites are a regression')
                        self.assertEqual(actual.tobytes(), sheet.crop((left,0,left+16,32)).tobytes())
            sprout = Image.open(target / 'berry-sprouted.png').convert('RGBA')
            self.assertEqual(sprout.tobytes(), native_image('sprout.png',4).crop((0,0,16,16)).tobytes())
            self.assertIsNotNone(sprout.getchannel('A').getbbox())
            actor = Image.open(target / 'actor-BerryTreeLateStages.png').convert('RGBA')
            self.assertEqual(actor.size, (192,32))
            self.assertEqual(actor.crop((0,0,96,32)).tobytes(), native_image('pecha.png',4).tobytes())
            subprocess.run([sys.executable, str(PROJECT / 'tools/ui/export-theme.py'), '--target', str(target), '--check'],
                           cwd=PROJECT, check=True, capture_output=True)


if __name__ == '__main__':
    unittest.main()
