const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = path.resolve(__dirname, '../htdocs/luci-static/resources/unifi');
const baseclass = {extend: x => x};
const catalog = new Function('baseclass', fs.readFileSync(path.join(base, 'brand-data.js'), 'utf8'))(baseclass);
const brands = new Function('baseclass', 'catalog', fs.readFileSync(path.join(base, 'brands.js'), 'utf8'))(baseclass, catalog);
const model = new Function('baseclass', fs.readFileSync(path.join(base, 'client-model.js'), 'utf8'))(baseclass);

test('a hostname hint can identify a private-MAC device without claiming an OUI match', () => {
  const id = brands.identify('Guest iPhone', '6A:11:22:33:44:02');
  assert.equal(id.name, 'Apple'); assert.equal(id.type, 'phone');
  assert.equal(id.source, 'hostname'); assert.equal(id.localMac, true);
});

test('globally assigned MAC addresses match the bundled registry offline', () => {
  const id = brands.identify('', '00:1B:63:12:34:56');
  assert.equal(id.name, 'Apple'); assert.equal(id.source, 'mac'); assert.equal(id.localMac, false);
});

test('local, multicast, incomplete and invalid addresses never claim a MAC vendor', () => {
  for (const mac of ['02:1B:63:12:34:56', '01:1B:63:12:34:56', '00:1B:63', '', '00:00:00:00:00:00', 'XX00:1B:63:12:34:56']) {
    const id = brands.identify('', mac);
    assert.equal(id.key, null, mac); assert.equal(id.name, null, mac); assert.equal(id.source, null, mac);
  }
});

test('hostname hints take precedence over MAC registration and keep their source', () => {
  const id = brands.identify('ThinkPad', '00:1B:63:12:34:56');
  assert.equal(id.name, 'Lenovo'); assert.equal(id.source, 'hostname');
});

test('unknown hardware and generic device types do not invent manufacturers', () => {
  assert.equal(brands.identify('Office Printer', '').type, 'printer');
  assert.equal(brands.identify('Office Printer', '').name, null);
  assert.equal(brands.identify('Android Phone', '').name, null);
  assert.equal(brands.identify('<script>alert(1)</script>', '').name, null);
});

test('chip registration is only a device-type hint, not a manufacturer badge', () => {
  const prefix = Buffer.from(catalog.prefixes._network, 'base64').subarray(0, 3).toString('hex');
  const id = brands.identify('', prefix + '123456');
  assert.equal(id.key, null); assert.equal(id.name, null); assert.equal(id.type, 'computer'); assert.equal(id.source, 'mac');
});

test('brand search and sorting include the new vendor field and keep unknowns last', () => {
  const rows = [
    {id: 'b', name: 'second', ipv4: [], ipv6: [], networks: [], identity: brands.identify('ThinkPad', '')},
    {id: 'a', name: 'first', ipv4: [], ipv6: [], networks: [], identity: brands.identify('iPad', '')},
    {id: 'c', name: 'unknown', ipv4: [], ipv6: [], networks: [], identity: brands.identify('', '')}
  ];
  assert.deepEqual(model.query(rows, {search: 'apple'}).map(r => r.id), ['a']);
  assert.deepEqual(model.query(rows, {sort: 'vendor'}).map(r => r.id), ['a', 'b', 'c']);
  assert.deepEqual(model.query(rows, {sort: 'vendor', direction: 'desc'}).map(r => r.id), ['b', 'a', 'c']);
});

test('every named brand has an SVG or letter and source provenance is pinned', () => {
  for (const brand of Object.values(catalog.brands)) {
    if (!brand.name) continue;
    assert.ok(brand.letter || brand.paths.length);
    for (const p of brand.paths || []) assert.match(p, /^[MmZzLlHhVvCcSsQqTtAaEe0-9.,+\s-]+$/);
  }
  const sources = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../tools/brand-data-sources.json'), 'utf8'));
  assert.ok(sources['https://standards-oui.ieee.org/oui/oui.csv']);
  for (const item of Object.values(sources)) assert.match(item.sha256, /^[0-9a-f]{64}$/);
});
