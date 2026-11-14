const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'htdocs/luci-static/resources/unifi/settings.js'),'utf8');
function settings(values={}){return new Function('baseclass','document',source)({extend:x=>x},{documentElement:{getAttribute:key=>values[key]??null}});}
test('missing or malformed theme preferences fall back to bounded defaults',()=>{
 for(const bad of [null,'', '<script>', '-1', '1000000']){
  const prefs=settings({'data-uf-page-size':bad,'data-uf-client-refresh':bad,'data-uf-mode':bad,'data-uf-nav-expanded':bad});
  assert.equal(prefs.get('page_size'),'50');assert.equal(prefs.get('client_refresh'),'10');assert.equal(prefs.get('mode'),'auto');assert.equal(prefs.get('nav_expanded'),'0');
  assert.equal(settings({'data-uf-activity-always':bad}).get('activity_always'),'1');
  assert.equal(settings({'data-uf-dashboard-refresh':bad}).get('dashboard_refresh'),'1');
 }
});
test('valid configured preferences survive the header adapter',()=>{
 const prefs=settings({'data-uf-page-size':'100','data-uf-client-refresh':'30','data-uf-mode':'dark','data-uf-nav-expanded':'1'});
 assert.equal(prefs.get('page_size'),'100');assert.equal(prefs.get('client_refresh'),'30');assert.equal(prefs.get('mode'),'dark');assert.equal(prefs.get('nav_expanded'),'1');
 for(const enabled of ['0','1']) assert.equal(settings({'data-uf-activity-always':enabled}).get('activity_always'),enabled);
 for(const interval of ['1','2','5','10','30','60']) assert.equal(settings({'data-uf-dashboard-refresh':interval}).get('dashboard_refresh'),interval);
});
test('settings permissions are scoped to the theme config and its own menu entry',()=>{
 const acl=JSON.parse(fs.readFileSync(path.join(root,'root/usr/share/rpcd/acl.d/luci-theme-unifi.json')));
 assert.deepEqual(acl['luci-theme-unifi-settings'].read,{uci:['unifi']});
 assert.deepEqual(acl['luci-theme-unifi-settings'].write,{uci:['unifi']});
 const menu=JSON.parse(fs.readFileSync(path.join(root,'root/usr/share/luci/menu.d/luci-theme-unifi.json')));
 assert.deepEqual(menu['admin/system/unifi-theme'].depends.acl,['luci-theme-unifi-settings']);
});
