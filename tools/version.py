#!/usr/bin/env python3
"""Resolve release versions from tags; keep development builds below releases."""
import argparse
import datetime
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
TAG = re.compile(r'v((?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*))(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?')


def package_version(tag):
    match = TAG.fullmatch(tag)
    if not match:
        raise ValueError('Expected a version tag such as v0.9.0 or v0.9.0-rc.1')
    return match[1] + ('~' + match[2] if match[2] else '')


def resolve_version(root=ROOT, tag=None, override=None):
    root = Path(root).resolve()

    def git(*args):
        try:
            result = subprocess.run(['git', '-C', str(root), *args],
                                    capture_output=True, text=True, check=False)
        except FileNotFoundError:
            return ''
        return result.stdout.strip() if result.returncode == 0 else ''

    # A source copy inside an SDK must not inherit the firmware repository's tag.
    own_repo = git('rev-parse', '--show-toplevel') == str(root)
    commit = git('rev-parse', 'HEAD') if own_repo else ''
    dirty = bool(git('status', '--porcelain', '--untracked-files=normal')) if own_repo else False
    if tag is not None:
        version = package_version(tag)
        if not commit or git('rev-parse', f'refs/tags/{tag}^{{commit}}') != commit or dirty:
            raise ValueError('A release requires a clean checkout of the requested tag')
    elif override is not None:
        version = package_version('v' + override.removeprefix('v'))
    else:
        exact = git('describe', '--tags', '--exact-match', '--match', 'v[0-9]*', 'HEAD') if own_repo and not dirty else ''
        if exact:
            tag, version = exact, package_version(exact)
        elif commit:
            timestamp = datetime.datetime.fromtimestamp(int(git('show', '-s', '--format=%ct', 'HEAD')),
                                                        datetime.timezone.utc).strftime('%Y%m%d%H%M%S')
            version = f'0~git{timestamp}.{commit[:12]}' + ('+dirty' if dirty else '')
        else:
            version = '0~dev'
    return {'version': version, 'tag': tag, 'commit': commit or None, 'dirty': dirty}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group()
    group.add_argument('--tag', help='require this release tag at HEAD and a clean checkout')
    group.add_argument('--version', help='explicit version for a source copy without Git metadata')
    parser.add_argument('--json', action='store_true')
    args = parser.parse_args()
    try:
        info = resolve_version(tag=args.tag, override=args.version)
    except ValueError as error:
        parser.error(str(error))
    print(json.dumps(info) if args.json else info['version'])


if __name__ == '__main__':
    main()
