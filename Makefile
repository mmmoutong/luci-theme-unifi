include $(TOPDIR)/rules.mk

LUCI_TITLE:=Unifi theme with an OpenWrt-native dashboard
LUCI_DEPENDS:=+luci-base +luci-theme-bootstrap +luci-mod-status +ucode-mod-uloop
LUCI_PKGARCH:=all
PKG_VERSION:=0.8.2
PKG_RELEASE:=1
PKG_LICENSE:=Apache-2.0 CC0-1.0 OFL-1.1

define Package/luci-theme-unifi/conffiles
/etc/config/unifi
endef

define Package/luci-theme-unifi/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0
/etc/uci-defaults/30_luci-theme-unifi || exit 1
rm -f /tmp/luci-indexcache.*
rm -rf /tmp/luci-modulecache/
/etc/init.d/rpcd reload >/dev/null 2>&1 || true
/etc/init.d/unifi-activity enable
/etc/init.d/unifi-activity start
exit 0
endef

define Package/luci-theme-unifi/prerm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0
if [ "$$(uci -q get luci.main.mediaurlbase)" = "/luci-static/unifi" ]; then
 echo "Select another LuCI theme before removing luci-theme-unifi." >&2
 exit 1
fi
/etc/init.d/unifi-activity stop
/etc/init.d/unifi-activity disable
exit 0
endef

define Package/luci-theme-unifi/postrm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0
uci -q delete luci.themes.Unifi
uci -q commit luci
rm -f /tmp/luci-indexcache.*
exit 0
endef

include $(TOPDIR)/feeds/luci/luci.mk

# Build within an OpenWrt/LuCI source tree or SDK.
