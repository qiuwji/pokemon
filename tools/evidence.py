#!/usr/bin/env python3
"""Record checks and changed-file boundaries without editing historical evidence."""
import argparse
import contextlib
from datetime import datetime
import hashlib
import io
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import tempfile
from zoneinfo import ZoneInfo

PROJECT = Path(__file__).resolve().parents[1]
SCHEMA = 1


def now():
    return datetime.now(ZoneInfo('Asia/Shanghai')).isoformat(timespec='seconds')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def git(root, *args):
    return subprocess.check_output(['git', '-C', str(root), *args])


def changed_paths(root, baseline='HEAD'):
    tracked = git(root, 'diff', '--name-only', '-z', baseline).split(b'\0')
    new = git(root, 'ls-files', '--others', '--exclude-standard', '-z').split(b'\0')
    return sorted({os.fsdecode(p) for p in tracked + new
                   if p and not os.fsdecode(p).endswith('/.evidence.lock')})


def layer(path):
    for prefix, name in [
        ('src/engine/', 'engine'), ('src/adapters/', 'adapters'),
        ('src/packs/emerald/application/', 'application'),
        ('src/packs/emerald/story/', 'story'), ('src/content/', 'content'),
        ('src/packs/', 'pack'), ('generated/', 'generated'),
        ('tests/', 'tests'), ('examples/', 'examples'), ('tools/', 'tools'),
        ('docs/', 'docs'), ('skills/', 'skills'),
    ]:
        if path.startswith(prefix):
            return name
    return 'other'


def relative(root, value):
    path = (root / value).resolve()
    if not path.is_relative_to(root):
        raise ValueError(f'Path outside project: {value}')
    return path.relative_to(root).as_posix()


def evidence_path(path):
    return path.startswith('docs/validation/')


def snapshot(root, selectors, previous=()):
    paths = set()
    if selectors:
        for value in selectors:
            name = relative(root, value)
            path = root / name
            if path.is_dir():
                candidates = git(root, 'ls-files', '--cached', '--others', '--exclude-standard', '-z')
                prefix = '' if name == '.' else name + '/'
                paths.update(relative(root, os.fsdecode(p)) for p in candidates.split(b'\0')
                             if p and os.fsdecode(p).startswith(prefix))
            else:
                paths.add(name)
    else:
        paths.update(changed_paths(root))
        paths.update(previous)
    return {p: sha((root / p).read_bytes()) if (root / p).is_file() else None
            for p in sorted(paths) if not evidence_path(p)}


def fingerprint(inputs):
    return sha(json.dumps(inputs, sort_keys=True, ensure_ascii=False).encode())


def summaries(text):
    """Keep separate Node/Python suites; never add partial runs into a full run."""
    result = []
    current = None
    for line in text.splitlines():
        match = re.fullmatch(r'(?:#|ℹ) (tests|suites|pass|fail|cancelled|skipped|todo) (\d+)', line)
        if match:
            key, count = match.groups()
            if key == 'tests':
                current = {'format': 'node-test'}
                result.append(current)
            if current is not None:
                current[key] = int(count)
    for match in re.finditer(r'^Ran (\d+) tests? in .*\n\s*\n(OK(?: \([^\n]*\))?|FAILED[^\n]*)', text, re.M):
        result.append({'format': 'python-unittest', 'tests': int(match[1]), 'summary': match[2]})
    return result


def atomic_json(path, data):
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=path.parent,
                                     prefix='.manifest-', delete=False) as stream:
        temp = Path(stream.name)
        json.dump(data, stream, ensure_ascii=False, indent=2)
        stream.write('\n')
    try:
        temp.replace(path)
    finally:
        temp.unlink(missing_ok=True)


