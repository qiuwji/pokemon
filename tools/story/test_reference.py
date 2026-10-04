"""Extractor contracts against miniature sources; never require a mutable reference checkout."""
import copy
import json
import importlib.util
import sys
from pathlib import Path
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from story.reference import Reference
from story.review import review_template, validate_review
from story.source_parser import arguments, c_functions, canonical, digest, parse_blocks


def fixture(root):
    (root/'data/maps/Room').mkdir(parents=True)
    (root/'data/scripts').mkdir()
    (root/'src').mkdir()
    (root/'asm/macros').mkdir(parents=True)
    (root/'data/maps/Room/map.json').write_text(json.dumps({'name':'Room','object_events':[{'x':2,'y':3,'local_id':'MOM','script':'Talk'}],
        'coord_events':[{'x':4,'y':5,'script':'Talk'}],'bg_events':[]}))
    (root/'data/maps/Room/scripts.inc').write_text('Room_MapScripts::\n\tmap_script MAP_SCRIPT_ON_LOAD, Talk\n\t.byte 0\nTalk::\n\tmsgbox SharedText, MSGBOX_DEFAULT\n\tapplywaitmovement MOM, SharedMovement\n\tspecial StartClock\n\twaitstate\n\tend\n')
    (root/'data/scripts/shared.inc').write_text('SharedText:\n\t.string "Hi, {PLAYER}!\\p"\n\t.string "Clock @ noon.$"\nSharedMovement:\n\twalk_up\n\tdelay_8\n\twalk_in_place_faster_right\n\tstep_end\n')
    (root/'data/specials.inc').write_text('def_special StartClock, waitstate=1\n')
    (root/'src/clock.c').write_text('void StartClock(void)\n{\n    CreateTask(Task_Clock, 0);\n}\nstatic void Task_Clock(void)\n{\n    const char *s = "} not a brace";\n    /* { ignored */\n    if (s) { ResumeScript(); }\n}\n')
    (root/'asm/macros/event.inc').write_text('.macro applywaitmovement local:req, moves:req\n    applymovement \\local, \\moves\n    waitmovement \\local\n.endm\n')
    return Reference(root)


