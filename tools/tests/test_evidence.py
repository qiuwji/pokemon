"""Run real child checks in isolated Git projects and verify their recorded evidence."""
import contextlib
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from evidence import main, sha, summaries


class EvidenceTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name).resolve()
        subprocess.run(['git', 'init', '-q', str(self.root)], check=True)
        self.input = self.root / 'src/content/story.json'
        self.input.parent.mkdir(parents=True)
        self.input.write_text('{"before":true}')
        self.git('add', '.')
        self.git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'baseline')
        self.out = 'docs/validation/batch'
        self.options = ['--scope', 'one story and its existing contracts', '--kind', 'content',
                        '--out', self.out, '--label', 'focused', '--input', 'src/content']

    def git(self, *args):
        return subprocess.check_output(['git', '-C', str(self.root), *args])

    def invoke(self, args):
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            return main(args, root=self.root)

    def run_check(self, script, extra=()):
        return self.invoke(['run', *self.options, *extra, '--', sys.executable, '-c', script])

    def manifest(self):
        return json.loads((self.root / self.out / 'manifest.json').read_text())

    def verify(self):
        return self.invoke(['verify', self.out + '/manifest.json'])

    def test_real_command_captures_both_streams_argv_hashes_and_separate_suite_counts(self):
        self.input.write_text('{"changed":true}')
        self.assertEqual(self.run_check('import sys; print("# tests 2\\n# pass 2\\n# fail 0"); '
                                       'print("error stream", file=sys.stderr)'), 0)
        manifest = self.manifest()
        self.assertEqual(manifest['status'], 'recorded-checks-passed')
        run = manifest['runs'][0]
        self.assertEqual(run['command'][:2], [sys.executable, '-c'])
        self.assertEqual(run['exitCode'], 0)
        self.assertEqual(run['summaries'][0]['pass'], 2)
        data = (self.root / self.out / run['log']).read_bytes()
        self.assertIn(b'error stream', data)
        self.assertEqual(run['logSha256'], sha(data))
        self.assertEqual(run['inputs']['src/content/story.json'], sha(self.input.read_bytes()))
        self.assertEqual(self.verify(), 0)

    def test_failed_attempt_kept_and_retry_only_supersedes_same_check(self):
        self.assertEqual(self.run_check('raise SystemExit(7)'), 7)
        self.assertEqual(self.manifest()['status'], 'failed')
        self.assertEqual(self.run_check('print("repaired")'), 0)
        manifest = self.manifest()
        self.assertEqual([r['exitCode'] for r in manifest['runs']], [7, 0])
        self.assertEqual(manifest['status'], 'recorded-checks-passed')
        self.assertTrue((self.root / self.out / '001-focused.log').exists())
        self.assertEqual(self.verify(), 0)

    def test_new_version_does_not_inherit_other_checks_pass(self):
        self.assertEqual(self.run_check('print("first check")', ['--label', 'one']), 0)
        self.input.write_text('new version')
        self.assertEqual(self.run_check('print("second check")', ['--label', 'two']), 1)
        self.assertEqual(self.manifest()['status'], 'stale')
        self.assertEqual(self.run_check('print("one repeated")', ['--label', 'one']), 0)
        self.assertEqual(self.manifest()['status'], 'recorded-checks-passed')

    def test_input_changes_during_check_make_success_stale(self):
        self.assertEqual(self.run_check('from pathlib import Path; '
                                       'Path("src/content/story.json").write_text("changed in check")'), 1)
        self.assertTrue(self.manifest()['runs'][0]['inputsChangedDuringRun'])
        self.assertEqual(self.manifest()['status'], 'stale')

    def test_imported_success_text_cannot_claim_a_known_exit_or_input_version(self):
        (self.root / 'old.log').write_text('# tests 4\n# pass 4\n# fail 0\n')
        self.assertEqual(self.invoke(['collect', *self.options, '--log', 'old.log']), 0)
        manifest = self.manifest()
        self.assertEqual(manifest['status'], 'unverified')
        self.assertIsNone(manifest['runs'][0]['exitCode'])
        self.assertIsNone(manifest['runs'][0]['command'])
        self.assertEqual(self.verify(), 0)

    def test_verify_catches_tampered_log_and_new_or_deleted_selected_input(self):
        self.run_check('print("proof")')
        added = self.input.parent / 'new.json'
        added.write_text('{}')
        self.assertEqual(self.verify(), 1)
        added.unlink()
        self.assertEqual(self.verify(), 0)
        log = self.root / self.out / self.manifest()['runs'][0]['log']
        log.write_text('tampered')
        self.assertEqual(self.verify(), 1)

    def test_timeout_and_launch_error_are_failure_records(self):
        self.assertEqual(self.run_check('import time; time.sleep(10)', ['--timeout', '0.05']), 124)
        self.assertEqual(self.manifest()['runs'][0]['termination'], 'timeout')
        self.assertEqual(self.invoke(['run', *self.options, '--', './no-such-program']), 127)
        self.assertEqual(self.manifest()['runs'][1]['termination'], 'launch-error')
        self.assertEqual(self.manifest()['status'], 'failed')

    def test_historical_manifests_scope_changes_and_external_paths_refused(self):
        directory = self.root / self.out
        directory.mkdir(parents=True)
        historical = directory / 'manifest.json'
        historical.write_text('{"historical":true}')
        self.assertEqual(self.run_check('print("must not execute")'), 2)
        self.assertEqual(historical.read_text(), '{"historical":true}')
        historical.unlink()
        self.run_check('print("recorded")')
        self.assertEqual(self.run_check('print("wrong batch")', ['--scope', 'different']), 2)
        self.assertEqual(self.run_check('print("unsafe")', ['--out', '../outside']), 2)
        self.assertEqual(self.run_check('print("unsafe input")', ['--input', '../outside']), 2)

    def test_whole_tree_layer_review_reports_preexisting_capability_work(self):
        engine = self.root / 'src/engine/contract.js'
        engine.parent.mkdir(parents=True)
        engine.write_text('export const contract = 1;')
        self.run_check('print("content check")')
        manifest = self.manifest()
        self.assertEqual(manifest['boundaryReview']['layersToExplain'], ['engine'])
        self.assertTrue(manifest['boundaryReview']['contentOnlyExpectation'])
        self.assertNotIn('src/engine/contract.js', manifest['inputs'])
        self.assertEqual(manifest['changedFiles']['engine'], ['src/engine/contract.js'])

    def test_directory_selection_excludes_ignored_runtime_files(self):
        (self.root / '.gitignore').write_text('__pycache__/\n')
        cache = self.input.parent / '__pycache__'
        cache.mkdir()
        (cache / 'temporary.pyc').write_bytes(b'cache')
        self.run_check('print("proof")')
        self.assertEqual(list(self.manifest()['inputs']), ['src/content/story.json'])

    def test_project_root_selection_covers_files_and_excludes_its_own_evidence(self):
        self.options = self.options[:-2] + ['--input', '.']
        self.assertEqual(self.run_check('print("root selection")'), 0)
        manifest = self.manifest()
        self.assertEqual(list(manifest['inputs']), ['src/content/story.json'])
        self.assertFalse(any(p.endswith('/.evidence.lock')
                             for paths in manifest['changedFiles'].values() for p in paths))
        self.assertEqual(self.verify(), 0)

    def test_busy_batch_refuses_concurrent_writer_without_removing_its_lock(self):
        directory = self.root / self.out
        directory.mkdir(parents=True)
        lock = directory / '.evidence.lock'
        lock.write_text('other runner')
        self.assertEqual(self.run_check('print("must not execute")'), 2)
        self.assertEqual(lock.read_text(), 'other runner')
        self.assertFalse((directory / 'manifest.json').exists())
        lock.unlink()
        self.assertEqual(self.run_check('print("available")'), 0)
        self.assertFalse(lock.exists())

    def test_deleted_input_and_symlink_outside_project_are_detected(self):
        self.run_check('print("proof")')
        self.input.unlink()
        self.assertEqual(self.verify(), 1)
        external = tempfile.TemporaryDirectory()
        self.addCleanup(external.cleanup)
        target = Path(external.name) / 'secret'
        target.write_text('external')
        self.input.symlink_to(target)
        self.assertEqual(self.verify(), 2)

    def test_suite_summaries_never_sum_independent_runs(self):
        result = summaries('# tests 2\n# pass 2\n# fail 0\n# tests 3\n# pass 3\n# fail 0\n'
                           'Ran 7 tests in 0.3s\n\nOK\nRan 8 tests in 0.4s\n\nFAILED (failures=1)\n')
        self.assertEqual([r['tests'] for r in result], [2, 3, 7, 8])
        self.assertEqual(result[-1]['summary'], 'FAILED (failures=1)')

    def test_first_run_exposes_unverified_manifest_to_documentation_check(self):
        self.assertEqual(self.run_check('from pathlib import Path; import json; '
                                       'p=Path("docs/validation/batch/manifest.json"); '
                                       'assert p.is_file(); '
                                       'assert json.loads(p.read_text())["status"] == "unverified"'), 0)
        self.assertEqual(self.manifest()['status'], 'recorded-checks-passed')

    def test_default_inputs_detect_new_changes_and_survive_committing_recorded_files(self):
        self.options = self.options[:-2]
        self.input.write_text('changed')
        self.assertEqual(self.run_check('print("check")'), 0)
        self.git('add', 'src')
        self.git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'recorded change')
        self.assertEqual(self.verify(), 0)
        added = self.root / 'src/content/new.json'
        added.write_text('{}')
        self.assertEqual(self.invoke(['verify', '--all']), 1)
        self.git('add', 'src')
        self.git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'unchecked addition')
        self.assertEqual(self.invoke(['verify', '--all']), 1)

    def test_node_spec_reporter_counts_are_recognized_without_reading_success_lines(self):
        result = summaries('✔ real entry\nℹ tests 2\nℹ suites 0\nℹ pass 1\nℹ fail 1\nℹ skipped 0\n')
        self.assertEqual(result, [{'format':'node-test','tests':2,'suites':0,'pass':1,'fail':1,'skipped':0}])

    def test_default_verification_enforces_current_batch_but_reports_historical_aging(self):
        self.assertEqual(self.invoke(['verify','--all']),1,'fresh work needs a selected current batch')
        self.run_check('print("old")')
        self.input.write_text('next task')
        self.assertEqual(self.run_check('print("new")',['--out','docs/validation/next']),0)
        legacy=self.root/'docs/validation/legacy';legacy.mkdir()
        (legacy/'manifest.json').write_text('{"status":"historical stub"}')
        self.assertEqual(self.invoke(['verify','--all']),0)
        (self.root/self.out/'001-focused.log').write_text('tampered historical log')
        self.assertEqual(self.invoke(['verify','--all']),1)

    def test_npm_postcheck_catches_stale_inputs_and_wrapped_check_verifies_after_finish(self):
        tool=self.root/'tools/evidence.py';tool.parent.mkdir();tool.write_text(Path(__file__).resolve().parents[1].joinpath('evidence.py').read_text())
        (self.root/'package.json').write_text(json.dumps({'scripts':{
            'check':'python3 -c "print(123)"',
            'postcheck':'python3 tools/evidence.py verify --all'}}))
        self.run_check('print("baseline")')
        result=subprocess.run(['npm','run','check'],cwd=self.root,capture_output=True)
        self.assertEqual(result.returncode,0,result.stderr.decode())
        self.input.write_text('changed')
        self.assertNotEqual(subprocess.run(['npm','run','check'],cwd=self.root,capture_output=True).returncode,0)
        self.assertEqual(self.invoke(['run',*self.options,'--','npm','run','check']),0)
        self.assertEqual(self.invoke(['verify','--all']),0)


if __name__ == '__main__':
    unittest.main()
