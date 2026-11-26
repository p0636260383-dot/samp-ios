"""Exercise the shared C codec using an existing Linux/macOS C compiler."""
from pathlib import Path
import subprocess
import os
import sys

root = Path(__file__).resolve().parent.parent
codec = root / 'Sources/RotCityOpus'
output = root / 'build/native-tests'
output.mkdir(parents=True, exist_ok=True)
binary = output / 'voice-codec-test'
includes = ['include', 'vendor/include', 'vendor/celt', 'vendor/silk', 'vendor/silk/float', 'vendor/src']
command = [os.environ.get('CC', 'cc'), '-std=c99', '-O2', '-DOPUS_BUILD', '-DVAR_ARRAYS',
           '-DHAVE_LRINTF', '-DHAVE_LRINT']
command += ['-I' + str(codec / directory) for directory in includes]
command += [str(file) for file in sorted(codec.rglob('*.c'))]
command += [str(root / 'Tests/NativeTests/voice_codec_test.c'), '-lm', '-o', str(binary)]
result = subprocess.run(command, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
if result.returncode:
    print(result.stdout[-12000:], file=sys.stderr)
    sys.exit(result.returncode)
subprocess.run([str(binary)], check=True)
