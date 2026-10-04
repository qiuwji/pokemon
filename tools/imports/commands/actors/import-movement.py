"""Import configured actor sheets, preserving later-stage animation fields."""
import argparse
from PIL import Image
from imports.context import ImportSession, arguments, source_argument

parser = argparse.ArgumentParser(description=__doc__)
source_argument(parser)
args = arguments(parser, selectors=('actors',), profile=True)
session = ImportSession(args, 'import-movement.py')
data = session.load()
config = session.profile['movement']
palette = [tuple(map(int,line.split())) for line in (session.source / config['palette']).read_text().splitlines()[3:19]]
sheets = {entry['id']:entry for entry in config['sheets']}
if len(sheets) != len(config['sheets']):
    raise ValueError('Duplicate movement sheet IDs')
for ident in session.select('actors', sheets):
    entry = sheets[ident]
    image = Image.open(session.source / entry['path'])
    output = Image.new('RGBA', image.size)
    output.putdata([(*palette[int(v)%16],255 if int(v)%16 else 0) for v in image.getdata()])
    session.image(output, session.dist / f'assets/actor-{ident}.png')
    data['actors'][ident] = {**data['actors'].get(ident,{}), **entry['definition']}
session.content(data)
session.finish()
