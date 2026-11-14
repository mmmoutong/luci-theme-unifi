# luci-theme-unifi

A UniFi-inspired theme for OpenWrt and ImmortalWrt, with a live dashboard, client inventory, and light and dark modes.

[简体中文](docs/README.md) · [Installation](#installation) · [Development](docs/development.md)

<p align="center">
  <a href="docs/images/dashboard.png"><img src="docs/images/dashboard.png" alt="Dashboard in light mode" width="32%"></a>
  <a href="docs/images/clients-dark.png"><img src="docs/images/clients-dark.png" alt="Client devices in dark mode" width="32%"></a>
  <a href="docs/images/login.png"><img src="docs/images/login.png" alt="Login page" width="32%"></a>
</p>

## Features

- **Dashboard** — interface traffic, CPU, memory, uptime, and network status; optional background sampling with one hour of in-memory history.
- **Client devices** — search, filters, device details, configurable columns, and CSV export, with offline vendor hints.
- **Light and dark** — follow your system or switch manually, with layouts for desktop and mobile.
- **LuCI integration** — compact navigation, a dedicated login page, and built-in theme settings. Native configuration pages and authentication stay available.

## Compatibility

Targets OpenWrt / ImmortalWrt 23.05-based firmware with **ucode-based LuCI** and **opkg**. The dashboard, settings, and background collector have been tested on ImmortalWrt 23.05.4; the current login page has only been checked locally. Legacy Lua-only LuCI, APK-based firmware, and third-party plugin layouts are not verified.

Dependencies: `luci-base`, `luci-theme-bootstrap`, `luci-mod-status`, `ucode-mod-uloop`. The package manager installs these from your firmware's feeds.

## Installation

Build the IPK on your computer with Python **3.9+**, from the repository root:

```sh
python3 tools/build_package.py
```

Copy the generated `artifacts/luci-theme-unifi_*.ipk` to the router's `/tmp/` directory, then run over SSH on the router:

```sh
opkg update
opkg install /tmp/luci-theme-unifi_*.ipk
```

In **System → System → Language and Style**, select **Unifi**, then save and apply. Installation itself does not switch your active theme.

Open **System → Unifi Theme Settings** to adjust appearance, refresh intervals, pagination, and navigation. **Always sample network activity** is enabled by default and keeps collecting while the dashboard is closed; history stays in memory and clears when the collector or router restarts.

**Upgrading:** switch to another theme before installing the replacement package, then select Unifi again. Settings in `/etc/config/unifi` are preserved during normal upgrades.

**Uninstalling:** select another theme first, then run:

```sh
opkg remove luci-theme-unifi
```

For backup and SSH recovery instructions, see the [development guide](docs/development.md#restore-or-uninstall).

## Local preview and development

Preview the theme without a router, using Python 3.9+:

```sh
python3 tools/preview_server.py
```

Open [127.0.0.1:8765](http://127.0.0.1:8765/). The preview uses synthetic data and does not connect to your router.

See the [development guide](docs/development.md) for SDK builds, tests, vendor data, and release packaging. When reporting an issue, include your firmware, LuCI and theme versions, browser, affected page, and reproduction steps.

## License and credits

Original code is licensed under [Apache-2.0](LICENSE). Thanks to LuCI Bootstrap, Inter, Simple Icons, and the IEEE Registration Authority for templates, fonts, icons, and MAC prefix data.

Third-party assets retain their own terms: [Inter / OFL](htdocs/luci-static/unifi/fonts/LICENSE.txt), [Simple Icons / CC0](root/usr/share/licenses/luci-theme-unifi/Simple-Icons-CC0.txt), and the [UniFi wordmark rights notice](htdocs/luci-static/unifi/login-wordmark.NOTICE).

UniFi is a trademark of Ubiquiti Inc. This is an independent community theme, unaffiliated with Ubiquiti, OpenWrt, or ImmortalWrt.
