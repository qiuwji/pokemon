"""Validate an AI-authored review against immutable extraction facts, not guessed semantics."""
from collections import Counter
from .source_parser import PLACEHOLDER, canonical, digest

def review_template(packet):
    return {'version':1,'packetSha256':digest(canonical(packet)),
            'entries':[{'label':label,'status':'pending','notes':''} for label in packet['roots']],
            'translations':[{'label':label,'original':block['text'],'zh':'','reviewed':False} for label,block in packet['blocks'].items() if block['kind']=='text'],
            'mapEntries':[{'id':e['id'],'status':'pending','notes':''} for e in packet['entryInventory']],
            'cFunctions':[{'name':name,'status':'pending','notes':''} for name in packet['cFunctions']],
            'facts':[], 'scenarios':[]}


def validate_review(packet, review, ready=False):
    errors = []
    if review.get('version')!=1 or review.get('packetSha256')!=digest(canonical(packet)):
        errors.append('Review belongs to a different packet; regenerate or explicitly rebase it')
    entries = review.get('entries',[])
    if Counter(e.get('label') for e in entries) != Counter(packet['roots']):
        errors.append('Entry coverage differs from packet roots (missing, duplicated or invented label)')
    for entry in entries:
        if entry.get('status') not in ('reviewed','pending','out-of-scope'):
            errors.append('Invalid entry status: '+str(entry.get('label')))
        if entry.get('status') in ('reviewed','out-of-scope') and not entry.get('notes','').strip():
            errors.append('Entry needs a decision note: '+str(entry.get('label')))
        if ready and entry.get('status')=='pending':
            errors.append('Entry still pending: '+str(entry.get('label')))
    expected = {label:block['text'] for label,block in packet['blocks'].items() if block['kind']=='text'}
    translations = review.get('translations',[])
    if Counter(t.get('label') for t in translations)!=Counter(expected.keys()):
        errors.append('Translation coverage differs from extracted texts')
    for item in translations:
        label = item.get('label')
        if item.get('original')!=expected.get(label):
            errors.append('Original text changed: '+str(label))
        zh = item.get('zh','')
        if Counter(PLACEHOLDER.findall(zh))!=Counter(PLACEHOLDER.findall(expected.get(label,''))):
            if zh or ready:
                errors.append('Dialogue placeholders changed: '+str(label))
        if ready and (not zh.strip() or item.get('reviewed') is not True):
            errors.append('Translation not reviewed: '+str(label))
    for section, key, expected_names in (('mapEntries','id',[e['id'] for e in packet['entryInventory']]),
                                          ('cFunctions','name',list(packet['cFunctions']))):
        decisions = review.get(section,[])
        if Counter(d.get(key) for d in decisions)!=Counter(expected_names):
            errors.append('Review coverage differs: '+section)
        for decision in decisions:
            if decision.get('status') not in ('reviewed','pending','out-of-scope'):
                errors.append('Invalid review status: '+str(decision.get(key)))
            if decision.get('status')!='pending' and not decision.get('notes','').strip():
                errors.append('Review decision needs a note: '+str(decision.get(key)))
            if ready and decision.get('status')=='pending':
                errors.append('Review still pending: '+str(decision.get(key)))
    evidence = list(review.get('facts',[])) + list(review.get('scenarios',[]))
    for fact in evidence:
        anchors = fact.get('sources',[])
        if not anchors:
            errors.append('Claim/scenario requires source anchors')
        for anchor in anchors:
            if 'function' in anchor:
                records = packet['cFunctions'].get(anchor['function'],{}).get('definitions',[])
                block = next((r for r in records if r['path']==anchor.get('path')),None)
            elif 'macro' in anchor:
                block = packet['macros'].get(anchor['macro'])
            else:
                block = packet['blocks'].get(anchor.get('label'))
            lines = anchor.get('lines',[])
            if not block or not lines or any(not isinstance(n,int) or not block['line'] <= n <= block['endLine'] for n in lines):
                errors.append('Invalid source anchor: '+str(anchor))
    if ready and not review.get('scenarios'):
        errors.append('At least one success/branch/cancellation/re-entry scenario is required')
    return errors
