const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../htdocs/luci-static/resources/menu-unifi.js'),'utf8');
function fixture({version='release-new',cachedVersion=null,fail=false}={}){
 const store=new Map([['menu',{stale:true}],['unifi-menu-version',cachedVersion]]),classes=new Set(),fresh={children:{admin:{}}};
 let flushes=0,requests=0,rendered;
 const menu={menu:store.get('menu'),flushCache(){flushes++;store.delete('menu');},load(){
  if(this.menu)return Promise.resolve(this.menu);
  if(store.has('menu')){this.menu=store.get('menu');return Promise.resolve(this.menu);}
  requests++;if(fail)return Promise.reject(new Error('offline'));
  this.menu=fresh;store.set('menu',fresh);return Promise.resolve(fresh);
 }};
 const session={getLocalData:key=>store.get(key)??null,setLocalData:(key,value)=>store.set(key,value)};
 const nav=new Function('baseclass','ui','session','settings','L','document',source)(
  {extend:x=>x},{menu},session,{}, {env:{resource_version:version},bind:(fn,scope)=>fn.bind(scope)},
  {body:{classList:{add:name=>classes.add(name)}}});
 nav.render=tree=>{rendered=tree;};
 return {nav,store,menu,classes,fresh,get rendered(){return rendered;},get requests(){return requests;},get flushes(){return flushes;}};
}
test('upgrade clears stored and in-memory menus before loading the permission-filtered tree',async()=>{
 const f=fixture();f.nav.__init__();await f.nav.ready;
 assert.equal(f.flushes,1);assert.equal(f.requests,1);assert.equal(f.rendered,f.fresh);
 assert.equal(f.store.get('unifi-menu-version'),'unifi-navigation-2:release-new');
});
test('same release retains the session menu cache',async()=>{
 const f=fixture({cachedVersion:'unifi-navigation-2:release-new'});f.nav.__init__();await f.nav.ready;
 assert.equal(f.flushes,0);assert.equal(f.requests,0);assert.equal(f.rendered.stale,true);
});
test('a later release invalidates an earlier theme menu revision',async()=>{
 const f=fixture({version:'release-next',cachedVersion:'unifi-navigation-2:release-old'});f.nav.__init__();await f.nav.ready;
 assert.equal(f.requests,1);assert.equal(f.rendered,f.fresh);
 assert.equal(f.store.get('unifi-menu-version'),'unifi-navigation-2:release-next');
});
test('failed menu refresh does not mark stale data as current and retries next time',async()=>{
 const f=fixture({cachedVersion:'release-old',fail:true});f.nav.__init__();await f.nav.ready;
 assert.equal(f.classes.has('uf-menu-failed'),true);assert.equal(f.store.get('unifi-menu-version'),'release-old');
 f.nav.__init__();await f.nav.ready;assert.equal(f.requests,2);
});
