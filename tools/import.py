"""Discover and run one classified import command. Paths do not depend on the working directory."""
import json
import runpy
import sys
from pathlib import Path

root = Path(__file__).resolve().parent
catalog = json.loads((root / 'imports/ownership.json').read_text())
commands = {name.removeprefix('import-').removesuffix('.py'): entry for name, entry in catalog.items()}
if len(sys.argv) < 2 or sys.argv[1] in ('--list', '--help', '-h'):
    print('Usage: python3 tools/import.py COMMAND [SOURCE] [OPTIONS]\n')
    for category in sorted({entry['category'] for entry in commands.values()}):
        print(category + ': ' + ', '.join(name for name, entry in commands.items() if entry['category'] == category))
    print('\nUse COMMAND --help for selectors, profile, check and target options.')
    raise SystemExit(0)
name = sys.argv[1]
if name not in commands:
    raise SystemExit('Unknown import command: ' + name + '; use --list')
entry = root.parent / commands[name]['entry']
sys.argv = [str(entry), *sys.argv[2:]]
runpy.run_path(str(entry), run_name='__main__')
