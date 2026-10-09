"""Native text/affine palette semantics and actual opening layer exports."""
import importlib.util
from pathlib import Path
import struct
import tempfile
import unittest
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('native_art', ROOT / 'tools/ui/native_art.py')
native = importlib.util.module_from_spec(spec)
spec.loader.exec_module(native)


class NativeArtTests(unittest.TestCase):
    def fixture(self, root):
        art = native.NativeArt.__new__(native.NativeArt)
        art.source, art.inputs = root, {}
        image = Image.new('P', (8, 8))
        image.putpalette([channel for i in range(256) for channel in (i, i, i)])
        image.putdata([0x31, 0x30] * 32)
        image.save(root / 'tiles.png')
        colors = [(i, (i * 3) & 255, (i * 7) & 255) for i in range(256)]
        return art, colors

    def test_text_tiles_strip_png_bank_bits_and_use_map_bank_with_local_zero_transparency(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            art, colors = self.fixture(root)
            # Bank 2, horizontal flip: the source bank 3 must never be added again.
            (root / 'map.bin').write_bytes(struct.pack('<H', 0x2400))
            out = art.tilemap('tiles.png', 'map.bin', colors, (8, 8))
            self.assertEqual(out.getpixel((0, 0)), (*colors[32], 0))
            self.assertEqual(out.getpixel((1, 0)), (*colors[33], 255))
            opaque = art.tilemap('tiles.png', 'map.bin', colors, (8, 8), transparent=False)
            self.assertEqual(opaque.getpixel((0, 0)), (*colors[32], 255))

    def test_affine_tiles_keep_full_eight_bit_indices(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            art, colors = self.fixture(root)
            (root / 'map.bin').write_bytes(bytes([0]))
            out = art.tilemap('tiles.png', 'map.bin', colors, (8, 8), affine=True)
            self.assertEqual(out.getpixel((0, 0)), (*colors[49], 255))
            self.assertEqual(out.getpixel((1, 0)), (*colors[48], 255))

    def test_exported_leaf_layers_match_original_4bpp_palette_and_do_not_black_out_scene(self):
        art = native.NativeArt(ROOT / 'work/pokeemerald', ROOT, 'launch')
        base = 'graphics/intro/scene_1/'
        image = art.indexed(base + 'bg.png')
        colors = art.palette(base + 'bg.png')
        scene = Image.new('RGBA', (240, 160), (0, 0, 0, 255))
        for layer, offset in [(3, 0), (2, -80), (1, -24), (0, -40)]:
            actual = Image.open(ROOT / f'generated/assets/ui/launch-movie-leaf-{layer}.png').convert('RGBA')
            entries = struct.unpack('<1024H', art.read(base + f'bg{layer}_map.bin'))
            expected = []
            for y in range(256):
                for x in range(256):
                    entry = entries[(y // 8) * 32 + x // 8]
                    tile, bank = entry & 1023, entry >> 12
                    tx = 7 - x % 8 if entry & 1024 else x % 8
                    ty = 7 - y % 8 if entry & 2048 else y % 8
                    index = image.getpixel((tile % 16 * 8 + tx, tile // 16 * 8 + ty)) & 15
                    expected.append((*colors[bank * 16 + index], 255 if index else 0))
            self.assertEqual(list(actual.getdata()), expected, f'leaf layer {layer}')
            scene.alpha_composite(actual, (0, offset))
        black = sum(pixel[:3] == (0, 0, 0) for pixel in scene.getdata())
        self.assertLess(black, 240 * 160 // 100)


if __name__ == '__main__':
    unittest.main()
