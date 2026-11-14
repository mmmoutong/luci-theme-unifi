// Exercise the actual ucode login template and native browser form submission.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const base=process.env.UNIFI_PREVIEW_URL||'http://127.0.0.1:8765';
const ucode=process.env.UCODE_BIN||path.join(root,'vendor/ucode/build/ucode');
const output=path.join(root,'artifacts/login');
fs.mkdirSync(output,{recursive:true});
function render(values={}) {
 const args=Object.entries(values).flatMap(([k,v])=>['-D',k+'='+JSON.stringify(v)]);
 const result=spawnSync(ucode,[...args,'tools/render_login_preview.uc'],{cwd:root,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);return result.stdout;
}
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 const errors=[],checks=[],measurements=[];
 async function open(values={},options={}) {
  const context=await browser.newContext({viewport:{width:1440,height:1000},...options});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/login-fixture',route=>route.fulfill({contentType:'text/html',body:render({preview_submit:false,...values})}));
  await page.goto(base+'/login-fixture');
  return page;
 }
 try {
  assert.equal(fs.readFileSync(path.join(root,'preview/login.html'),'utf8'),render(),'preview is rendered from production template');
  assert.equal(fs.readFileSync(path.join(root,'preview/login-en.html'),'utf8'),render({login_language:'en'}),'English preview is rendered from production template');
  const page=await open();
  assert.equal(await page.locator('#luci_username').inputValue(),'root');
  assert.equal(await page.locator('#luci_password').evaluate(x=>document.activeElement===x),true);
  // Native POST data are checked below without contacting a real router.
  for (const [width,height] of [[1440,1000],[390,844],[320,568],[2765,1200],[844,390]]) {
   await page.setViewportSize({width,height});
   const size=await page.evaluate(()=>{
    const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};
    return {overflow:document.documentElement.scrollWidth>innerWidth,panel:rect('.uf-login-panel'),input:rect('#luci_username'),logo:rect('.uf-login-logo img'),button:rect('.uf-login-submit'),background:getComputedStyle(document.querySelector('main')).backgroundImage};
   });
   assert.equal(size.overflow,false);assert.equal(size.panel.width,width<=480?300:340);
   assert.equal(size.input.height,34);assert.equal(size.button.height,34);assert.equal(size.logo.width,152);
   assert.equal(size.panel.x,(width-size.panel.width)/2);
   assert.equal(size.background,'linear-gradient(rgb(0, 39, 89), rgb(21, 22, 24))');
   if(width===1440) {assert.equal(size.panel.y,307);assert.equal(size.input.y,519);assert.equal(size.button.y,658);}
   measurements.push({width,height,...size});
   await page.screenshot({path:path.join(output,'login-'+width+'x'+height+'.png'),fullPage:true});
  }
  checks.push('measured desktop/mobile geometry and no horizontal overflow at five viewport sizes');
  await page.setViewportSize({width:1440,height:1000});
  assert.equal(await page.locator('input[type=checkbox],.uf-login-help').count(),0);
  let posted;
  await page.route('**/login-fixture',async route=>{
   if(route.request().method()==='POST') {
    posted=route.request().postData();await route.fulfill({contentType:'text/html',body:render({preview_submit:false,fuser:true,duser:'admin'})});
   } else await route.fulfill({contentType:'text/html',body:render({preview_submit:false})});
  });
  await page.locator('#luci_username').fill('admin');
  await page.locator('#luci_password').fill('local-test-password');
  await Promise.all([page.waitForNavigation(),page.locator('#luci_password').press('Enter')]);
  assert.deepEqual([...new URLSearchParams(posted)],[['luci_username','admin'],['luci_password','local-test-password']]);
  assert.equal(await page.locator('[role=alert]').isVisible(),true);
  assert.equal(await page.locator('#luci_password').inputValue(),'');
  assert.equal(await page.locator('#luci_username').inputValue(),'admin');
  assert.deepEqual(await page.evaluate(()=>({...localStorage})),{});
  await page.screenshot({path:path.join(output,'error.png'),fullPage:true});
  checks.push('Enter performs native POST with original LuCI fields; server failure preserves username, clears password, and announces error');
  await page.goto(base+'/login-fixture');
  assert.equal(await page.locator('#luci_username').inputValue(),'root');
  // Empty passwords must still work on an unconfigured OpenWrt router.
  await Promise.all([page.waitForNavigation(),page.locator('.uf-login-submit').click()]);
  assert.equal(new URLSearchParams(posted).get('luci_password'),'');
  checks.push('no custom username storage; a new login uses the server default root; empty-password routers retain native behavior');
  const escaped=await open({duser:'"><img src=x onerror=alert(1)>'});
  assert.equal(await escaped.locator('#luci_username').inputValue(),'\"><img src=x onerror=alert(1)>');
  assert.equal(await escaped.locator('img').count(),1);
  const blocked=await open({}, {storageState:{cookies:[],origins:[]}});
  await blocked.context().addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('storage blocked');}});});
  await blocked.reload();
  assert.equal(await blocked.locator('.uf-login-submit').isEnabled(),true);
  const noJS=await open({}, {javaScriptEnabled:false});
  assert.equal(await noJS.locator('#luci_username').isVisible(),true);
  assert.equal(await noJS.locator('.uf-login-submit').isEnabled(),true);
  assert.equal(await noJS.locator('noscript').isVisible(),true);
  checks.push('escaped server values, blocked browser storage, and no-JavaScript fallback');
  const english=await open({login_language:'en'});
  assert.equal(await english.getByLabel('Username',{exact:true}).count(),1);
  assert.equal(await english.getByRole('button',{name:'Log in',exact:true}).count(),1);
  const preview=await browser.newPage();
  let previewPosts=0;preview.on('request',r=>{if(r.method()==='POST')previewPosts++;});
  await preview.goto(base+'/?page=login');
  await preview.getByRole('button',{name:'登录',exact:true}).click();
  await preview.locator('#preview-login-status').waitFor();
  assert.equal(previewPosts,0);assert.equal(await preview.locator('.uf-login-submit').isEnabled(),true);
  checks.push('English rendering and local preview never sends login data');
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({checks,measurements,errors},null,2)+'\n');
  console.log('Login browser checks passed:',checks.length);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
