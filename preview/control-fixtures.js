/* SPDX-License-Identifier: Apache-2.0 */
/* Local-only widget coverage. No production form handlers are replaced. */
window.renderControlFixtures = function(root,icons) {
	var host = document.createElement('div');
	host.className = 'preview-forms';
	host.innerHTML = `
	<section class="cbi-section"><h3>复选框与单选框</h3>
	<div class="cbi-value"><span class="cbi-value-title">复选状态</span><div class="cbi-value-field" style="display:flex;gap:16px;flex-wrap:wrap">
	<label><input id="check-off" type="checkbox">未选择</label><label><input id="check-on" type="checkbox" checked>已选择</label><label><input id="check-mixed" type="checkbox">部分选择</label>
	<label><input id="check-disabled" type="checkbox" disabled>禁用</label><label><input id="check-disabled-on" type="checkbox" checked disabled>禁用已选择</label></div></div>
	<div class="cbi-value"><span class="cbi-value-title">单选状态</span><div class="cbi-value-field" style="display:flex;gap:16px;flex-wrap:wrap">
	<label><input id="radio-on" type="radio" name="control-radio" checked>默认模式</label><label><input id="radio-off" type="radio" name="control-radio">备用模式</label><label><input id="radio-disabled" type="radio" name="disabled-radio" checked disabled>禁用模式</label></div></div>
	<div class="cbi-value"><label class="cbi-value-title" for="switch-demo">开关</label><div class="cbi-value-field"><input id="switch-demo" type="checkbox" role="switch" aria-label="开关示例"></div></div>
	</section>
	<section class="cbi-section"><h3>输入框与原生选择菜单</h3>
	<div class="cbi-value"><label class="cbi-value-title" for="text-normal">名称</label><div class="cbi-value-field"><input id="text-normal" type="text" placeholder="输入名称"></div></div>
	<div class="cbi-value"><label class="cbi-value-title" for="text-disabled">禁用字段</label><div class="cbi-value-field"><input id="text-disabled" type="text" value="不可编辑" disabled></div></div>
	<div class="cbi-value"><label class="cbi-value-title" for="text-readonly">只读字段</label><div class="cbi-value-field"><input id="text-readonly" type="text" value="br-lan" readonly></div></div>
	<div class="cbi-value"><label class="cbi-value-title" for="native-select">连接类型</label><div class="cbi-value-field"><select id="native-select"><option>全部连接</option><option>Wi-Fi</option><option>有线</option></select></div></div>
	<div class="cbi-value"><label class="cbi-value-title" for="server-add">候选 NTP 服务器</label><div class="cbi-value-field"><div class="cbi-dynlist" id="server-list"><div class="item" tabindex="0"><span>ntp.example.org</span><input type="hidden" value="ntp.example.org"></div><div class="add-item"><input id="server-add" type="text" aria-label="添加 NTP 服务器"><button type="button" class="cbi-button cbi-button-add" aria-label="添加服务器">+</button></div></div><div class="cbi-value-description">示例列表，可用键盘添加和删除。</div></div></div>
	</section>
	<section class="cbi-section"><h3>按钮组合与其他控件</h3>
	<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="cbi-button cbi-button-apply" id="primary-disabled" disabled>禁用主操作</button><button class="cbi-button cbi-button-remove" disabled>禁用删除</button><span class="label notice">信息</span><span class="label">默认标签</span></div>
	<div class="cbi-value"><span class="cbi-value-title">分段选项</span><div class="cbi-value-field"><div class="uf-segmented" role="group" aria-label="时间范围"><button type="button" class="active" aria-pressed="true">5 分钟</button><button type="button" aria-pressed="false">15 分钟</button></div></div></div>
	<div class="cbi-value"><span class="cbi-value-title">路由选项卡</span><div class="cbi-value-field"><ul class="cbi-tabmenu" id="route-tabs"><li class="cbi-tab" data-tab="ipv4routing"><a href="#">IPv4 路由</a></li><li class="cbi-tab-disabled" data-tab="ipv6routing"><a href="#">IPv6 路由</a></li></ul><div id="route-preview">IPv4</div></div></div>
	<div class="cbi-value"><span class="cbi-value-title">窄容器选项卡</span><div class="cbi-value-field"><div style="width:180px;max-width:100%"><ul class="cbi-tabmenu" id="crowded-tabs"><li class="cbi-tab"><a href="#">常规设置</a></li><li class="cbi-tab-disabled" data-errors="2"><a href="#">时间同步</a></li><li class="cbi-tab-disabled"><a href="#">语言和界面</a></li></ul></div></div></div>
	<div class="cbi-value"><span class="cbi-value-title">使用情况</span><div class="cbi-value-field"><div class="cbi-progressbar" title="42%" role="progressbar" aria-label="使用情况" aria-valuenow="42" aria-valuemin="0" aria-valuemax="100"><div style="width:42%"></div></div></div></div>
	<div class="cbi-value"><label class="cbi-value-title" for="file-demo">文件</label><div class="cbi-value-field"><input id="file-demo" type="file"></div></div>
	<div class="cbi-value"><label class="cbi-value-title" for="range-demo">滑块</label><div class="cbi-value-field"><input id="range-demo" type="range" min="0" max="100" value="42"></div></div>
	<div class="cbi-value"><span class="cbi-value-title">提示</span><div class="cbi-value-field"><span tabindex="0" class="cbi-tooltip-container" id="tooltip-demo">ⓘ 说明<span class="cbi-tooltip" role="tooltip">关于此字段的说明文字。</span></span></div></div>
	<div class="cbi-page-actions" id="native-actions"><div class="cbi-dropdown btn cbi-button cbi-button-apply important" tabindex="0" role="button" aria-label="保存并应用选项"><ul><li data-value="0" selected display="0">保存并应用</li><li data-value="1">强制应用</li></ul><span class="open" tabindex="-1">▾</span><div><input type="hidden"></div></div><button class="cbi-button cbi-button-save" id="sibling-save">保存</button><button class="cbi-button cbi-button-reset">复位</button></div>
	</section>`;
	root.appendChild(host);
	var hint=document.getElementById('tooltip-demo');hint.firstChild.remove();hint.prepend(icons.create('info'),document.createTextNode(' 说明'));
	document.getElementById('check-mixed').indeterminate = true;
	var list=document.getElementById('server-list'),input=document.getElementById('server-add');
	function add(){if(!input.value.trim())return;var item=document.createElement('div');item.className='item';item.tabIndex=0;var span=document.createElement('span');span.textContent=input.value.trim();item.appendChild(span);list.insertBefore(item,list.lastElementChild);input.value='';}
	list.querySelector('.add-item button').onclick=add;
	input.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();add();}});
	list.addEventListener('keydown',function(e){if(e.target.className==='item'&&['Backspace','Delete'].includes(e.key)){e.preventDefault();e.target.remove();input.focus();}});
	list.addEventListener('click',function(e){if(e.target.className==='item'){var box=e.target.getBoundingClientRect();if(e.clientX>box.right-30)e.target.remove();}});
	host.querySelectorAll('.uf-segmented button').forEach(function(button){button.onclick=function(){host.querySelectorAll('.uf-segmented button').forEach(function(b){b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});};});
	host.querySelectorAll('#route-tabs a').forEach(function(link){link.onclick=function(event){event.preventDefault();host.querySelectorAll('#route-tabs li').forEach(function(item){item.className=item===link.parentElement?'cbi-tab':'cbi-tab-disabled';});document.getElementById('route-preview').textContent=link.parentElement.dataset.tab==='ipv4routing'?'IPv4':'IPv6';};});
};