def status(manifest):
    latest = {r['label']: r for r in manifest['runs']}
    if not latest:
        return 'unverified'
    if any(r['inputDigest'] != manifest['inputDigest'] or r.get('inputsChangedDuringRun')
           for r in latest.values()):
        return 'stale'
    if any(r['exitCode'] not in (None, 0) for r in latest.values()):
        return 'failed'
    if any(r['exitCode'] is None for r in latest.values()):
        return 'unverified'
    return 'recorded-checks-passed'


def prepare(root, args):
    output = root / relative(root, args.out)
    if not output.is_relative_to(root / 'docs/validation') or output == root / 'docs/validation':
        raise ValueError('--out must be a batch directory under docs/validation/')
    file = output / 'manifest.json'
    if file.exists():
        manifest = json.loads(file.read_text())
        if manifest.get('schemaVersion') != SCHEMA or manifest.get('generator') != 'tools/evidence.py':
            raise ValueError('Historical/foreign manifest is immutable; choose a new batch directory')
        if manifest['scope'] != args.scope or manifest['kind'] != args.kind or manifest['selectors'] != args.input:
            raise ValueError('Batch scope/kind/inputs differ; use the original values or a new directory')
    else:
        manifest = {'schemaVersion': SCHEMA, 'generator': 'tools/evidence.py',
                    'createdAt': now(), 'scope': args.scope, 'kind': args.kind,
                    'selectors': args.input, 'runs': [], 'inputs': {}, 'notes': [],
                    'manualVerification': 'not recorded; check results do not establish visual/audio fidelity'}
    output.mkdir(parents=True, exist_ok=True)
    return output, manifest


def record(root, args):
    output = root / relative(root, args.out)
    if not output.is_relative_to(root / 'docs/validation') or output == root / 'docs/validation':
        raise ValueError('--out must be a batch directory under docs/validation/')
    output.mkdir(parents=True, exist_ok=True)
    lock = output / '.evidence.lock'
    try:
        stream = lock.open('x')
    except FileExistsError:
        raise ValueError('Batch is already running; after a crash confirm no runner remains before removing .evidence.lock') from None
    try:
        with stream:
            stream.write(str(os.getpid()))
        return record_locked(root, args)
    finally:
        lock.unlink()


