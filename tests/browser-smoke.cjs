/* Local preview only; PLAYWRIGHT_MODULE may select an existing runtime. */
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseURL = process.env.UNIFI_PREVIEW_URL || 'http://127.0.0.1:8765';
const output = path.resolve(__dirname, '../artifacts/navigation-separation');
fs.mkdirSync(output, {recursive: true});

(async () => {
  const browser = await chromium.launch({headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {})});
  const errors = [], checked = [];
  async function pageAt(pageName, width = 1440) {
    const page = await browser.newPage({viewport: {width, height: 1000}});
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(baseURL + '/?page=' + pageName);
    return page;
  }
  async function nativeVisible(page) {
    await page.locator('#topmenu .uf-nav-toggle').waitFor();
    assert.equal(await page.locator('#uf-dashboard, .uf-dashboard-host').count(), 0);
    assert.equal(await page.locator('#view').isVisible(), true);
    assert.equal(await page.locator('h2[name=content]').isVisible(), true);
    assert.equal(await page.evaluate(() => !!modules['unifi.overview'] || timers.length > 0), false);
  }
  async function menuLabels(page) {
    return page.locator('#topmenu > li:not(.uf-nav-toggle-item) > a, #topmenu > li > details > summary')
      .evaluateAll(nodes => nodes.map(node => node.title));
  }
  try {
    const overview = await pageAt('overview');
    await overview.locator('#uf-dashboard').waitFor();
    await overview.locator('#topmenu .uf-nav-toggle').waitFor();
    assert.deepEqual(await menuLabels(overview), ['仪表盘', '客户端设备', '状态', '系统', '服务', 'VPN', '网络', '退出登录']);
    assert.equal(await overview.locator('#uf-page-title').textContent(), '仪表盘');
    assert.equal(await overview.locator('#view #uf-dashboard').count(), 1);
    assert.equal(await overview.locator('#topmenu > li > a.active').getAttribute('href'), '/?page=overview');
    assert.equal(await overview.locator('#topmenu details.active').count(), 0);
    assert.equal(await overview.getByRole('heading', {name: '仪表盘', exact: true}).count(), 1);
    assert.equal(await overview.locator('#view .cbi-section').count(), 0);
    assert.equal(await overview.getByRole('button', {name: /原生状态/}).count(), 0);
    await overview.evaluate(async () => {await modules['view.unifi.dashboard'].activate(); await modules['view.unifi.dashboard'].activate();});
    assert.equal(await overview.locator('#uf-dashboard').count(), 1);
    assert.equal(await overview.evaluate(() => timers.length), 1);
    await overview.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', {persisted: true})));
    assert.equal(await overview.locator('#uf-dashboard').count(), 0);
    assert.equal(await overview.evaluate(() => timers.length), 0);
    await overview.evaluate(async () => {
      window.dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true}));
      await modules['view.unifi.dashboard'].ready;
    });
    await overview.locator('#uf-dashboard').waitFor();
    assert.equal(await overview.evaluate(() => timers.length), 1);
    await overview.screenshot({path: path.join(output, 'dashboard-desktop.png'), fullPage: true});
    checked.push('standalone dashboard, sidebar order, active item, remount and page lifecycle');

    // A shortcut navigates to an independent native page, with no dashboard load.
    await overview.getByRole('link', {name: '原生概览'}).click();
    await nativeVisible(overview);
    assert.equal(await overview.locator('#uf-page-title').textContent(), '概览');
    assert.equal(await overview.locator('#topmenu details.active > summary').getAttribute('title'), '状态');
    assert.equal(await overview.locator('#view .cbi-section').count(), 2);
    const status = overview.locator('#topmenu details').filter({has: overview.locator('summary[title="状态"]')});
    await status.locator('summary').click();
    assert.deepEqual(await status.locator('.uf-nav-popover a').allTextContents(), ['概览', '系统日志', '实时图表']);
    assert.equal(await status.locator('a.active').getAttribute('href'), '/?page=native-overview');
    await overview.keyboard.press('Escape');
    await overview.screenshot({path: path.join(output, 'native-overview-desktop.png'), fullPage: true});
    checked.push('native Overview is independent, visible with plugin sections and active under Status');
    await overview.close();

    const clients = await pageAt('clients');
    await clients.locator('.uf-devices-table tbody tr').first().waitFor();
    assert.equal(await clients.locator('#uf-page-title').textContent(), '客户端设备');
    assert.equal(await clients.locator('#topmenu > li > a.active').getAttribute('href'), '/?page=clients');
    assert.equal(await clients.locator('#topmenu details.active').count(), 0);
    await clients.getByRole('searchbox', {name: '搜索客户端'}).fill('Tower');
    assert.equal(await clients.locator('.uf-devices-table tbody tr[data-client-id]').count(), 1);
    await clients.getByRole('button', {name: '刷新', exact: true}).click();
    assert.equal(await clients.locator('#uf-dashboard').count(), 0);
    await clients.screenshot({path: path.join(output, 'clients-desktop.png'), fullPage: true});
    checked.push('independent client route, active item, inventory search and refresh');
    await clients.close();

    const interfaces = await pageAt('interfaces');
    await nativeVisible(interfaces);
    assert.equal(await interfaces.locator('#tabmenu .tabs').count(), 1);
    assert.equal(await interfaces.locator('#topmenu details.active > summary').getAttribute('title'), '网络');
    // Menu rendering must not recreate entries filtered out by LuCI ACLs.
    await interfaces.evaluate(() => {
      delete tree.children.admin.children['unifi-dashboard'];
      delete tree.children.admin.children['unifi-clients'];
      modules['menu-unifi'].render(tree);
    });
    assert.deepEqual(await menuLabels(interfaces), ['状态', '系统', '服务', 'VPN', '网络', '退出登录']);
    checked.push('native interface tabs and plugin groups retained; inaccessible custom routes stay absent');
    await interfaces.close();

    for (const name of ['overview', 'clients', 'native-overview']) {
      const mobile = await pageAt(name, 390);
      await mobile.locator(name === 'overview' ? '#uf-dashboard' : name === 'clients' ? '.uf-devices-table' : '#topmenu .uf-nav-toggle').waitFor();
      assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await mobile.screenshot({path: path.join(output, name + '-mobile.png'), fullPage: true});
      await mobile.close();
    }
    checked.push('390px dashboard, client and native Overview have no page overflow');

    for (const module of ['unifi/overview', 'unifi/data']) {
      const failure = await browser.newPage();
      failure.on('pageerror', error => errors.push(error.message));
      await failure.route('**/resources/' + module + '.js', route => route.abort());
      await failure.goto(baseURL + '/?page=native-overview');
      await nativeVisible(failure);
      await failure.goto(baseURL + '/?page=overview');
      await failure.locator('#view pre').waitFor();
      assert.equal(await failure.locator('#uf-dashboard').count(), 0);
      await failure.goto(baseURL + '/?page=native-overview');
      await nativeVisible(failure);
      await failure.close();
    }
    const rendering = await browser.newPage();
    rendering.on('pageerror', error => errors.push(error.message));
    await rendering.route('**/resources/unifi/overview.js', async route => {
      const response = await route.fetch();
      const body = (await response.text()).replace('update: function(data) {', "update: function(data) { throw new Error('test render failure');");
      await route.fulfill({response, body});
    });
    await rendering.goto(baseURL + '/?page=overview');
    await rendering.locator('#view pre').waitFor();
    assert.equal(await rendering.evaluate(() => timers.length), 0);
    await rendering.goto(baseURL + '/?page=native-overview');
    await nativeVisible(rendering);
    await rendering.close();
    checked.push('missing dashboard/data modules and render failure do not affect native Overview');

    const navigation = await browser.newPage();
    navigation.on('pageerror', error => errors.push(error.message));
    await navigation.route('**/resources/menu-unifi.js', route => route.abort());
    await navigation.goto(baseURL + '/?page=overview');
    await navigation.locator('#uf-dashboard').waitFor();
    assert.equal(await navigation.locator('body.uf-menu-failed').count(), 1);
    checked.push('menu load failure does not prevent standalone dashboard startup');
    await navigation.close();
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify({checked, pageErrors: errors}, null, 2) + '\n');
    console.log('Browser checks passed:', checked.join('; '));
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode = 1;});
