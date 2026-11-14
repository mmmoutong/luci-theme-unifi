/* Regression checks against values measured in the original UniFi UI.
 * Uses the real Bootstrap base plus theme assets, without router writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.UNIFI_PREVIEW_URL || 'http://127.0.0.1:8765';
const output = path.resolve(__dirname, '../artifacts/controls');
const reference = require('../tests/fixtures/reference/controls/system-dark.json');
const darkCheck = reference.find(x => x.selector === 'input[type=checkbox]:checked').elements[0].style;
const darkRadio = reference.find(x => x.selector === 'input[type=radio]:checked').elements[0].style;
const darkInput = reference.find(x => x.selector === 'input[type=text]').elements[0].style;
const dialogReference = require('../tests/fixtures/reference/controls/dialog-dark.json').dialog.style;
fs.mkdirSync(output, {recursive:true});
const layoutOutput=path.resolve(__dirname,'../artifacts/layout');
fs.mkdirSync(layoutOutput,{recursive:true});
(async () => {
 const browser = await chromium.launch({headless:true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {})});
 const page = await browser.newPage({viewport:{width:1440,height:1100}});
 const errors=[], checked=[], rendered={}, failedRequests=[];
 page.on('pageerror', e=>errors.push(e.message));
 page.on('requestfailed', request=>failedRequests.push({url:request.url(),failure:request.failure()}));
 async function style(selector,pseudo) {
  return page.locator(selector).evaluate((e,p)=>{const s=getComputedStyle(e,p);return Object.fromEntries(['width','height','backgroundColor','backgroundImage','color','borderColor','borderRadius','opacity','appearance','outlineStyle','boxShadow','display'].map(k=>[k,s[k]]));},pseudo);
 }
 try {
  for (const mode of ['light','dark']) {
   await page.goto(base+'/?page=components&mode='+mode);
   await page.locator('#sibling-save').waitFor();
   await page.waitForFunction(()=>getComputedStyle(document.body).fontFamily.includes('Inter'));
   const accent=mode==='dark'?darkCheck.backgroundColor:'rgb(0, 111, 255)';
   const muted=mode==='dark'?'rgb(115, 124, 135)':'rgb(194, 198, 203)';
   const fill=mode==='dark'?'rgba(249, 250, 250, 0.04)':'rgba(33, 35, 39, 0.04)';
   const check=await style('#check-on'),radio=await style('#radio-on'),input=await style('#text-normal');
   assert.equal(check.width,darkCheck.width);assert.equal(check.height,darkCheck.height);
   assert.equal(check.borderRadius,darkCheck.borderRadius);assert.equal(check.backgroundColor,accent);
   assert.equal((await style('#check-off')).borderColor,muted);
   assert.equal(await page.locator('#check-on').evaluate(e=>getComputedStyle(e,'::before').content),'none');
   assert.equal((await style('#check-on','::after')).backgroundImage,'none');
   assert.equal(radio.width,darkRadio.width);assert.equal(radio.height,darkRadio.height);
   assert.equal(radio.backgroundColor,'rgba(0, 0, 0, 0)');
   assert.equal((await style('#radio-on','::after')).width,'6px');
   assert.equal((await style('#radio-on','::after')).height,'6px');
   assert.equal((await style('#radio-on','::after')).backgroundColor,accent);
   assert.equal((await style('#check-mixed','::after')).height,'2px');
   assert.equal((await style('#switch-demo')).backgroundColor,mode==='dark'?'rgb(66, 71, 77)':'rgb(222, 224, 227)');
   assert.equal((await style('#check-disabled-on')).opacity,'1');
   assert.equal((await style('#check-disabled-on','::after')).opacity,'1');
   assert.equal(input.height,darkInput.height);assert.equal(input.borderRadius,darkInput.borderRadius);assert.equal(input.backgroundColor,fill);
   assert.equal((await style('#text-readonly')).backgroundColor,'rgba(0, 0, 0, 0)');
   assert.equal((await style('#text-disabled')).color,muted);
   assert.equal((await style('#native-select')).appearance,'auto');
   await page.locator('#native-select').selectOption({label:'Wi-Fi'});
   assert.equal(await page.locator('#native-select').inputValue(),'Wi-Fi');
   await page.locator('#check-off').check();assert.equal(await page.locator('#check-off').isChecked(),true);
   await page.locator('#check-on').press('Space');assert.equal(await page.locator('#check-on').isChecked(),false);
   assert.equal(await page.locator('#check-on').evaluate(e=>getComputedStyle(e).borderWidth),'2px');
   await page.locator('#radio-off').check();assert.equal(await page.locator('#radio-on').isChecked(),false);
   await page.locator('#switch-demo').check();assert.equal((await style('#switch-demo','::after')).width,'14px');
   await page.locator('#text-normal').focus();
   await page.waitForFunction(expected=>getComputedStyle(document.querySelector('#text-normal')).borderColor===expected,accent);
   assert.equal((await style('#text-normal')).borderColor,accent);
   assert.equal((await style('#text-normal')).boxShadow,'none');
   assert.equal((await style('#invalid')).borderColor,mode==='dark'?'rgb(238, 99, 104)':'rgb(240, 56, 59)');
   await page.locator('#invalid').focus();assert.equal((await style('#invalid')).borderColor,mode==='dark'?'rgb(238, 99, 104)':'rgb(240, 56, 59)');
   // Apply is primary; the adjacent Save action stays secondary.
   assert.equal((await style('#sibling-save')).backgroundColor,'rgba(0, 0, 0, 0)');
   assert.equal((await style('#sibling-save')).borderColor,'rgba(0, 0, 0, 0)');
   assert.equal((await style('#sibling-save')).color,accent);
   assert.equal((await style('#native-actions .cbi-dropdown')).backgroundColor,accent);
   assert.equal((await style('#primary-disabled')).backgroundColor,mode==='dark'?'rgb(11, 78, 173)':'rgb(153, 197, 255)');
   await page.locator('#sibling-save').hover();
   const selection=mode==='dark'?'rgb(5, 37, 77)':'rgb(230, 241, 255)';
   await page.waitForFunction(expected=>getComputedStyle(document.querySelector('#sibling-save')).backgroundColor===expected,selection);
   assert.equal((await style('#sibling-save')).borderColor,'rgba(0, 0, 0, 0)');
   await page.locator('#native-actions .cbi-dropdown').hover();
   const hoverColor=mode==='dark'?'rgb(39, 127, 241)':'rgb(51, 139, 255)';
   await page.waitForFunction(expected=>getComputedStyle(document.querySelector('#native-actions .cbi-dropdown')).backgroundColor===expected,hoverColor);
   assert.equal((await style('#native-actions .cbi-dropdown')).borderColor,hoverColor);
   await page.mouse.down();
   const activeColor=mode==='dark'?'rgb(128, 183, 255)':'rgb(0, 88, 204)';
   await page.waitForFunction(expected=>getComputedStyle(document.querySelector('#native-actions .cbi-dropdown')).backgroundColor===expected,activeColor);
   await page.mouse.up();
   // Native ComboButton changes its class for unchecked (dangerous) apply.
   await page.mouse.move(1400,1050);
   await page.locator('#native-actions .cbi-dropdown').evaluate(e=>e.classList.replace('cbi-button-apply','cbi-button-negative'));
   const danger=mode==='dark'?'rgb(238, 99, 104)':'rgb(240, 56, 59)';
   await page.waitForFunction(expected=>getComputedStyle(document.querySelector('#native-actions .cbi-dropdown')).backgroundColor===expected,danger);
   assert.equal((await style('#sibling-save')).backgroundColor,'rgba(0, 0, 0, 0)');
   await page.locator('#native-actions .cbi-dropdown').evaluate(e=>e.classList.replace('cbi-button-negative','cbi-button-apply'));
   await page.locator('#server-add').fill('time.example.org');await page.locator('#server-add').press('Enter');
   assert.equal(await page.locator('#server-list>.item').count(),2);
   await page.locator('#server-list>.item').last().press('Delete');
   assert.equal(await page.locator('#server-list>.item').count(),1);
   assert.equal(await page.locator('#server-add').inputValue(),'');
   await page.locator('#tooltip-demo').focus();
   await page.waitForFunction(()=>getComputedStyle(document.querySelector('#tooltip-demo .cbi-tooltip')).opacity==='1');
   assert.equal(await page.locator('#tooltip-demo .cbi-tooltip').evaluate(e=>e.getBoundingClientRect().left>=0),true);
   assert.equal((await style('#tooltip-demo .cbi-tooltip')).backgroundColor,'rgb(43, 43, 43)');
   assert.equal((await style('.uf-segmented')).borderRadius,'8px');
   await page.getByRole('button',{name:'15 分钟',exact:true}).click();
   assert.equal(await page.getByRole('button',{name:'15 分钟',exact:true}).getAttribute('aria-pressed'),'true');
   await page.locator('#check-off').uncheck();await page.locator('#check-on').check();await page.locator('#radio-on').check();
   await page.locator('#switch-demo').uncheck();await page.locator('#native-select').selectOption({label:'全部连接'});
   await page.mouse.move(1400,1050);await page.locator('h2[name=content]').click();
   await page.screenshot({path:path.join(output,'components-'+mode+'.png'),fullPage:true});
   await page.getByRole('button',{name:'打开弹窗',exact:true}).click();
   assert.equal(await page.getByRole('dialog').isVisible(),true);
   const modal=await style('.modal');
   assert.equal(modal.borderRadius,dialogReference.borderRadius);
   if(mode==='dark')assert.equal(modal.boxShadow,dialogReference.boxShadow);
   assert.equal((await style('#modal-confirm')).height,'36px');
   assert.equal((await style('#modal-confirm')).backgroundColor,accent);
   await page.getByLabel('接口名称',{exact:true}).fill('test-lan');
   await page.screenshot({path:path.join(output,'modal-'+mode+'.png'),fullPage:true});
   await page.getByRole('button',{name:'取消',exact:true}).click();
   assert.equal(await page.getByRole('dialog').isVisible(),false);
   checked.push(mode+': measured controls, radio/checkbox/indeterminate/disabled states, keyboard input, native select, invalid focus, primary hover/active and save sibling, list add/delete, tooltip, tabs and modal');
   rendered[mode]={check,radio,input};
   for (const width of [390,768]) {
    await page.setViewportSize({width,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,mode+' controls overflow '+width);
    await page.screenshot({path:path.join(output,'components-'+mode+'-'+width+'.png'),fullPage:true});
    await page.getByRole('button',{name:'打开弹窗',exact:true}).click();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,mode+' modal overflow '+width);
    await page.getByRole('button',{name:'取消',exact:true}).click();
   }
   await page.setViewportSize({width:1440,height:1100});
  }
  for (const mode of ['light','dark']) {
   for (const name of ['overview','clients','interfaces','settings','native-overview']) {
    await page.goto(base+'/?page='+name+'&mode='+mode+'&nav_expanded=0');
    await page.locator('#topmenu .uf-nav-toggle').waitFor();
    await page.waitForFunction(()=>getComputedStyle(document.body).fontFamily.includes('Inter'));
    if(name==='clients')await page.locator('tr[data-client-id]').first().waitFor();
    if(name==='overview')await page.locator('#uf-dashboard').waitFor();
    for(const width of [1440,2765,390]) {
     await page.setViewportSize({width,height:1000});
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,name+' '+mode+' overflow '+width);
     const container=await page.locator('#maincontent').evaluate(e=>({width:e.getBoundingClientRect().width,left:e.getBoundingClientRect().left}));
     assert.equal(container.width,width-50,name+' uses the available width '+width);
     assert.equal(container.left,50,name+' starts beside navigation');
     if(name==='settings'||name==='interfaces') {
      const layout=await page.evaluate(()=>{
       const main=document.querySelector('#maincontent'),view=document.querySelector('#view');
       const section=document.querySelector('.cbi-map .cbi-section');
       const style=getComputedStyle(main),group=getComputedStyle(section);
       const table=view.querySelector('table');
       return {padding:[style.paddingTop,style.paddingRight],view:view.getBoundingClientRect().width,
        table:table?.getBoundingClientRect().width,groupBorder:group.borderWidth,groupPadding:group.padding,
        label:getComputedStyle(section.querySelector('.cbi-value-title')||section).width,
        rowDisplay:section.querySelector('.cbi-value')?getComputedStyle(section.querySelector('.cbi-value')).display:null,
        rowMin:section.querySelector('.cbi-value')?getComputedStyle(section.querySelector('.cbi-value')).minHeight:null,
        titleGap:getComputedStyle(document.querySelector('h2[name=content]')||document.querySelector('.cbi-map>h2')).marginBottom};
      });
      assert.deepEqual(layout.padding,width===390?['16px','12px']:['20px','24px']);
      assert.equal(layout.groupBorder,'0px');assert.equal(layout.groupPadding,'0px');
      assert.equal(layout.titleGap,'8px');
      if(name==='settings')assert.equal(layout.rowMin,'40px');
      if(name==='interfaces') {
       const hierarchy=await page.evaluate(()=>{
        const row=document.querySelector('#hostname').closest('.cbi-value');
        const help=row.querySelector('.cbi-value-description');
        return {value:getComputedStyle(document.querySelector('#hostname')).color,
         label:getComputedStyle(row.querySelector('.cbi-value-title')).color,
         help:getComputedStyle(help).color,lineHeight:getComputedStyle(help).lineHeight,gap:getComputedStyle(help).marginTop};
       });
       assert.equal(hierarchy.value,mode==='dark'?'rgb(249, 250, 250)':'rgb(33, 35, 39)');
       assert.equal(hierarchy.label,mode==='dark'?'rgb(183, 188, 194)':'rgb(80, 86, 94)');
       assert.equal(hierarchy.help,mode==='dark'?'rgb(139, 148, 158)':'rgb(128, 136, 147)');
       assert.equal(hierarchy.lineHeight,'18px');assert.equal(hierarchy.gap,'4px');
       await page.locator('#hostname').evaluate(e=>e.closest('.cbi-value').classList.add('cbi-value-error'));
       assert.equal(await page.locator('#hostname').evaluate(e=>getComputedStyle(e.closest('.cbi-value').querySelector('.cbi-value-description')).color),mode==='dark'?'rgb(238, 99, 104)':'rgb(240, 56, 59)');
       await page.locator('#hostname').evaluate(e=>e.closest('.cbi-value').classList.remove('cbi-value-error'));
      }
      if(width>=1440&&name==='settings') {
       assert.equal(layout.view,960,'pure settings form is capped independently of the wide page');
       assert.equal(layout.rowDisplay,'flex','desktop labels sit beside controls');
       assert.equal(layout.label,'240px');
      }
      if(name==='settings') {
       await page.evaluate(()=>{
        const row=document.createElement('div');row.id='dependent-row';row.className='cbi-value hidden';
        row.textContent='依赖条件未满足的设置';document.querySelector('.cbi-section').appendChild(row);
       });
       assert.equal(await page.locator('#dependent-row').isVisible(),false,'dependency fields stay hidden');
       await page.locator('#dependent-row').evaluate(e=>e.classList.remove('hidden'));
       assert.equal(await page.locator('#dependent-row').isVisible(),true,'dependency fields can become visible');
       await page.locator('#dependent-row').evaluate(e=>e.remove());
      }
      if(width>=1440&&name==='interfaces') {
       assert.equal(layout.view,width-50-48,'mixed page uses the available content width');
       assert.equal(layout.table,layout.view,'mixed table fills its wide native view');
      }
     }
     const iconMetrics=await page.locator('svg.uf-icon').evaluateAll(es=>es.map(e=>({
      nav:e.classList.contains('uf-icon-nav'),width:getComputedStyle(e).width,
      stroke:getComputedStyle(e).strokeWidth,hidden:e.getAttribute('aria-hidden'),
      focused:e.getAttribute('focusable'),fill:getComputedStyle(e).fill
     })));
     assert.ok(iconMetrics.length);
     for(const icon of iconMetrics) {
      assert.equal(icon.width,icon.nav?'22px':name==='clients'&&icon.width==='12px'?'12px':'16px');
      assert.equal(icon.stroke,'1.5px');assert.equal(icon.fill,'none');
      assert.equal(icon.hidden,'true');assert.equal(icon.focused,'false');
     }
     await page.screenshot({path:path.join(output,name+'-'+mode+'-'+width+'.png'),fullPage:true});
     if(name==='settings'||name==='interfaces') {
      await page.screenshot({path:path.join(layoutOutput,name+'-'+mode+'-'+width+'.png'),
       ...(width===1440?{clip:{x:0,y:0,width:1440,height:name==='settings'?650:950}}:{fullPage:true})});
     }
    }
    await page.setViewportSize({width:1440,height:1100});
   }
  }
  checked.push('light/dark dashboard, client inventory, native interface form, settings, native overview at 1440, 2765 and 390px');
  checked.push('Restored 0.6.3: native pages use available width, pure forms cap at 960px, mixed table views remain wide; unboxed groups, desktop/mobile padding, label alignment and dependency field visibility');
  checked.push('40px row baseline, 8px title gap, separate value/label/help colors, 18px help line height with 4px gap, errors preserved and uniform SVG sizing/strokes without changing brand marks');
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({reference:'tests/fixtures/reference/controls/system-dark.json',checked,rendered,pageErrors:errors},null,2)+'\n');
  console.log('Control browser checks passed:',checked.join('; '));
 } catch(error) {
  console.error({url:page.url(),pageErrors:errors,failedRequests,
   layout:await page.evaluate(()=>({body:document.body.className,main:document.querySelector('#maincontent')?.getBoundingClientRect().toJSON(),styles:[...document.styleSheets].map(s=>s.href)}))});
  throw error;
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
