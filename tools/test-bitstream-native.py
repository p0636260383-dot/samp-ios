from pathlib import Path
import os
import subprocess

root = Path(__file__).resolve().parent.parent
vendor = root / 'Sources/RotCityNativeBridge/vendor/raknet'
output = root / 'build/native-tests'
output.mkdir(parents=True, exist_ok=True)
binary = output / 'bitstream-test'
subprocess.run([os.environ.get('CXX', 'c++'), '-std=c++17', '-O2', '-Werror=sequence-point',
                '-I' + str(vendor), str(vendor / 'BitStream.cpp'),
                str(root / 'Tests/NativeTests/bitstream_test.cpp'), '-o', str(binary)], check=True)
subprocess.run([str(binary)], check=True)
