"""Decode native gbagfx 4bpp PNG inputs; indexed and grayscale have different semantics."""
from PIL import Image


def paint_4bpp(image, palette, transparent=False):
    if image.mode not in ('P', 'L'):
        raise ValueError(f'Unsupported source image mode: {image.mode}')
    if len(palette) != 16:
        raise ValueError('A 4bpp palette needs 16 colors')
    # gbagfx first truncates to 4bpp, then inverts non-indexed images.
    indices = [int(v) % 16 if image.mode == 'P' else 15 - int(v) % 16
               for v in image.getdata()]
    output = Image.new('RGBA', image.size)
    output.putdata([(*palette[v], 0 if transparent and v == 0 else 255) for v in indices])
    return output
