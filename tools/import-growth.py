"""Import original egg frames as transparent pixel assets."""
import argparse
from pathlib import Path
from PIL import Image
parser=argparse.ArgumentParser();parser.add_argument('source');args=parser.parse_args()
r=Path(args.source)/'graphics/pokemon/egg';d=Path(__file__).resolve().parents[1]/'dist/assets'
palette=[tuple(map(int,v.split()))for v in (r/'normal.pal').read_text().splitlines()[3:19]]
for name in ['front','icon','hatch','shard']:
    image=Image.open(r/f'{name}.png');output=Image.new('RGBA',image.size);output.putdata([(*palette[int(v)%16],255 if int(v)%16 else 0)for v in image.getdata()]);output.save(d/f'egg-{name}.png');print(name,image.size)
