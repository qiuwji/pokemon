# -*- coding: utf-8 -*-
"""Extract immutable map weather headers and coordinate events; never modify reference sources."""
import argparse
import json
from imports.context import PROJECT, ImportSession, arguments, source_argument, generated_header, require_files
parser = argparse.ArgumentParser(description=__doc__)
source_argument(parser)
args = arguments(parser)
session = ImportSession(args, 'import-weather.py')
source = session.source / 'data/maps'
ids = {'NONE':'none','SUNNY':'clear','SUNNY_CLOUDS':'clouds','RAIN':'rain','SNOW':'snow','RAIN_THUNDERSTORM':'thunderstorm','FOG_HORIZONTAL':'fog','FOG_DIAGONAL':'fog_diagonal','VOLCANIC_ASH':'ash','SANDSTORM':'sand','SHADE':'shade','DROUGHT':'drought','DOWNPOUR':'downpour','UNDERWATER':'underwater','UNDERWATER_BUBBLES':'bubbles','ABNORMAL':'abnormal','ROUTE119_CYCLE':'route119','ROUTE123_CYCLE':'route123'}
output = {}
for path in require_files(source, '*/map.json'):
    data = json.loads(path.read_text())
    regions = []
    for event in data.get('coord_events', []):
        if event.get('type') == 'weather':
            regions.append({k:event[k] for k in ('x','y','elevation')} | {'weather':ids[event['weather'].removeprefix('COORD_EVENT_WEATHER_')]})
    output[data['name']] = {'default':ids[data['weather'].removeprefix('WEATHER_')]}
    if regions: output[data['name']]['regions'] = regions
session.text(session.target / 'engine/rules/gen3/map-weather.js', generated_header(session.owner, session.source) + '// Metadata does not imply playable maps.\nexport const GEN3_MAP_WEATHER = ' + json.dumps(output, ensure_ascii=False, indent=2) + ';\n')
print(f'{len(output)} headers, {sum(len(m.get("regions", [])) for m in output.values())} coordinate weather events')

session.finish()
