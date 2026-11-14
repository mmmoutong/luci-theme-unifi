/* Render the real login template with a static, local-only LuCI environment.
 * Run from the project root: ucode tools/render_login_preview.uc > preview/login.html
 * Optional globals: login_language=en, fuser=true, duser=... */
'use strict';
const language = global.login_language ?? 'zh-cn';
const translations = {
 'Log in':'登录', 'Username':'用户名', 'Password':'密码', 'Help':'帮助',
 'Logging in…':'正在登录…',
 'Invalid username and/or password! Please try again.':'用户名或密码错误，请重试。',
 'You must enable JavaScript in your browser or LuCI will not work properly.':'请启用浏览器的 JavaScript，以使用完整的 LuCI 功能。'
};
global._ = s => substr(language,0,2) == 'zh' ? (translations[s] ?? s) : s;
global.media = '/luci-static/unifi';
global.dispatcher = { lang:language };
global.version = { distname:'ImmortalWrt', distversion:'23.05.4' };
global.duser = global.duser ?? 'root';
global.fuser = global.fuser ?? false;
global.striptags = s => replace(s, /<[^>]*>/g, '');
global.entityencode = s => replace(s ?? '', /[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
global.include = function(name) {
 if (name == 'footer') {
  if (global.preview_submit !== false) print('<script src="/preview/login.js" defer></script>');
  print('</body></html>\n');return;
 }
 print('<!doctype html><html lang="',language,'" data-darkmode="true"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unifi · 登录预览</title>');
 for (let file in ['cascade','controls','layout','icons','mobile','login'])
  print('<link rel="stylesheet" href="',global.media,'/',file,'.css">');
 print('<link rel="icon" href="',global.media,'/logo.svg"></head><body class="uf-theme uf-login">\n');
};
loadfile('ucode/template/themes/unifi/sysauth.ut', { raw_mode:false })();
