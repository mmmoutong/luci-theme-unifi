/* SPDX-License-Identifier: Apache-2.0 */
'use strict';
'require baseclass';

/* Original 24-unit line drawings. Brand marks and chart SVGs are separate. */
var paths = {
	download:'M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4',
	upload:'M12 16V4m-5 5 5-5 5 5M5 17v4h14v-4',
	cpu:'M7 7h10v10H7zM10 10h4v4h-4zM9 3v4m6-4v4M9 17v4m6-4v4M3 9h4m-4 6h4m10-6h4m-4 6h4',
	memory:'M3 7h18v10H3zM7 10v4m5-4v4m5-4v4M6 17v3m4-3v3m4-3v3m4-3v3',
	external:'M13 4h7v7m0-7L10 14M10 4H4v16h16v-6',
	wifi:'M3 8a15 15 0 0 1 18 0M6 12a10 10 0 0 1 12 0m-9 4a5 5 0 0 1 6 0m-3 4h.01',
	connection:'M5 4v9h14m-5-5 5 5-5 5',
	ethernet:'M5 5h14v11h-4v4H9v-4H5zM8 5v5m4-5v5m4-5v5',
	device:'M4 4h16v13H4zM8 21h8m-4-4v4',
	search:'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14m5 12 6 6',
	close:'M6 6l12 12M6 18 18 6',
	'chevron-left':'M15 5 8 12l7 7',
	'chevron-right':'M9 5l7 7-7 7',
	'sort':'M8 4v16m-4-4 4 4 4-4M16 20V4m-4 4 4-4 4 4',
	'sort-up':'M12 20V4m-6 6 6-6 6 6',
	'sort-down':'M12 4v16m-6-6 6 6 6-6',
	info:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 11v6m0-10v.1'
};

return baseclass.extend({
	create:function(name) {
		var key=Object.prototype.hasOwnProperty.call(paths,name)?name:'device';
		var svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
		var attrs={'class':'uf-icon uf-icon-'+key,'viewBox':'0 0 24 24','width':'16','height':'16',
			'fill':'none','stroke':'currentColor','stroke-width':'1.5','stroke-linecap':'round',
			'stroke-linejoin':'round','aria-hidden':'true','focusable':'false'};
		Object.keys(attrs).forEach(function(k){svg.setAttribute(k,attrs[k]);});
		var path=document.createElementNS(svg.namespaceURI,'path');
		path.setAttribute('d',paths[key]);svg.appendChild(path);return svg;
	}
});
