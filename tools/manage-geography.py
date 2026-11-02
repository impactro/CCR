"""Create public CCR geography offline or download a fresh isolated candidate."""
from __future__ import annotations

import argparse
import contextlib
import importlib.util
import io
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def module(filename):
    spec = importlib.util.spec_from_file_location(filename.replace('-', '_'), ROOT / 'tools' / filename)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('plan', 'rebuild', 'refresh'))
    parser.add_argument('--output', type=Path, help='New/empty candidate root required for refresh; never the installed runtime.')
    args = parser.parse_args(argv)
    downloader = module('build-geography.py')
    if args.action == 'plan':
        print(json.dumps({'downloadSources': [downloader.MESH, downloader.STATES, downloader.CITIES, downloader.WORLD],
                          'offlineBuilder': 'tools/build-geography-atlas.py',
                          'attribution': 'data/geography/sources.json', 'runtimeDownloads': False}, ensure_ascii=False, indent=2))
        return 0
    root = ROOT if args.action == 'rebuild' else args.output
    if root is None:
        parser.error('refresh requires --output with a new/empty candidate directory')
    root = root.resolve()
    if args.action == 'refresh' and (root == ROOT or (root.exists() and any(root.iterdir()))):
        parser.error('refresh destination must be new/empty and separate from the checkout')
    logs = io.StringIO()
    with contextlib.redirect_stdout(logs):
        if args.action == 'refresh':
            downloader.build(root)
        atlas = module('build-geography-atlas.py').build(root)
    print(json.dumps({'ok': True, 'action': args.action, 'root': str(root), 'assets': len(atlas['assets']),
                      'downloads': args.action == 'refresh', 'sourceManifest': str(root / 'data/geography/sources.json'),
                      'atlasManifest': str(root / 'data/geography/atlas/index.json')}, ensure_ascii=False, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
