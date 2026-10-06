"""Clock PNG regression without a browser, reference checkout or production writes."""
import sys
import unittest
from pathlib import Path
from PIL import Image
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from imports.pixel_assets import paint_4bpp


class ClockAssetsTests(unittest.TestCase):
    def test_grayscale_and_indexed_zero_decode_differently(self):
        palette = [(v, v, v) for v in range(16)]
        source = Image.new('L', (4, 1))
        source.putdata([255, 0, 85, 34])
        self.assertEqual(list(paint_4bpp(source, palette, True).getdata()),
                         [(0, 0, 0, 0), (15, 15, 15, 255), (10, 10, 10, 255), (13, 13, 13, 255)])
        indexed = Image.new('P', (2, 1))
        indexed.putdata([0, 15])
        self.assertEqual(list(paint_4bpp(indexed, palette, True).getdata()),
                         [(0, 0, 0, 0), (15, 15, 15, 255)])

    def test_shipped_hands_do_not_cover_the_dial_and_period_tiles_are_present(self):
        assets = Path(__file__).resolve().parents[2] / 'generated/assets'
        for gender in ('male', 'female'):
            image = Image.open(assets / f'wallclock-{gender}-hands.png')
            self.assertEqual(image.size, (64, 144))
            self.assertEqual(image.getpixel((0, 0))[3], 0)
            for y in (0, 64):
                alpha = image.crop((0, y, 64, y + 64)).getchannel('A')
                self.assertLess(sum(v > 0 for v in alpha.getdata()), 300)
                self.assertGreater(sum(v > 0 for v in alpha.getdata()), 30)
            for x in (0, 32):
                self.assertIsNotNone(image.crop((x, 128, x + 16, 144)).getbbox())


if __name__ == '__main__':
    unittest.main()
