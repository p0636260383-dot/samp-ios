"""Run the built app on one iPhone and one iPad; retain screenshots in CI."""
import json
from pathlib import Path
import subprocess
import time

def run(*args):
    return subprocess.check_output(args, text=True, stderr=subprocess.STDOUT, timeout=150)

app = Path('build/simulator/Build/Products/Debug-iphonesimulator/RotCity.app').resolve()
output = Path('build/screenshots')
output.mkdir(parents=True, exist_ok=True)
inventory = json.loads(run('xcrun', 'simctl', 'list', 'devices', 'available', '--json'))
devices = [device for runtime, items in inventory['devices'].items() if 'iOS' in runtime for device in items]
for family in ['iPhone', 'iPad']:
    device = next(device for device in devices if device['name'].startswith(family))
    udid = device['udid']
    if device['state'] != 'Booted':
        run('xcrun', 'simctl', 'boot', udid)
    try:
        run('xcrun', 'simctl', 'bootstatus', udid, '-b')
        run('xcrun', 'simctl', 'install', udid, str(app))
        run('xcrun', 'simctl', 'launch', udid, 'com.rotcity.ios')
        time.sleep(4)
        run('xcrun', 'simctl', 'io', udid, 'screenshot', str(output / f'{family}-launcher.png'))
        run('xcrun', 'simctl', 'terminate', udid, 'com.rotcity.ios')
        print(f'Launched and captured {device["name"]}')
    finally:
        run('xcrun', 'simctl', 'shutdown', udid)
