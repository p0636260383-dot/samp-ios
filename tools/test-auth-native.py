"""Verify vendored SA-MP SHA-1 against Python's independent standard library."""
from pathlib import Path
import hashlib
import os
import subprocess

root = Path(__file__).resolve().parent.parent
output = root / 'build/native-tests'
output.mkdir(parents=True, exist_ok=True)
binary = output / 'auth-hash-test'
subprocess.run([os.environ.get('CXX', 'c++'), '-std=c++17', '-O2',
                str(root / 'Sources/RotCityNativeBridge/vendor/raknet/SAMP/samp_auth.cpp'),
                str(root / 'Tests/NativeTests/auth_hash_test.cpp'), '-o', str(binary)], check=True)
cases = ['', 'abc', 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq']
cases += ['a' * length for length in [1, 54, 55, 56, 57, 63, 64, 65, 127, 128, 255]]
for message in cases:
    actual = subprocess.check_output([str(binary), message], text=True).strip().lower()
    expected = hashlib.sha1(message.encode('ascii')).hexdigest()
    assert actual == expected, f'SHA-1 mismatch at length {len(message)}: {actual} != {expected}'
print(f'PASS: auth SHA-1 matches hashlib for {len(cases)} vectors, including 55/56/63/64-byte padding boundaries.')
