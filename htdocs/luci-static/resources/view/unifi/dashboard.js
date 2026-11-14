/* SPDX-License-Identifier: Apache-2.0 */
'use strict';
'require view';
'require unifi.overview as dashboard';

return view.extend({
	render: function() {
		this.destroy();
		this.host = E('div', { 'class': 'uf-dashboard-host' });
		this.onHide = L.bind(this.deactivate, this);
		this.onShow = L.bind(function(ev) {
			if (ev.persisted) this.ready = this.activate().catch(L.bind(function(error) {
				this.host.textContent = _('Unable to load the dashboard. Please reload this page.');
				console.warn('Unifi dashboard:', error);
			}, this));
		}, this);
		window.addEventListener('pagehide', this.onHide);
		window.addEventListener('pageshow', this.onShow);
		this.ready = this.activate();
		return this.ready.then(L.bind(function() { return this.host; }, this));
	},
	activate: function() {
		this.deactivate();
		this.host.replaceChildren();
		return dashboard.mount(this.host).then(function(mounted) {
			if (mounted) document.body.classList.add('uf-dashboard-page');
		});
	},
	deactivate: function() {
		dashboard.unmount();
		document.body.classList.remove('uf-dashboard-page');
	},
	destroy: function() {
		this.deactivate();
		if (this.onHide) window.removeEventListener('pagehide', this.onHide);
		if (this.onShow) window.removeEventListener('pageshow', this.onShow);
	},
	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
