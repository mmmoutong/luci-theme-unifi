const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

test('collector defaults to enabled, respects its switch and reevaluates it on UCI reload', () => {
  for (const enabled of ['','0','1']) {
    const result=spawnSync('/bin/sh',['-c',`
      config_load() { :; }
      config_get_bool() { activity_always="$UNIFI_ENABLED"; [ -n "$activity_always" ] || activity_always="$4"; }
      procd_open_instance() { echo instance; }
      procd_set_param() { echo "$@"; }
      procd_close_instance() { :; }
      procd_add_reload_trigger() { echo "trigger $1"; }
      start() { start_service; }
      . "$UNIFI_INIT"
      reload_service
      service_triggers
    `],{encoding:'utf8',env:{...process.env,UNIFI_ENABLED:enabled,UNIFI_INIT:path.resolve(__dirname,'../root/etc/init.d/unifi-activity')}});
    assert.equal(result.status,0,result.stderr);
    assert.match(result.stdout,/trigger unifi/);
    assert.equal(result.stdout.includes('instance'),enabled!=='0');
    if(enabled!=='0') assert.match(result.stdout,/command \/usr\/bin\/ucode \/usr\/share\/unifi\/activity.uc/);
  }
});
