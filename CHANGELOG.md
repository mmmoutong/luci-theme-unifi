# Changelog

## [Unreleased]

### Added

- A concise English bug report form with firmware version, behavior, and screenshots.

### Changed

- Build and publish only the installable IPK; remove separate payload archives, manifests, and checksum files from the package workflow.

### Fixed

- Validate release notes before starting the full test suite.
- Upload validated build assets to an existing GitHub Release, preserving any release notes already supplied by the maintainer.

## [1.0.0] - 2026-11-14

### Added

- GitHub Actions checks for JavaScript, packaging, ucode storage, templates, and browser behavior.
- Automatic IPK artifacts after successful CI runs and GitHub Releases when a version tag passes all checks.
- Tag-derived package versions, build provenance, SHA-256 checksums, and release notes extracted from this file.
- Installation instructions for release packages and CI artifacts.
- Reproducible 1920×1080 English and Chinese documentation screenshots captured with Google Chrome.

### Changed

- Move vendor source checksums to `tools/` and visual reference data to `tests/fixtures/reference/`.
- Reserve `research/` for ignored local captures and internal notes.
- Put README navigation above the introduction and display localized screenshots in separate rows under Preview.
- Use ImmortalWrt as the preview hostname and document 23.05 testing with newer versions pending validation.
- Replace repeated theme version literals with build-time version substitution for cache invalidation.
- Verify the visible containing surface when a client table has a transparent background.
- Increase the local preview server's connection queue for concurrent browser asset requests.

The initial source snapshot is commit `7ec35877a1fe`. No tagged release predates this changelog.
