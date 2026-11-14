import io
from pathlib import Path
import sys
import tarfile
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from build_package import build


def contents(data):
    with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as bundle:
        return {entry.name.removeprefix('./'): (bundle.extractfile(entry).read(), entry.mode)
                for entry in bundle.getmembers() if entry.isfile()}


class PackageTests(unittest.TestCase):
    def test_ipk_payload_version_permissions_and_reproducibility(self):
        info = {'version': '1.2.3~rc.1', 'tag': 'v1.2.3-rc.1', 'commit': 'a' * 40, 'dirty': False}
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            (output / 'unrelated.txt').write_text('not a build product')
            package = build(ROOT, output, info)
            first = package.read_bytes()
            outer = contents(first)
            self.assertEqual(set(outer), {'debian-binary', 'control.tar.gz', 'data.tar.gz'})
            self.assertEqual(outer['debian-binary'][0], b'2.0\n')
            control = contents(outer['control.tar.gz'][0])
            self.assertIn(b'Version: 1.2.3~rc.1-1\n', control['control'][0])
            self.assertEqual(control['conffiles'][0], b'/etc/config/unifi\n')
            for hook in ['postinst', 'prerm', 'postrm']:
                self.assertEqual(control[hook][1], 0o755)
            self.assertIn(b'Select another LuCI theme', control['prerm'][0])
            self.assertIn(b'unifi-activity start', control['postinst'][0])
            payload = contents(outer['data.tar.gz'][0])
            expected = set()
            for source, prefix in [('htdocs', 'www/'), ('ucode', 'usr/share/ucode/luci/'), ('root', '')]:
                expected.update(prefix + str(file.relative_to(ROOT / source))
                                for file in (ROOT / source).rglob('*')
                                if file.is_file() and file.name != '.DS_Store')
            self.assertEqual(set(payload), expected)
            self.assertEqual(payload['etc/init.d/unifi-activity'][1], 0o755)
            self.assertEqual(payload['etc/uci-defaults/30_luci-theme-unifi'][1], 0o755)
            self.assertIn(b"option activity_always '1'", payload['etc/config/unifi'][0])
            templates = [data for name, (data, _) in payload.items() if name.endswith('.ut')]
            self.assertTrue(templates)
            self.assertTrue(all(b'PKG_VERSION' not in data for data in templates))
            header = payload['usr/share/ucode/luci/template/themes/unifi/header.ut'][0]
            self.assertIn(b'appearance.js?v=1.2.3~rc.1', header)
            footer = payload['usr/share/ucode/luci/template/themes/unifi/footer.ut'][0]
            self.assertIn(b'-unifi-1.2.3~rc.1', footer)
            self.assertEqual(package.name, 'luci-theme-unifi_1.2.3~rc.1-1_all.ipk')
            self.assertEqual({file.name for file in output.iterdir()}, {package.name, 'unrelated.txt'})
            self.assertEqual((output / 'unrelated.txt').read_text(), 'not a build product')
            build(ROOT, output, info)
            self.assertEqual(first, package.read_bytes(), 'identical inputs produce identical IPKs')


if __name__ == '__main__':
    unittest.main()
