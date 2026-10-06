"""A clean checkout can regenerate scenes without ignored work/ files or a C reference."""
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from imports.context import PROJECT
from imports.e2e_terrain import METATILES, WATER_TILE_IDS, verify_metatiles


class FixturePortabilityTests(unittest.TestCase):
    def test_generated_scene_pipeline_runs_in_checkout_without_work(self):
        with tempfile.TemporaryDirectory() as temporary:
            clone = Path(temporary) / 'project'
            shutil.copytree(PROJECT / 'tools',clone / 'tools',ignore=shutil.ignore_patterns('__pycache__'))
            for name in ['src','generated']:
                shutil.copytree(PROJECT / name,clone / name,ignore=shutil.ignore_patterns('assets'))
            shutil.copy(PROJECT / 'package.json', clone / 'package.json')
            (clone / 'generated/fixtures/world.json').unlink()
            self.assertFalse((clone / 'work').exists())
            result = subprocess.run([sys.executable,str(clone / 'tools/fixtures/generate.py')],
                                    cwd=temporary,text=True,capture_output=True)
            self.assertEqual(result.returncode,0,result.stderr)
            output = clone / 'generated/fixtures/world.json'
            self.assertFalse((clone / 'dist').exists())
            maps = json.loads(output.read_text())
            self.assertEqual(len(maps),5)
            field = maps['E2ETestField']
            self.assertTrue(all(block&1023==METATILES['water'] for block,beh in zip(field['blocks'],field['behavior']) if beh==16))
            before = output.read_bytes()
            result = subprocess.run([sys.executable,str(clone / 'tools/fixtures/generate.py'),'--check'],cwd=temporary,text=True,capture_output=True)
            self.assertEqual(result.returncode,0,result.stderr)
            self.assertEqual(json.loads(result.stdout)['files'],[])
            self.assertEqual(output.read_bytes(),before)

    def test_water_semantics_exclude_flowers_and_fail_when_atlas_animation_disappears(self):
        from imports.context import ImportSession
        from types import SimpleNamespace
        data = ImportSession(SimpleNamespace(target=PROJECT/'dist',check=True),'import-grid.py').load()
        self.assertNotIn(508,WATER_TILE_IDS)
        self.assertEqual(verify_metatiles(data),[])
        data['tilesets']['general-petalburg']['animations']={}
        self.assertTrue(any('missing water animation' in error for error in verify_metatiles(data)))

if __name__=='__main__':
    unittest.main()
