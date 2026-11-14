// Reproduces clipped LuCI route labels and wrapped client mode labels.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.UNIFI_PREVIEW_URL||'http://127.0.0.1:8765';
const output=path.resolve(__dirname,'../artifacts/tabs');
fs.mkdirSync(output,{recursive:true});

(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 const page=await browser.newPage();const errors=[],checked=[];
 page.on('pageerror',e=>errors.push(e.message));
 async function labels(selector){
  const values=await page.locator(selector).evaluateAll(es=>es.map(e=>{
   const range=document.createRange();range.selectNodeContents(e);
   const style=getComputedStyle(e),rect=range.getBoundingClientRect();
   return {text:e.textContent,lines:range.getClientRects().length,textWidth:rect.width,
    available:e.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),height:e.getBoundingClientRect().height,border:style.borderBottomWidth};
  }));
  assert.ok(values.length);
  for(const value of values){assert.equal(value.lines,1,value.text+' is one line');assert.ok(value.textWidth<=value.available+1,value.text+' is fully visible');assert.equal(value.height,28);assert.equal(value.border,'0px');}
  return values;
 }
 try{
  for(const mode of ['light','dark'])for(const width of [1440,1000,390,320]){
   await page.setViewportSize({width,height:1000});
   await page.goto(base+'/?page=components&mode='+mode);
   await page.locator('#topmenu .uf-nav-toggle').waitFor();
   await page.waitForFunction(()=>getComputedStyle(document.body).fontFamily.includes('Inter'));
   await page.locator('#route-tabs').waitFor();
   await page.evaluate(()=>document.fonts.ready);
   const native=await labels('#route-tabs a');
   assert.equal(await page.locator('#route-tabs').evaluate(e=>e.getBoundingClientRect().height),32);
   await page.locator('#route-tabs').getByRole('link',{name:'IPv6 路由',exact:true}).click();
   assert.equal(await page.locator('#route-preview').textContent(),'IPv6');
   assert.equal(await page.locator('#route-tabs li.cbi-tab').getAttribute('data-tab'),'ipv6routing');
   await page.locator('#route-tabs').getByRole('link',{name:'IPv4 路由',exact:true}).click();
   await labels('#crowded-tabs a');
   assert.equal(await page.locator('#crowded-tabs').evaluate(e=>e.scrollWidth>e.clientWidth),true,'crowded labels scroll locally');
   assert.equal(await page.locator('#crowded-tabs [data-errors]').evaluate(e=>getComputedStyle(e,'::after').content),'"2"');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.locator('#route-tabs').screenshot({path:path.join(output,'routes-'+mode+'-'+width+'.png')});
   // Longer English labels must also stay intact in the narrow container.
   await page.locator('#route-tabs a').evaluateAll(es=>es.forEach((e,i)=>e.textContent=i?'IPv6 Routing':'IPv4 Routing'));
   await labels('#route-tabs a');
   await page.goto(base+'/?page=clients&mode='+mode);
   await page.locator('#topmenu .uf-nav-toggle').waitFor();
   await page.waitForFunction(()=>getComputedStyle(document.body).fontFamily.includes('Inter'));
   await page.locator('tr[data-client-id]').first().waitFor();
   await page.evaluate(()=>document.fonts.ready);
   const clients=await labels('.uf-client-modes>button');
   assert.equal(await page.locator('.uf-client-modes').evaluate(e=>e.getBoundingClientRect().height),32);
   await page.getByRole('button',{name:'IP 表',exact:true}).click();
   assert.equal(await page.getByRole('button',{name:'IP 表',exact:true}).getAttribute('aria-pressed'),'true');
   assert.ok(await page.getByRole('columnheader',{name:'IPv6 地址',exact:true}).count());
   await page.getByRole('button',{name:'主',exact:true}).click();
   assert.equal(await page.getByRole('button',{name:'主',exact:true}).getAttribute('aria-pressed'),'true');
   await page.locator('.uf-client-modes').screenshot({path:path.join(output,'clients-'+mode+'-'+width+'.png')});
   await page.locator('.uf-client-modes>button').evaluateAll(es=>es.forEach((e,i)=>e.textContent=i?'IP table':'Main'));
   await labels('.uf-client-modes>button');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,mode+' client overflow at '+width);
   assert.equal(await page.locator('.uf-client-source-note,.uf-client-detail-note').count(),0);
   checked.push({mode,width,native,clients});
  }
  await page.goto(base+'/?page=overview');await page.locator('#uf-dashboard').waitFor();
  const text=await page.locator('#uf-dashboard').textContent();
  for(const removed of ['网络与系统，一目了然','链路状态不等于','有效租约不代表','仅显示本页已采集的数据','需要两个有效采样点'])assert.ok(!text.includes(removed),removed+' removed');
  assert.equal(await page.locator('.uf-page-heading p,.uf-table-caption').count(),0);
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({checked,pageErrors:errors},null,2)+'\n');
  console.log('Tab browser checks passed: full single-line Chinese/English labels at 1440/1000/390/320px in light/dark; route and client mode switching; crowded tabs scroll locally; error badges retained; redundant copy removed');
 }catch(error){
  console.error({url:page.url(),pageErrors:errors,view:(await page.locator('#view').textContent()).slice(0,1200)});
  throw error;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
