"""Read-only Emerald evidence extraction. No game state, translation or script execution."""
import hashlib
import json
import re

LABEL = re.compile(r'^([A-Za-z_][A-Za-z0-9_]*):{1,2}\s*(?:@.*)?$')
STRING = re.compile(r'^\s*\.string\s+"((?:[^"\\]|\\.)*)"\s*(?:@.*)?$')
TOKEN = re.compile(r'\b[A-Za-z_][A-Za-z0-9_]*\b')
PLACEHOLDER = re.compile(r'\{(?:PLAYER|RIVAL|KUN|STR_VAR_\d+|[A-Z_]*NAME)\}')


def digest(value):
    return hashlib.sha256(value.encode('utf-8')).hexdigest()


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'))


def without_comment(line):
    """Assembly @ comments are meaningful only outside quoted strings."""
    quoted = escaped = False
    for index, char in enumerate(line):
        if escaped:
            escaped = False
        elif char == '\\' and quoted:
            escaped = True
        elif char == '"':
            quoted = not quoted
        elif char == '@' and not quoted:
            return line[:index]
    return line


def arguments(value):
    # Quoted commas and nested expressions are not argument separators.
    result, start, depth = [], 0, 0
    quoted = escaped = False
    for i, char in enumerate(value):
        if escaped:
            escaped = False
        elif char == "\\" and quoted:
            escaped = True
        elif char == '"':
            quoted = not quoted
        elif not quoted:
            if char in '([{':
                depth += 1
            elif char in ')]}':
                depth -= 1
            elif char == ',' and depth == 0:
                result.append(value[start:i].strip()); start = i+1
    if quoted or depth:
        raise ValueError('Unbalanced script arguments: ' + value)
    if value:
        result.append(value[start:].strip())
    return result


def readable_text(parts):
    value = ''.join(parts)
    value = re.sub(r'\\([npl"\\])', lambda m: {'n':'\n','p':'\n\n','l':'\n','"':'"','\\':'\\'}[m[1]], value)
    return value[:-1] if value.endswith('$') else value


def parse_blocks(text, path):
    lines, result = text.splitlines(), []
    starts = [(i, LABEL.fullmatch(line)) for i, line in enumerate(lines) if LABEL.fullmatch(line)]
    for index, (start, match) in enumerate(starts):
        end = starts[index+1][0] if index+1 < len(starts) else len(lines)
        raw = '\n'.join(lines[start:end]) + '\n'
        instructions, strings = [], []
        for offset, line in enumerate(lines[start+1:end], start+2):
            code = without_comment(line).strip()
            if not code:
                continue
            parts = code.split(None, 1)
            op, operands = parts[0], parts[1] if len(parts)>1 else ''
            instructions.append({'line':offset, 'op':op, 'args':arguments(operands), 'raw':line})
            string = STRING.fullmatch(line)
            if string:
                strings.append(string[1])
        kind = 'text' if strings else 'movement' if any(i['op']=='step_end' for i in instructions) else 'script'
        record = {'label':match[1], 'kind':kind, 'path':path, 'line':start+1,
                  'endLine':end, 'sha256':digest(raw), 'raw':raw, 'instructions':instructions}
        if strings:
            record.update(encodedText=''.join(strings), text=readable_text(strings))
        result.append(record)
    return result


def c_mask(text):
    """Mask comments/literals while retaining source offsets and line numbers."""
    return re.sub(r'//[^\n]*|/\*[\s\S]*?\*/|"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'',
                  lambda m: ''.join('\n' if c=='\n' else ' ' for c in m[0]), text)


def c_functions(text, path):
    masked = c_mask(text)
    pattern = re.compile(r'^\s*(?:(?:static|extern|inline)\s+)*[A-Za-z_][\w\s*]*?\b([A-Za-z_]\w*)\s*\([^;{}]*\)\s*\{', re.M)
    result = {}
    for match in pattern.finditer(masked):
        start = match.start()
        while start < len(text) and text[start].isspace():
            start += 1
        cursor, depth = match.end(), 1
        while cursor < len(masked) and depth:
            depth += (masked[cursor]=='{') - (masked[cursor]=='}')
            cursor += 1
        if depth:
            raise ValueError(f'Unbalanced C function: {path}/{match[1]}')
        raw = text[start:cursor]
        result[match[1]] = {'name':match[1], 'path':path, 'line':text.count('\n',0,start)+1,
                            'endLine':text.count('\n',0,cursor)+1, 'sha256':digest(raw), 'raw':raw,
                            'possibleCalls':sorted(set(re.findall(r'\b([A-Za-z_]\w*)\s*\(', masked[match.end():cursor])) - {'if','for','while','switch','sizeof'})}
    return result



def macro_definitions(text, path):
    result = {}
    for match in re.finditer(r'^\s*\.macro\s+([A-Za-z_]\w*)[^\n]*\n[\s\S]*?^\s*\.endm\b[^\n]*', text, re.M):
        raw = match[0].lstrip('\n')
        start = match.end()-len(raw)
        result[match[1]] = {'path':path, 'line':text.count('\n',0,start)+1,
                            'endLine':text.count('\n',0,match.end())+1, 'sha256':digest(raw), 'raw':raw}
    return result