class StoryReferenceTests(unittest.TestCase):
    def test_legacy_text_entry_reuses_label_parser(self):
        tools = Path(__file__).resolve().parents[1]
        sys.path.insert(0,str(tools))
        spec = importlib.util.spec_from_file_location('legacy_script_text',tools/'imports/commands/region/import-script-text.py')
        module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/'scripts.inc'
            path.write_text('First::\n\t.string "one.$"\nScript::\n\tend\nSecond:\n\t.string "two.$"\n')
            self.assertEqual(module.extract(path),{'First':'one.$','Second':'two.$'})

    def test_double_colon_texts_and_boundaries_are_not_merged(self):
        body = 'First:: @ a public label\n\t.string "{PLAYER} @home\\p"\nSecond::\n\tend\nLast:\n\t.string "Hello, world.$"\n'
        records = parse_blocks(body,'file.inc')
        self.assertEqual([b['label'] for b in records],['First','Second','Last'])
        self.assertEqual(records[0]['text'],'{PLAYER} @home\n\n')
        self.assertEqual(records[2]['text'],'Hello, world.')
        self.assertNotIn('Last',records[0]['raw'])
        self.assertEqual(records[0]['sha256'],digest(records[0]['raw']))

    def test_arguments_preserve_strings_expressions_and_tabs(self):
        self.assertEqual(arguments('A, "text, \\"quote\\"", (B + C), fn(1, 2)'),['A','"text, \\"quote\\""','(B + C)','fn(1, 2)'])
        record = parse_blocks('A::\n\tcall_if_eq\tVAR_X, 3, Target @ comment\n','file')[0]
        self.assertEqual(record['instructions'][0]['op'],'call_if_eq')
        self.assertEqual(record['instructions'][0]['args'],['VAR_X','3','Target'])
        with self.assertRaisesRegex(ValueError,'Unbalanced'):
            arguments('A, "unterminated')

    def test_c_function_strings_comments_nested_braces_and_callbacks(self):
        records = c_functions('static void Task(void) { const char *s="}"; /* } */ if (s) { Wait(); } }\nvoid Start(void) { CreateTask(Task, 0); }','clock.c')
        self.assertEqual(set(records),{'Task','Start'})
        self.assertIn('Wait',records['Task']['possibleCalls'])
        self.assertTrue(records['Task']['raw'].endswith('} }'))

    def test_packet_preserves_entries_paths_waiting_movements_and_specials(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); reference = fixture(root)
            before = {str(p):p.read_bytes() for p in root.rglob('*') if p.is_file()}
            packet = reference.packet(['Room'])
            self.assertEqual(packet['unresolved'],[])
            self.assertIn('Talk',packet['roots'])
            self.assertEqual(packet['maps']['Room']['data']['coord_events'][0]['x'],4)
            self.assertEqual([i['op'] for i in packet['blocks']['SharedMovement']['instructions']],['walk_up','delay_8','walk_in_place_faster_right','step_end'])
            self.assertEqual(packet['specials']['StartClock']['waitstate'],1)
            self.assertEqual(packet['cFunctions']['StartClock']['definitions'][0]['functionReferences'],['Task_Clock'])
            self.assertIn('waitmovement',packet['macros']['applywaitmovement']['raw'])
            self.assertEqual(packet, reference.packet(['Room']))
            self.assertEqual(before,{str(p):p.read_bytes() for p in root.rglob('*') if p.is_file()})

    def test_unknown_and_ambiguous_labels_do_not_silently_fall_back(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory); reference=fixture(root)
            with self.assertRaisesRegex(ValueError,'Unknown reference label'):
                reference.packet(['Room'],['Typo'])
            (root/'data/scripts/duplicate.inc').write_text('Talk::\n\tend\n')
            with self.assertRaisesRegex(ValueError,'Ambiguous reference label'):
                Reference(root).packet(['Room'],['Talk'])

    def test_missing_dependency_is_explicit_and_hash_changes_with_source(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory); fixture(root)
            path=root/'data/maps/Room/scripts.inc'
            path.write_text(path.read_text().replace('SharedText','MissingText'))
            packet=Reference(root).packet(['Room'],['Talk'])
            self.assertEqual(packet['unresolved'][0]['target'],'MissingText')
            before=digest(canonical(packet)); path.write_text(path.read_text().replace('waitstate','delay 30'))
            self.assertNotEqual(before,digest(canonical(Reference(root).packet(['Room'],['Talk']))))

    def test_review_detects_changed_original_coverage_placeholders_and_unreviewed_work(self):
        with tempfile.TemporaryDirectory() as directory:
            packet=fixture(Path(directory)).packet(['Room'],['Talk'])
            review=review_template(packet)
            self.assertEqual(validate_review(packet,review),[])
            self.assertTrue(validate_review(packet,review,True))
            for decision in review['mapEntries']+review['cFunctions']:
                decision.update(status='reviewed',notes='Checked source entry and waiting callback.')
            review['entries'][0].update(status='reviewed',notes='Scene locks, waits for movement and special, then unlocks.')
            review['translations'][0].update(zh='你好，{PLAYER}！\n\n正午的时钟。',reviewed=True)
            review['scenarios']=[{'name':'normal','sources':[{'label':'Talk','lines':[4]}]}]
            self.assertEqual(validate_review(packet,review,True),[])
            broken=copy.deepcopy(review); broken['translations'][0]['zh']='你好！'
            self.assertTrue(any('placeholders' in e for e in validate_review(packet,broken)))
            broken=copy.deepcopy(review); broken['translations'][0]['original']='invented'
            self.assertTrue(any('Original' in e for e in validate_review(packet,broken)))
            broken=copy.deepcopy(review); broken['entries']=[]
            self.assertTrue(any('coverage' in e for e in validate_review(packet,broken)))
            broken=copy.deepcopy(review); broken['scenarios'][0]['sources'][0]['lines']=[999]
            self.assertTrue(any('anchor' in e for e in validate_review(packet,broken)))

    def test_focused_slice_never_claims_full_map_coverage(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory); fixture(root)
            with (root/'data/maps/Room/scripts.inc').open('a') as out:
                out.write('Unrelated::\n\tmsgbox OtherText, MSGBOX_DEFAULT\n\tend\nOtherText:\n\t.string "Later.$"\n')
            reference=Reference(root)
            selected=reference.packet(['Room'],['Talk'])
            self.assertNotIn('Unrelated',selected['blocks'])
            self.assertIn('Unrelated',reference.packet(['Room'])['roots'])


if __name__=='__main__':
    unittest.main()
