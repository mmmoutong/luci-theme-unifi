# Development guide

[Back to README](../README.md) · [简体中文](development.zh-CN.md)

## Back up the current theme selection

Before the first installation, save the existing LuCI configuration and theme path. These commands preserve any earlier backup at the same location:

```sh
[ -s /root/luci-theme-before-unifi ] || \
  uci -q get luci.main.mediaurlbase > /root/luci-theme-before-unifi
[ -f /root/luci-config-before-unifi ] || \
  cp -p /etc/config/luci /root/luci-config-before-unifi
```

## Local preview

From the repository root, with Python **3.9 or later**:

```sh
python3 tools/preview_server.py
```

Open [the local preview](http://127.0.0.1:8765/). Use the page selector for the dashboard, client inventory, native overview, interfaces, theme settings, login, and components. The [login preview](http://127.0.0.1:8765/?page=login) is also directly accessible.

The server binds to `127.0.0.1` and uses the production theme assets with synthetic fixtures. It does not contact a router. Settings are simulated in browser storage, and the login preview prevents credential submission. Stop the server with Ctrl+C.

Use `?page=overview&lang=en`, `?page=clients&lang=en`, or `?page=login&lang=en` for English previews. With the preview server running and Google Chrome installed, `node tools/capture_screenshots.cjs` refreshes the Chinese and English README images at 1920×1080 using Chrome's native font rendering.

## Development

### Build a local IPK

With Python 3.9 or later, from the repository root:

```sh
python3 tools/build_package.py
```

Output is written to the ignored `artifacts/packages/` directory:

- `luci-theme-unifi_<version>-1_all.ipk` — installable package.
- `luci-theme-unifi-rootfs.tar.gz` — package payload.
- `manifest.json` — payload paths, modes, and SHA-256 hashes.
- `SHA256SUMS` — checksums for generated top-level artifacts.

The local builder needs only the Python standard library. It packages static assets, LuCI JavaScript, and ucode source, with no host binaries. It does not replace validation against a matching OpenWrt SDK.

### Build with an OpenWrt SDK or source tree

Place this repository at `package/luci-theme-unifi` inside an OpenWrt source tree or SDK with the LuCI feed configured at `feeds/luci`. Select `luci-theme-unifi` in the build configuration, then run from the SDK or source tree root:

```sh
make package/luci-theme-unifi/compile V=s
```

### Run tests

The unit tests use Node.js's built-in test runner and require no npm dependencies. Node.js **22** is the version used for local validation:

```sh
node --test tests/*.test.cjs
python3 -m unittest discover -s tests -p 'test_*.py' -v
```

With the OpenWrt `ucode` interpreter available, verify the background history store:

```sh
ucode tests/activity-store.uc
```

Browser checks use a pinned Playwright version. Install the dependencies and Chromium:

```sh
npm ci
npx playwright install chromium
```

Run `python3 tools/preview_server.py` in another terminal, then execute every browser suite:

```sh
UCODE_BIN=/path/to/ucode npm run test:browser
```

`UCODE_BIN` selects a host OpenWrt ucode interpreter; the default is `vendor/ucode/build/ucode`. CI builds a pinned interpreter and checks the history store and template compilation too.

Optional overrides are `UNIFI_PREVIEW_URL` and `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Reports and screenshots go to `artifacts/`. No router credentials are needed.

### Update vendor data

The generated `htdocs/luci-static/resources/unifi/brand-data.js` is committed, so normal builds and router use work without downloading brand data. Definitions live in `tools/brand-definitions.json`, and source checksums are recorded in `tools/brand-data-sources.json`.

```sh
python3 tools/generate_brands.py
python3 tools/generate_brands.py --check
```

The first command downloads source files into the ignored `vendor/brand-data/` cache. `--check` verifies against that cache without downloading. Use `--refresh` only when intentionally updating upstream data, then review the generated module, provenance, and license changes together.

### Source layout and release hygiene

| Path | Purpose |
| --- | --- |
| `htdocs/` | Installed CSS, JavaScript, fonts, and artwork |
| `ucode/` | LuCI header, footer, and authentication templates |
| `root/` | Theme registration, configuration, menus, ACLs, and license files |
| `preview/` | Local demo harness and synthetic fixtures |
| `tests/` | Unit/browser checks and visual baselines in `fixtures/reference/` |
| `tools/` | Preview, packaging, version resolution, and vendor source checksums |
| `docs/` | User and developer documentation and preview screenshots |
| `research/` | Ignored local research captures and internal notes |

Only `htdocs/`, `ucode/`, and `root/` supply router payload files. Downloaded tools, generated packages, raw reference captures, device backups, deployment evidence, and historical local notes are excluded by [`.gitignore`](../.gitignore). Keep real hostnames, addresses, credentials, and session data out of contributions and screenshots.

After committing the intended release, create a source archive with:

```sh
python3 tools/bundle_release.py
```

This archives the committed Git tree and writes a separate source checksum file. Ignored local captures and build outputs are excluded. Distribute the generated IPK separately from the source archive.

## Contributing and bug reports

For a bug report, include the firmware and LuCI versions, theme version, browser, viewport size, affected page, and steps to reproduce. Redact device and session information from screenshots and logs. For a plugin layout issue, include the plugin name and version.

Keep changes focused and run the relevant checks. Changes to shared controls or layout should be checked in light and dark modes at desktop and mobile widths. Compatibility reports are welcome; please distinguish local preview results from tests on an actual router.

## Verify a package

Put the downloaded IPK and its matching `SHA256SUMS` in the router's `/tmp/` directory. Verify the IPK before following the README installation commands:

```sh
cd /tmp
sed -n '/\.ipk$/p' SHA256SUMS | sha256sum -c -
```

The IPK must report `OK`. Extract Actions ZIP artifacts on your computer first. CI artifacts are retained for 30 days; tagged release attachments are available under Releases.

Development package versions sort below tagged releases. To replace an installed release with a development build, switch to another theme and remove the existing Unifi package before installing the development IPK.

## Versions and releases

Git tags are the source of release versions; source files do not repeat the current version number:

- `v0.9.0` → IPK version `0.9.0-1`.
- `v0.9.0-rc.1` → IPK version `0.9.0~rc.1-1`, published as a GitHub prerelease.
- Untagged commits → `0~git<commit-time>.<commit>-1`, with `+dirty` added for local changes.
- Source copies without Git metadata → `0~dev-1`; use `python3 tools/build_package.py --version 0.9.0` to set a version explicitly. SDK builds accept `PKG_VERSION=0.9.0`.

`PKG_RELEASE` is the package revision only. Builds write the version into IPK metadata, filenames, `manifest.json`, and template cache identifiers. Templates use LuCI's native `PKG_VERSION` comment marker, supported by both the local builder and SDK.

CI runs unit, packaging, ucode, and all browser checks on branch pushes and pull requests, then uploads the IPK artifact. Version tag pushes reuse those checks and publish the verified artifact to GitHub Releases.

For example, to release `v0.9.0` (replace this with the intended version):

1. Move the pending changes in `CHANGELOG.md` into `## [0.9.0] - YYYY-MM-DD`, using the actual release date.
2. Commit and push the changes, and confirm CI passes.
3. Create and push the tag:

```sh
git tag -a v0.9.0 -m "Release v0.9.0"
git push origin v0.9.0
```

The Release workflow validates the tag format, its commit, and a nonempty matching changelog section before publishing. Attachments include the IPK, root filesystem payload, manifest, and SHA-256 checksums.

## Restore or uninstall

Select your previous theme in LuCI, or restore the saved selection over SSH:

```sh
UNIFI_PREVIOUS_THEME="$(cat /root/luci-theme-before-unifi)" &&
  [ -n "$UNIFI_PREVIOUS_THEME" ] &&
  uci set "luci.main.mediaurlbase=$UNIFI_PREVIOUS_THEME" &&
  uci commit luci
rm -f /tmp/luci-indexcache.*
```

If the backup is unavailable, Bootstrap is an installed dependency and can be selected directly:

```sh
uci set luci.main.mediaurlbase='/luci-static/bootstrap'
uci commit luci
```

After switching away from Unifi, remove it if desired:

```sh
opkg remove luci-theme-unifi
```

The uninstall guard refuses to remove the theme while it is active. A router or network restart is not required for theme switching.

## Theme settings

| Setting | Values | Default |
| --- | --- | --- |
| Appearance | System, light, dark | System |
| Clients per page | 10, 25, 50, 100 | 50 |
| Client refresh interval | 5, 10, 30, 60 seconds | 10 seconds |
| Dashboard information refresh interval | 1, 2, 5, 10, 30, 60 seconds | 1 second |
| Expand navigation by default | On, off | Off |
| Always sample network activity | On, off | On |

These preferences are stored in `/etc/config/unifi` and apply across browsers. Client column choices remain browser preferences. The login page uses its own fixed dark background.

Network activity is sampled every second. The curve scrolls continuously and progressively reveals measured line segments with a one-second display buffer. Pausing updates, hiding the page, or enabling reduced motion stops the animation. **Always sample network activity** is enabled by default under System → Unifi Theme Settings and collects continuously, including while the web interface is closed. The collector retains the last hour per interface in process memory; opening or refreshing the dashboard restores that history, then reads new samples incrementally. No traffic history is written to flash. Disabling the option stops the collector and releases its history; router or collector restarts also clear it. With the option off, only the open dashboard collects samples. System information, interface status and DHCP leases use the dashboard information refresh interval, which defaults to one second.

Dashboard and client collection are read-only. The theme settings permission allows writes only to the `unifi` configuration; native LuCI configuration pages retain their existing write permissions.