def record_locked(root, args):
    output, manifest = prepare(root, args)
    label = args.label
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,63}', label):
        raise ValueError('--label must be a short lowercase name')
    before = snapshot(root, args.input, manifest['inputs'])
    started = now()
    baseline = git(root, 'rev-parse', 'HEAD').decode().strip()
    if not (output / 'manifest.json').exists():
        # Publish a truthful unverified batch before checks inspect documentation links.
        manifest.update({'inputs': before, 'inputDigest': fingerprint(before), 'status': status(manifest)})
        atomic_json(output / 'manifest.json', manifest)
    sequence = len(manifest['runs']) + 1
    log = output / f'{sequence:03d}-{label}.log'
    if log.exists():
        raise ValueError(f'Log already exists: {log}; preserve it and use a new directory')
    command, code, termination = None, None, None
    if args.action == 'run':
        command = args.command[1:] if args.command[:1] == ['--'] else args.command
        if not command:
            raise ValueError('run requires -- followed by command arguments')
        with log.open('xb') as stream:
            try:
                process = subprocess.Popen(command, cwd=root, stdout=stream, stderr=subprocess.STDOUT,
                                           start_new_session=True)
            except OSError as error:
                stream.write(str(error).encode())
                code, termination = 127, 'launch-error'
            else:
                try:
                    code = process.wait(timeout=args.timeout)
                except (subprocess.TimeoutExpired, KeyboardInterrupt) as error:
                    termination = 'timeout' if isinstance(error, subprocess.TimeoutExpired) else 'interrupted'
                    os.killpg(process.pid, signal.SIGTERM)
                    try:
                        process.wait(timeout=3)
                    except subprocess.TimeoutExpired:
                        os.killpg(process.pid, signal.SIGKILL)
                        process.wait()
                    code = 124 if termination == 'timeout' else 130
    else:
        source = root / relative(root, args.log)
        # Importing an old log cannot recover its command, exit code or source version.
        imported = source.read_bytes()
        with log.open('xb') as stream:
            stream.write(imported)
    after = snapshot(root, args.input, before)
    log_bytes = log.read_bytes()
    run = {'label': label, 'mode': args.action, 'startedAt': started, 'finishedAt': now(),
           'baselineCommit': baseline, 'command': command, 'exitCode': code,
           'log': log.name, 'logSha256': sha(log_bytes), 'inputs': before,
           'inputDigest': fingerprint(before), 'inputsChangedDuringRun': before != after,
           'summaries': summaries(log_bytes.decode('utf-8', errors='replace'))}
    if termination:
        run['termination'] = termination
    if args.action == 'collect':
        run['provenance'] = 'imported log; command, exit code and input version unknown'
    manifest['runs'].append(run)
    manifest.update({'updatedAt': now(), 'inputs': after, 'inputDigest': fingerprint(after)})
    changes = changed_paths(root)
    manifest['changedFiles'] = {name: [p for p in changes if layer(p) == name]
                                for name in sorted({layer(p) for p in changes})}
    crossings = [name for name in ('engine', 'adapters', 'application') if name in manifest['changedFiles']]
    manifest['boundaryReview'] = {
        'basis': 'whole working tree against HEAD; includes pre-existing work outside this batch',
        'layersToExplain': crossings,
        'contentOnlyExpectation': args.kind == 'content',
        'note': 'Cross-layer edits require a stated capability or defect; file count alone does not prove a violation',
    }
    reference = root / 'work/pokeemerald'
    if (reference / '.git').exists():
        manifest['reference'] = {'path': 'work/pokeemerald', 'revision': git(reference, 'rev-parse', 'HEAD').decode().strip()}
    for note in args.note:
        if note not in manifest['notes']:
            manifest['notes'].append(note)
    manifest['status'] = status(manifest)
    atomic_json(output / 'manifest.json', manifest)
    if args.action == 'run':
        atomic_json(root / 'docs/validation/current.json',
                    {'version': 1, 'manifest': relative(root, output / 'manifest.json')})
    print(json.dumps({'manifest': relative(root, output / 'manifest.json'), 'status': manifest['status'],
                      'exitCode': code, 'layersToExplain': crossings}, ensure_ascii=False))
    return (code if code is not None and code >= 0 else 1) if args.action == 'run' else 0


def verify(root, args):
    file = root / relative(root, args.manifest)
    manifest = json.loads(file.read_text())
    if manifest.get('generator') != 'tools/evidence.py' or manifest.get('schemaVersion') != SCHEMA:
        raise ValueError('verify supports generated evidence schema 1 only')
    selectors = manifest['selectors']
    if not selectors:
        baseline = manifest['runs'][-1]['baselineCommit'] if manifest['runs'] else 'HEAD'
        selectors = sorted(set(manifest['inputs']) | set(changed_paths(root, baseline)))
    current = snapshot(root, selectors)
    problems = []
    if current != manifest['inputs']:
        problems.append('Recorded inputs changed, disappeared or were added to a selected directory')
    for run in manifest['runs']:
        name = run['log']
        if Path(name).name != name:
            raise ValueError('Unsafe log name')
        log = file.parent / name
        if not log.is_file() or sha(log.read_bytes()) != run['logSha256']:
            problems.append(f'Log missing or changed: {name}')
        if fingerprint(run['inputs']) != run['inputDigest']:
            problems.append(f'Input digest inconsistent: {run["label"]}')
    if fingerprint(manifest['inputs']) != manifest['inputDigest']:
        problems.append('Batch input digest inconsistent')
    if manifest['status'] != status(manifest):
        problems.append('Batch status inconsistent')
    print(json.dumps({'integrity': 'failed' if problems else 'valid', 'recordedStatus': status(manifest),
                      'problems': problems}, ensure_ascii=False))
    # Integrity validity is distinct from successful execution.
    return 1 if problems else 0


