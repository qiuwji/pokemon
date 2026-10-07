"""Real launcher and selected-import safety, using isolated output packs."""
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from imports.context import PROJECT


class ImportCatalogTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.target = Path(temporary.name) / 'pack'
        shutil.copytree(PROJECT / 'src/content', self.target / 'content')
        shutil.copytree(PROJECT / 'generated/content', self.target / 'content', dirs_exist_ok=True)

    def run_import(self, command, *args):
        return subprocess.run([sys.executable,str(PROJECT / 'tools/import.py'),command,
                               '--target',str(self.target),*args],cwd=self.target.parent,
                              text=True,capture_output=True)

    def load_species(self, ident):
        return json.loads((self.target / f'content/species/{ident}.json').read_text())

    def test_all_catalog_commands_expose_safe_output_options(self):
        catalog=json.loads((PROJECT/'tools/imports/ownership.json').read_text())
        for owner in catalog:
            name=owner.removeprefix('import-').removesuffix('.py')
            result=self.run_import(name,'--help')
            self.assertEqual(result.returncode,0,owner+result.stderr)
            self.assertIn('--check',result.stdout)
            self.assertIn('--target',result.stdout)
            self.assertIn('--strict',result.stdout)

    def test_grid_launcher_restores_all_door_atlases_and_repeated_import_does_not_grow_them(self):
        assets = self.target / 'assets'
        assets.mkdir()
        for image in (PROJECT / 'generated/assets').glob('tiles-*.png'):
            shutil.copy2(image, assets / image.name)
        for _ in range(2):
            result = self.run_import('grid', '--maps', 'Route104')
            self.assertEqual(result.returncode, 0, result.stderr)
            generated = self.target / 'packs/emerald/generated/door-anims.js'
            self.assertIn('DOOR_ANIMATIONS_BY_TILESET', generated.read_text())
            atlas = json.loads((self.target / 'content/tilesets/general-rustboro.json').read_text())
            self.assertTrue(any(int(key) >= 900 for key in atlas['metatiles']))
            total = atlas['atlas']['tileCount']
            if _:
                self.assertEqual(total, previous)
            previous = total
        check = self.run_import('opening-art', '--check', '--strict')
        self.assertEqual(check.returncode, 0, check.stderr)
        self.assertEqual(json.loads(check.stdout)['files'], [])

    def test_discovery_and_unknown_command(self):
        result = self.run_import('--list')
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertIn('region: emerald, grid',result.stdout)
        result = self.run_import('unknown')
        self.assertNotEqual(result.returncode,0)
        self.assertIn('Unknown import command',result.stderr)

    def test_selected_metadata_updates_only_one_species_and_reports_omissions(self):
        before = {p: p.read_bytes() for p in self.target.rglob('*.json')}
        result = self.run_import('species-metadata','--species','treecko')
        self.assertEqual(result.returncode,0,result.stderr)
        report = json.loads(result.stdout)
        self.assertTrue(any(v['kind']=='eggMoves' for v in report['omissions']))
        self.assertTrue(all(v['owner']=='treecko' for v in report['omissions']))
        self.assertEqual([str(p.relative_to(self.target)) for p in before if before[p]!=p.read_bytes()],
                         ['content/species/treecko.json'])

    def test_strict_omissions_fail_before_any_content_changes(self):
        before = {p: p.read_bytes() for p in self.target.rglob('*.json')}
        result = self.run_import('species-metadata','--species','treecko','--strict')
        self.assertNotEqual(result.returncode,0)
        self.assertIn('Import omissions:',result.stderr)
        self.assertEqual(before,{p:p.read_bytes() for p in before})

    def test_missing_species_prerequisite_fails_with_target_untouched(self):
        before = {p: p.read_bytes() for p in self.target.rglob('*.json')}
        result = self.run_import('species-metadata','--species','missing')
        self.assertNotEqual(result.returncode,0)
        self.assertIn('Missing prerequisite species:',result.stderr)
        self.assertEqual(before,{p:p.read_bytes() for p in before})

    def test_selected_evolution_does_not_erase_unrelated_families(self):
        file = self.target / 'content/evolutions.json'
        before = json.loads(file.read_text())
        result = self.run_import('evolutions',str(PROJECT / 'work/pokeemerald'),'--species','mudkip')
        self.assertEqual(result.returncode,0,result.stderr)
        after = json.loads(file.read_text())
        self.assertEqual({k:v for k,v in before.items() if k!='mudkip'},
                         {k:v for k,v in after.items() if k!='mudkip'})

    def test_encounter_slots_cannot_silently_zip_truncate(self):
        source = self.target.parent / 'reference'
        file = source / 'src/data/wild_encounters.json'
        file.parent.mkdir(parents=True)
        raw = json.loads((PROJECT / 'work/pokeemerald/src/data/wild_encounters.json').read_text())
        group = raw['wild_encounter_groups'][0]
        field = next(v for v in group['fields'] if v['type']=='land_mons')
        field['encounter_rates']=field['encounter_rates'][:-1]
        file.write_text(json.dumps(raw))
        before = {p:p.read_bytes() for p in self.target.rglob('*.json')}
        result = self.run_import('encounters',str(source),'--maps','Route101')
        self.assertNotEqual(result.returncode,0)
        self.assertIn('Encounter slot/weight mismatch:',result.stderr)
        self.assertEqual(before,{p:p.read_bytes() for p in before})

if __name__=='__main__':
    unittest.main()
