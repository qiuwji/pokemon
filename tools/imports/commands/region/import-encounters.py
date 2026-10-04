"""Import selected land encounters with source slot and prerequisite checks."""
import argparse
from imports.context import ImportSession, arguments, source_argument
from imports.encounters import merge_encounters

parser = argparse.ArgumentParser(description=__doc__)
source_argument(parser)
args = arguments(parser, selectors=('maps',))
session = ImportSession(args, 'import-encounters.py')
merge_encounters(session, 'land_mons', 'encounters', 'encounterRate')
session.finish()
