const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = path.resolve(__dirname, '../htdocs/luci-static/resources/unifi');
const core = new Function('baseclass', fs.readFileSync(path.join(base, 'core.js'), 'utf8'))({extend: x => x});
const source = fs.readFileSync(path.join(base, 'overview.js'), 'utf8');

function fixture(enabled, overrides = {}, refreshInterval = '1') {
  const calls = [], data = {
    traffic: async device => { calls.push(['traffic', device]); return {device, time: Date.now(), rx: 1000, tx: 500}; },
    activity: async (device, since, id) => { calls.push(['history', device, since, id]); return {id:'collector',device,cursor:2,now:2000,rx:1000,tx:500,samples:[[1,1000,null,null],[2,2000,1000,500]]}; },
    ...overrides
  };
  const document = {documentElement:{lang:'en'}, hidden:false};
  const dashboard = new Function('baseclass','data','core','settings','document','L',source)(
    {extend:x=>x},data,core,{get:key=>key==='dashboard_refresh'?refreshInterval:enabled?'1':'0'},document,{bind:(fn,scope)=>fn.bind(scope)});
  Object.assign(dashboard,{selected:'eth0',generation:1,disposed:false,history:[],previous:null,activityState:null,refs:{notice:{textContent:''}}});
  dashboard.renderTraffic = function(delta, rx, tx) { this.rendered = {delta, rx, tx}; };
  return {dashboard, calls};
}

test('enabled dashboard restores server history immediately and then requests only new points', async () => {
  const {dashboard, calls} = fixture(true);
  await dashboard.refreshActivity();
  assert.equal(dashboard.history.length, 2);
  assert.equal(dashboard.rendered.delta.down, 1000);
  await dashboard.refreshActivity();
  assert.equal(dashboard.history.length, 2);
  assert.deepEqual(calls, [['history','eth0',undefined,undefined],['history','eth0',2,'collector']]);
});

test('disabled dashboard collects only foreground counters', async () => {
  const {dashboard, calls} = fixture(false);
  await dashboard.refreshActivity();
  assert.deepEqual(calls, [['traffic','eth0']]);
  assert.equal(dashboard.history.length, 1);
  assert.equal(dashboard.rendered.delta, null);
});

test('background failure visibly falls back, then recovers the full server history', async () => {
  let failing = true;
  const {dashboard} = fixture(true, {activity: async device => {
    if (failing) throw new Error('service unavailable');
    return {id:'new',device,cursor:1,now:1000,samples:[[1,1000,500,100]]};
  }});
  await dashboard.refreshActivity();
  assert.match(dashboard.refs.notice.textContent, /Background sampling unavailable/);
  failing = false;
  await dashboard.refreshActivity();
  assert.equal(dashboard.history.length, 1);
  assert.equal(dashboard.history[0].down, 500);
  assert.equal(dashboard.refs.notice.textContent, '');
});

test('late history replies cannot cross an interface switch or unmount', async () => {
  for (const action of [d=>{d.selected='eth1';}, d=>{d.disposed=true;}]) {
    let resolve;
    const {dashboard} = fixture(true, {activity: () => new Promise(r=>{resolve=r;})});
    const pending = dashboard.refreshActivity();
    action(dashboard);
    resolve({id:'old',device:'eth0',cursor:1,now:1000,samples:[[1,1000,10,5]]});
    await pending;
    assert.equal(dashboard.history.length, 0);
    assert.equal(dashboard.rendered, undefined);
  }
});

test('configured dashboard interval slows system queries while activity keeps updating', async () => {
  const {dashboard} = fixture(false, {}, '5');
  let metrics=0, activity=0;
  dashboard.lastOverview=Date.now();
  dashboard.collect=async()=>{metrics++;return {info:{uptime:1}};};
  dashboard.update=()=>{};
  dashboard.refreshActivity=async()=>{activity++;};
  await dashboard.tick();
  assert.equal(activity,1); assert.equal(metrics,0);
  dashboard.lastOverview=0;
  await dashboard.tick();
  assert.equal(activity,2); assert.equal(metrics,1);
});

test('default dashboard interval refreshes system data on every one-second tick', async () => {
  const {dashboard} = fixture(false);
  let metrics=0;
  dashboard.lastOverview=Date.now();
  dashboard.collect=async()=>{metrics++;return {info:{uptime:1}};};
  dashboard.update=()=>{};
  dashboard.refreshActivity=async()=>{};
  await dashboard.tick();
  await dashboard.tick();
  assert.equal(metrics,2);
});
