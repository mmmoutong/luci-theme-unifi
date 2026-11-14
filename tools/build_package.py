#!/usr/bin/env python3
"""Build an architecture-independent opkg package without an OpenWrt SDK.

The SDK Makefile remains the canonical build route. This builder packages only
static files, ucode source and LuCI JS; no compiled objects or host binaries.
"""
from pathlib import Path
import io, tarfile, json, hashlib, gzip, re
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT; OUT=ROOT/'artifacts'
makefile=(ROOT/'Makefile').read_text()
VERSION='-'.join(re.search(r'^'+key+r':=(.+)$',makefile,re.M).group(1).strip() for key in ('PKG_VERSION','PKG_RELEASE'))
LICENSE=re.search(r'^PKG_LICENSE:=(.+)$',makefile,re.M).group(1).strip()
def archive(entries):
    buf=io.BytesIO()
    with tarfile.open(fileobj=buf,mode='w',format=tarfile.GNU_FORMAT) as t:
        directories=set()
        for name,data,mode in entries:
            for parent in reversed(Path(name).parents):
                if str(parent)=='.' or str(parent) in directories: continue
                directory=tarfile.TarInfo('./'+str(parent));directory.type=tarfile.DIRTYPE;directory.mode=0o755;directory.mtime=0
                t.addfile(directory);directories.add(str(parent))
            item=tarfile.TarInfo('./'+name);item.size=len(data);item.mode=mode;item.uid=item.gid=0;item.mtime=0
            t.addfile(item,io.BytesIO(data))
    return gzip.compress(buf.getvalue(),mtime=0)
OUT.mkdir(exist_ok=True)
entries=[]
for source,destination in [('htdocs','www'),('ucode','usr/share/ucode/luci'),('root','')]:
    for f in sorted((SRC/source).rglob('*')):
        if not f.is_file() or f.name=='.DS_Store':continue
        name='/'.join(x for x in [destination,str(f.relative_to(SRC/source))] if x)
        entries.append((name,f.read_bytes(),0o755 if 'uci-defaults/' in name or 'etc/init.d/' in name else 0o644))
size=sum(len(x[1]) for x in entries)
control=f'''Package: luci-theme-unifi
Version: {VERSION}
Architecture: all
Maintainer: OpenWrt Unifi theme project
Section: luci
Priority: optional
Depends: luci-base, luci-theme-bootstrap, luci-mod-status, ucode-mod-uloop
Installed-Size: {size}
Description: Unifi LuCI theme with a read-only OpenWrt dashboard
License: {LICENSE}
'''
postinst='''#!/bin/sh
[ -n "$IPKG_INSTROOT" ] && exit 0
/etc/uci-defaults/30_luci-theme-unifi || exit 1
rm -f /tmp/luci-indexcache.*
rm -rf /tmp/luci-modulecache/
/etc/init.d/rpcd reload >/dev/null 2>&1 || true
/etc/init.d/unifi-activity enable
/etc/init.d/unifi-activity start
exit 0
'''
# Refuse to remove an active theme: prevents a stale mediaurlbase from locking out
# a user who uninstalls without selecting their original theme first.
prerm='''#!/bin/sh
[ -n "$IPKG_INSTROOT" ] && exit 0
if [ "$(uci -q get luci.main.mediaurlbase)" = "/luci-static/unifi" ]; then
 echo "Select another LuCI theme before removing luci-theme-unifi." >&2
 exit 1
fi
/etc/init.d/unifi-activity stop
/etc/init.d/unifi-activity disable
exit 0
'''
postrm='''#!/bin/sh
[ -n "$IPKG_INSTROOT" ] && exit 0
uci -q delete luci.themes.Unifi
uci -q commit luci
rm -f /tmp/luci-indexcache.*
exit 0
'''
data=archive(entries)
ctrl=archive([('control',control.encode(),0o644),('conffiles',b'/etc/config/unifi\n',0o644),('postinst',postinst.encode(),0o755),('prerm',prerm.encode(),0o755),('postrm',postrm.encode(),0o755)])
package=archive([('debian-binary',b'2.0\n',0o644),('control.tar.gz',ctrl,0o644),('data.tar.gz',data,0o644)])
name=f'luci-theme-unifi_{VERSION}_all.ipk';(OUT/name).write_bytes(package)
(OUT/'luci-theme-unifi-rootfs.tar.gz').write_bytes(data)
manifest={'package':name,'version':VERSION,'files':[{ 'path':p,'sha256':hashlib.sha256(d).hexdigest(),'mode':oct(m)} for p,d,m in entries]}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
checks=[]
for f in sorted(OUT.glob('*')):
    if f.name=='SHA256SUMS' or not f.is_file():continue
    checks.append(hashlib.sha256(f.read_bytes()).hexdigest()+'  '+f.name)
(OUT/'SHA256SUMS').write_text('\n'.join(checks)+'\n')
print(f'{OUT/name}: {len(package):,} bytes, {len(entries)} payload files')
