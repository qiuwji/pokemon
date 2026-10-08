"""Offline source provenance and sprite-sheet export; never drives the game."""
import importlib.util
import io
import json
import unittest
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('battle_animation_export', ROOT / 'tools/battle/export-animations.py')
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)


class BattleAnimationExportTests(unittest.TestCase):
    def test_audit_tracks_aliases_dependencies_and_source_lines_without_evaluating_macros(self):
        source = 'Move_FIRST:\nAlias:\n loadspritegfx TAG\n call Child\n end\nChild:\n createsprite Sprite, 2, RGB(1, 2, 3)\n end\n'
        programs = exporter.extract(source)
        self.assertEqual(programs['Move_FIRST'], programs['Alias'])
        self.assertEqual(programs['Child'][0]['args'], ['Sprite', '2', 'RGB(1, 2, 3)'])
        self.assertEqual(programs['Child'][0]['line'], 7)
        self.assertEqual(exporter.dependencies(programs, 'Move_FIRST')['callbacks'], ['Sprite'])

    @unittest.skipUnless((ROOT / 'work/pokeemerald/.git').exists(), 'fixed read-only reference is not attached')
    def test_fixed_reference_exports_complete_audit_transparent_art_and_repeatable_bytes(self):
        scope = json.loads((ROOT / 'tools/battle/animation-scope.json').read_text())
        outputs = exporter.export(ROOT / 'work/pokeemerald', scope)
        self.assertEqual(outputs, exporter.export(ROOT / 'work/pokeemerald', scope))
        audit = json.loads(outputs['generated/packs/emerald/battle-animation-audit.json'])
        self.assertEqual(len(audit['moves']), 355)
        self.assertEqual(sum(move['choreography'] for move in audit['moves'].values()), len(scope['moves']))
        image = Image.open(io.BytesIO(outputs['generated/assets/battle/scratch.png']))
        self.assertEqual(image.mode, 'RGBA')
        self.assertEqual(image.size[0], 32)
        self.assertIn(0, image.getchannel('A').getdata())
        self.assertIn(255, image.getchannel('A').getdata())
        board = Image.open(io.BytesIO(outputs['generated/assets/battle/board_grass.png']))
        self.assertEqual(board.size, (512, 112))
        ball = Image.open(io.BytesIO(outputs['generated/assets/battle/poke_ball.png']))
        self.assertEqual(ball.size, (16, 48))
        manifest = json.loads(outputs['generated/packs/emerald/battle-animation-manifest.json'])
        self.assertIn('src/battle_intro.c', manifest['inputs'])
        self.assertIn('src/pokeball.c', manifest['inputs'])
        self.assertIn('generated/assets/audio/cry-mudkip.wav', manifest['audioInputs'])
        self.assertFalse(any('program' in name or 'source.js' in name for name in outputs))


if __name__ == '__main__':
    unittest.main()
