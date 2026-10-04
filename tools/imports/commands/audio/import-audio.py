"""Copy selected real WAV samples from the read-only reference, retaining provenance hashes."""
import argparse
import hashlib
import json
from imports.context import PROJECT, ImportSession, arguments, source_argument, source_revision
import wave
parser=argparse.ArgumentParser()
source_argument(parser)
args=arguments(parser, profile=True)
session=ImportSession(args, 'import-audio.py')
root=session.source
target=session.dist/'assets/audio'
files=session.profile['audio']
records=[]
for name,ref in files.items():
 source=root/'sound/direct_sound_samples'/ref
 with wave.open(str(source)) as audio:
  duration=audio.getnframes()/audio.getframerate()
 session.binary(target/name,source.read_bytes())
 records.append({'asset':'assets/audio/'+name,'reference':'sound/direct_sound_samples/'+ref,'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'duration':duration})
session.text(target/'provenance.json',json.dumps({'referenceRevision':source_revision(root),'purpose':'Real sample previews; provisional SFX mapping, not native sequenced BGM/SE reconstruction','files':records},indent=2)+'\n')
print('Imported real WAV samples:',len(records))

session.finish()
