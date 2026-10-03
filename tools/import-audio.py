"""Copy selected real WAV samples from the read-only reference, retaining provenance hashes."""
import argparse
import hashlib
import json
import shutil
import wave
from pathlib import Path
parser=argparse.ArgumentParser()
parser.add_argument('source')
args=parser.parse_args()
root=Path(args.source)
target=Path(__file__).resolve().parents[1]/'dist/assets/audio'
target.mkdir(parents=True,exist_ok=True)
files={
 'bicycle-bell.wav':'bicycle_bell.wav', 'register-noise.wav':'register_noise.wav',
 'kick.wav':'sc88pro_rnd_kick.wav','snare.wav':'sd90_solo_snare.wav',
 **{'cry-'+s+'.wav':'cries/'+s+'.wav' for s in ['mudkip','treecko','torchic']},
}
records=[]
for name,ref in files.items():
 source=root/'sound/direct_sound_samples'/ref
 with wave.open(str(source)) as audio:
  duration=audio.getnframes()/audio.getframerate()
 shutil.copyfile(source,target/name)
 records.append({'asset':'assets/audio/'+name,'reference':'sound/direct_sound_samples/'+ref,'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'duration':duration})
(target/'provenance.json').write_text(json.dumps({'referenceRevision':'731ad5bfd6e6f265508d0efcca0ba42f9dcf5881','purpose':'Real sample previews; provisional SFX mapping, not native sequenced BGM/SE reconstruction','files':records},indent=2)+'\n')
print('Imported real WAV samples:',len(records))