def verify_all(root):
    directory = root / 'docs/validation'
    cursor = directory / 'current.json'
    locks = list(directory.glob('*/.evidence.lock'))
    current = None
    if cursor.exists():
        selection = json.loads(cursor.read_text())
        if selection.get('version') != 1:
            raise ValueError('Invalid current evidence selector')
        current = root / relative(root, selection['manifest'])
        if not current.is_relative_to(directory) or current.name != 'manifest.json':
            raise ValueError('Current evidence must be a validation manifest')
    # A wrapped check can run before its first manifest is written. Final recording
    # verifies that batch after the child exits, rather than accepting an old snapshot.
    running = current is not None and (current.parent / '.evidence.lock').exists()
    if len(locks) == 1 and not running:
        current, running = locks[0].parent / 'manifest.json', True
    problems, generated, legacy, stale = [], 0, 0, 0
    for file in sorted(directory.glob('*/manifest.json')):
        data = json.loads(file.read_text())
        if data.get('generator') != 'tools/evidence.py':
            legacy += 1
            continue
        generated += 1
        with contextlib.redirect_stdout(io.StringIO()) as stream:
            verify(root, argparse.Namespace(manifest=relative(root, file)))
        result = json.loads(stream.getvalue())
        input_problem = 'Recorded inputs changed, disappeared or were added to a selected directory'
        outdated = input_problem in result['problems'] or result['recordedStatus'] == 'stale'
        stale += int(outdated)
        issues = [issue for issue in result['problems'] if issue != input_problem]
        if file == current and not running:
            if outdated:
                issues.append('Current batch is stale; record relevant checks for the final inputs')
            if result['recordedStatus'] in ('failed', 'unverified'):
                issues.append('Current batch has failed or unverified checks')
        problems.extend(f'{relative(root,file)}: {issue}' for issue in issues)
    if current is None:
        problems.append('No current batch; select one by running npm run evidence -- run ...')
    elif not running and not current.is_file():
        problems.append('Current manifest is missing')
    elif not running and json.loads(current.read_text()).get('generator') != 'tools/evidence.py':
        problems.append('Current evidence must use the generated schema')
    print(json.dumps({'current': relative(root,current) if current else None,
                      'currentStatus': 'running' if running else 'invalid' if problems else 'verified',
                      'generated': generated, 'historicalStale': stale, 'legacyUnverifiable': legacy,
                      'problems': problems}, ensure_ascii=False))
    return 1 if problems else 0


def main(argv=None, root=PROJECT):
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='action', required=True)
    for action in ('run', 'collect'):
        child = sub.add_parser(action)
        child.add_argument('--scope', required=True)
        child.add_argument('--kind', choices=['content', 'capability', 'fix', 'mixed', 'workflow'], default='mixed')
        child.add_argument('--out', required=True)
        child.add_argument('--label', required=True)
        child.add_argument('--input', action='append', default=[], help='file/directory relative to project; repeatable')
        child.add_argument('--note', action='append', default=[])
        if action == 'run':
            child.add_argument('--timeout', type=float)
            child.add_argument('command', nargs=argparse.REMAINDER)
        else:
            child.add_argument('--log', required=True)
    child = sub.add_parser('verify')
    child.add_argument('manifest', nargs='?')
    child.add_argument('--all', action='store_true', help='verify generated logs; enforce current batch freshness')
    args = parser.parse_args(argv)
    try:
        if getattr(args, 'timeout', None) is not None and args.timeout <= 0:
            raise ValueError('--timeout must be positive')
        if args.action == 'verify':
            if args.all:
                return verify_all(root.resolve())
            if not args.manifest:
                raise ValueError('verify requires a manifest or --all')
            return verify(root.resolve(), args)
        result = record(root.resolve(), args)
        if result == 0 and args.action == 'run':
            return verify_all(root.resolve())
        return result
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        print(f'evidence: {error}', file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
