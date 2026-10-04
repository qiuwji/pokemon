"""Import selected water encounters without touching land tables or evolutions."""
import argparse
from imports.context import ImportSession, arguments, source_argument
from imports.encounters import merge_encounters

parser = argparse.ArgumentParser(description=__doc__)
source_argument(parser)
args = arguments(parser, selectors=('maps',))
session = ImportSession(args, 'import-water-encounters.py')
merge_encounters(session, 'water_mons', 'waterEncounters', 'waterEncounterRate')
session.finish()
