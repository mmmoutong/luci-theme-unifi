#!/usr/bin/env python3
"""Archive the committed public source tree without local captures or build output."""
from pathlib import Path
import hashlib
import subprocess
import zipfile

from version import resolve_version

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts'


def git(*args):
    result = subprocess.run(['git', '-C', str(ROOT), *args], capture_output=True)
    if result.returncode:
        raise SystemExit(result.stderr.decode().strip() or 'Git command failed.')
    return result.stdout


def main():
    # Pin the tree once so the version and archive always describe the same commit.
    revision = git('rev-parse', '--verify', 'HEAD').decode().strip()
    if git('status', '--porcelain', '--untracked-files=normal'):
        raise SystemExit('Commit or set aside pending public changes before bundling a release.')
    version = resolve_version()['version']
    OUT.mkdir(exist_ok=True)
    archive = OUT / f'luci-theme-unifi-{version}.zip'
    git('archive', '--format=zip', f'--prefix=luci-theme-unifi-{version}/',
        '--output=' + str(archive), revision)
    with zipfile.ZipFile(archive) as bundle:
        bad_file = bundle.testzip()
        if bad_file:
            raise SystemExit('Archive integrity check failed: ' + bad_file)
        count = sum(not item.is_dir() for item in bundle.infolist())
    checksum = OUT / 'SOURCE_SHA256SUMS'
    checksum.write_text(hashlib.sha256(archive.read_bytes()).hexdigest() +
                        '  ' + archive.name + '\n')
    print(f'Verified source bundle: {archive.name}, {count} files, commit {revision[:12]}')
    print(f'Source checksum: {checksum.name}')


if __name__ == '__main__':
    main()
