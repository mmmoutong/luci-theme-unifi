const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = path.resolve(__dirname, '../htdocs/luci-static/resources');
const core = new Function('baseclass', fs.readFileSync(path.join(base, 'unifi/core.js'), 'utf8'))({extend: x => x});

function collector(overrides = {}) {
  const calls = [];
  const rpc = {declare: spec => (...args) => {
    calls.push([spec.object, spec.method, ...args].join(':'));
    return overrides.rpc ? overrides.rpc(spec, args) : Promise.resolve(
      spec.method === 'getDHCPLeases' ? {dhcp_leases: []} : {});
  }};
  const network = Object.assign({
    flushCache: () => Promise.resolve(), getDevices: () => Promise.resolve([]),
    getWANNetworks: () => Promise.resolve([]), getNetworks: () => Promise.resolve([]),
    getWifiNetworks: () => Promise.resolve([])
  }, overrides.network);
  const files = {read: name => {
    calls.push(name);
    return overrides.read ? overrides.read(name) : Promise.resolve(name === '/proc/stat' ? 'cpu  10 0 10 80 0 0 0 0\n' : '12');
  }};
  const data = new Function('baseclass', 'rpc', 'fs', 'network', 'core', fs.readFileSync(path.join(base, 'unifi/data.js'), 'utf8'))(
    {extend: x => x}, rpc, files, network, core);
  return {data, calls};
}

test('overview collects metrics and leases without requesting inventory-only permissions', async () => {
  const {data, calls} = collector();
  const result = await data.overview();
  assert.deepEqual(result.cpu, {total: 100, idle: 80});
  assert.equal(result.connections, 12);
  assert.ok(calls.includes('luci-rpc:getDHCPLeases'));
  assert.ok(!calls.some(c => /getHostHints|uci:|\/proc\/net\/arp/.test(c)));
  assert.deepEqual(result.unavailable, []);
});

test('concurrent snapshots share requests but the next poll reads fresh data', async () => {
  const {data, calls} = collector();
  const first = data.overview(), second = data.overview();
  assert.equal(first, second);
  await Promise.all([first, second]);
  assert.equal(calls.filter(c => c === 'system:info').length, 1);
  await data.overview();
  assert.equal(calls.filter(c => c === 'system:info').length, 2);
});

test('a denied source stays unavailable and does not discard working sources', async () => {
  const {data} = collector({rpc: spec => spec.method === 'getDHCPLeases' ? Promise.reject(new Error('denied')) : Promise.resolve({uptime: 42})});
  const result = await data.overview();
  assert.equal(result.leases, null);
  assert.equal(result.info.uptime, 42);
  assert.deepEqual(result.unavailable, ['leases']);
});

test('client collection reads AP associations and excludes a station uplink', async () => {
  let stationCalls = 0;
  const ap = {getMode: () => 'ap', getIfname: () => 'phy0-ap0', getSSID: () => 'Home', getChannel: () => 36,
    getNetworkNames: () => ['lan'], getAssocList: () => Promise.resolve([{mac: '02:11:22:33:44:01', signal: -55}])};
  const sta = {getMode: () => 'sta', getAssocList: () => {stationCalls++; return Promise.resolve([]);}};
  const {data, calls} = collector({network: {getWifiNetworks: () => Promise.resolve([ap, sta])}});
  const result = await data.clients();
  assert.equal(stationCalls, 0);
  assert.equal(result.wifi.length, 1);
  assert.equal(result.wifi[0].ssid, 'Home');
  assert.ok(!calls.some(c => /system:|\/proc\/stat/.test(c)));
});

test('client collection preserves reservations, device mapping and router exclusions', async () => {
  const dev = {getName: () => 'br-lan', getMAC: () => '02:00:00:00:00:01'};
  const {data} = collector({
    rpc: spec => Promise.resolve(spec.object === 'uci' ? {host1: {'.type': 'host', name: 'Server'}, dns: {'.type': 'dnsmasq'}} : {}),
    network: {getDevices: () => Promise.resolve([dev]), getNetworks: () => Promise.resolve([{getName: () => 'lan', getL3Device: () => dev}])}
  });
  const result = await data.clients();
  assert.deepEqual(result.statics, [{'.type': 'host', name: 'Server'}]);
  assert.deepEqual(result.deviceNetworks, {'br-lan': 'lan'});
  assert.deepEqual(result.ignoreMacs, ['02:00:00:00:00:01']);
});

test('one-second foreground traffic uses a single device query with no inventory refresh', async () => {
  const {data, calls} = collector({rpc: () => Promise.resolve({statistics: {rx_bytes: 1234, tx_bytes: 567}})});
  const sample = await data.traffic('pppoe-wan');
  assert.equal(sample.device, 'pppoe-wan');
  assert.equal(sample.rx, 1234); assert.equal(sample.tx, 567);
  assert.deepEqual(calls, ['network.device:status:pppoe-wan']);
});

test('missing interface counters are unavailable rather than a zero-rate sample', async () => {
  await assert.rejects(collector().data.traffic('gone'), /unavailable/);
});

test('background history forwards the selected interface and incremental cursor', async () => {
  const {data, calls} = collector({rpc: () => Promise.resolve({samples: []})});
  await data.activity('eth0', 42, 'collector-id');
  assert.deepEqual(calls, ['unifi.activity:history:eth0:42:collector-id']);
});
