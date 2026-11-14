#!/usr/bin/env python3
"""Sample flat regions and solid foreground pixels in the supplied UniFi PNG.

Reads the image only; stores measurements, never a copy of the screenshot.
Requires Pillow in the development environment, not on the router.
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
from PIL import Image

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('image', type=Path)
parser.add_argument('--output', type=Path, default=Path('tests/fixtures/reference/unifi-dark-palette.json'))
args = parser.parse_args()
im = Image.open(args.image).convert('RGB')
if im.size != (3104, 2046):
    parser.error('These coordinates refer to the original 3104 × 2046 PNG.')

regions = {
    'canvas': ((900, 1500, 2800, 1950), 'all', '#131416'),
    'header': ((110, 0, 3000, 90), 'all', '#292b2f'),
    'card_border': ((127, 140, 130, 410), 'all', '#232426'),
    'graph_grid': ((780, 248, 2985, 850), 'all', '#34383d'),
    'control_background': ((1890, 145, 2210, 210), 'all', '#1c1d1f'),
    'primary_text': ((154, 535, 661, 612), 'foreground', '#dee0e3'),
    'secondary_text': ((450, 270, 665, 305), 'foreground', '#b7bcc2'),
    'accent_blue': ((756, 156, 850, 200), 'blue', '#4797ff'),
    'selected_background': ((320, 1195, 398, 1228), 'all', '#04264d'),
}
measurements = {}
for role, (box, kind, expected) in regions.items():
    pixels = list(im.crop(box).getdata())
    selected = [rgb for rgb in pixels if kind == 'all' or
                (kind == 'foreground' and min(rgb) > 125) or
                (kind == 'blue' and rgb[2] > 200 and rgb[2] > rgb[0] * 1.4)]
    common = Counter(selected).most_common(8)
    expected_rgb = tuple(bytes.fromhex(expected[1:]))
    assert expected_rgb in dict(common), (role, common)
    measurements[role] = {'hex': expected, 'box': box, 'pixel_filter': kind,
                          'matching_pixels': selected.count(expected_rgb),
                          'top_colors': [{'hex': '#%02x%02x%02x' % rgb, 'count': n} for rgb, n in common]}

result = {'source': 'User-supplied UniFi dark dashboard screenshot',
          'image_size': im.size, 'image_sha256': hashlib.sha256(args.image.read_bytes()).hexdigest(),
          'method': 'Exact RGB histogram in original PNG regions; no resizing, quantization or averaging.',
          'measurements': measurements,
          'limits': 'Rendered screenshot pixels, not live computed CSS. Hover, errors and modal surfaces were not shown.'}
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
for role, item in measurements.items():
    print(role, item['hex'], item['matching_pixels'])
