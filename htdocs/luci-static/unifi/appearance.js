/* SPDX-License-Identifier: Apache-2.0 */
(function(){
	'use strict';
	var root=document.documentElement,media=window.matchMedia('(prefers-color-scheme: dark)');
	function update(){
		var mode=root.getAttribute('data-uf-mode')||'auto';
		root.setAttribute('data-darkmode',String(mode==='dark'||(mode==='auto'&&media.matches)));
	}
	media.addEventListener('change',update);update();
})();
