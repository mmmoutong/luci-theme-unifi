// Capture documentation images with Chrome's native font rendering.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.UNIFI_PREVIEW_URL||'http://127.0.0.1:8765';
const output=path.resolve(__dirname,'../docs/images');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome',
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 try{
  for(const lang of ['zh-CN','en']){
   const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1,
    locale:lang==='en'?'en-US':'zh-CN',colorScheme:'light'});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('requestfailed',request=>errors.push(request.url()+': '+request.failure()?.errorText));
   for(const [name,view,mode] of [['dashboard','overview','light'],['clients-dark','clients','dark'],['login','login','dark']]){
    await page.goto(base+'/?page='+view+'&mode='+mode+'&lang='+lang);
    if(view==='overview')await page.waitForFunction(()=>window.modules?.['unifi.overview']?.history.length>200&&/[0-9]/.test(modules['unifi.overview'].refs.cpu.value.textContent));
    else if(view==='clients')await page.locator('tr[data-client-id]').first().waitFor();
    else await page.locator('.uf-login-form').waitFor();
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForFunction(()=>[...document.images].every(image=>image.complete&&image.naturalWidth>0));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    const text=await page.locator('body').innerText();
    if(lang==='en')assert.ok(!/[\u3400-\u9fff]/u.test(text),'English screenshot contains Chinese text');
    if(view!=='login')assert.equal(await page.locator('.brand>span').textContent(),'ImmortalWrt');
    const filename=path.join(output,name+(lang==='en'?'-en':'')+'.png');
    await page.screenshot({path:filename,fullPage:false,caret:'hide'});
    const png=fs.readFileSync(filename);
    assert.equal(png.readUInt32BE(16),1920);assert.equal(png.readUInt32BE(20),1080);
    console.log(path.basename(filename)+': 1920x1080 ('+lang+')');
   }
   assert.deepEqual(errors,[]);
   await context.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
