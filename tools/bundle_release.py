#!/usr/bin/env python3
"""Archive the committed public source tree without local captures or build output."""
from pathlib import Path
import hashlib
import re
import subprocess
import zipfile

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
    makefile = git('show', revision + ':Makefile').decode()
    version = re.search(r'^PKG_VERSION:=(.+)$', makefile, re.M).group(1).strip()
    OUT.mkdir(exist_ok=True)
    archive = OUT / f'unifi-openwrt-{version}.zip'
    git('archive', '--format=zip', f'--prefix=unifi-openwrt-{version}/',
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
