/* SPDX-License-Identifier: Apache-2.0 */
'use strict';
'require baseclass';
'require unifi.brand-data as catalog';

// Hostnames are hints, including user-assigned names. Never present a match
// as a verified hardware model. Local MACs are excluded from OUI lookups.
var rules = [
	[/iphone/i, 'apple', 'phone'], [/ipad/i, 'apple', 'tablet'],
	[/macbook|imac|mac[-_ ]?(mini|pro|studio)/i, 'apple', 'computer'],
	[/apple[-_ ]?tv/i, 'apple', 'tv'], [/homepod/i, 'apple', 'speaker'],
	[/apple[-_ ]?watch/i, 'apple', 'watch'],
	[/xiaomi|redmi|poco|mijia|miwifi|小米|红米/i, 'xiaomi', null],
	[/honor|荣耀/i, 'honor', null], [/huawei|matebook|matepad|华为/i, 'huawei', null],
	[/samsung|galaxy|^sm-[a-z]\d/i, 'samsung', null],
	[/oneplus|一加/i, 'oneplus', 'phone'], [/realme|^rmx\d/i, 'realme', 'phone'],
	[/oppo|^cph\d/i, 'oppo', 'phone'], [/vivo|iqoo/i, 'vivo', 'phone'],
	[/pixel|chromecast|nest[-_ ]?(hub|mini|audio|wifi)/i, 'google', null],
	[/kindle|amazon|alexa|fire[-_ ]?tv|^echo(?:[-_ ]|$)/i, 'amazon', null],
	[/playstation|^ps[345](?:[-_ ]|$)/i, 'playstation', 'game'],
	[/nintendo/i, 'nintendo', 'game'], [/xbox|surface/i, 'microsoft', null],
	[/bravia|^sony(?:[-_ ]|$)/i, 'sony', 'tv'],
	[/lenovo|thinkpad|thinkbook|legion/i, 'lenovo', 'computer'],
	[/^dell(?:[-_ ]|$)|inspiron|latitude|optiplex/i, 'dell', 'computer'],
	[/^hp[-_ ]|hewlett|laserjet|deskjet|officejet/i, 'hp', null],
	[/asus|zenbook|vivobook|^rog[-_ ]/i, 'asus', null],
	[/tp[-_ ]?link|^deco(?:[-_ ]|$)/i, 'tplink', 'network'],
	[/raspberry|^rpi(?:[-_ ]|$)|raspi/i, 'raspberrypi', 'computer'],
	[/synology|diskstation|^ds\d{3}/i, 'synology', 'storage'],
	[/espressif|esp32|esp8266|^esp[-_ ]/i, 'espressif', 'iot'],
	[/lgwebos|^lg[-_ ]/i, 'lg', 'tv'], [/^roku(?:[-_ ]|$)/i, 'roku', 'tv'],
	[/^dji(?:[-_ ]|$)/i, 'dji', null], [/unifi|ubiquiti|ubnt/i, 'ubiquiti', 'network'],
	[/hue[-_ ]?bridge|philips[-_ ]?hue/i, 'philipshue', 'iot'],
	[/hisense|vidaa|海信/i, 'hisense', 'tv'], [/^tcl(?:[-_ ]|$)/i, 'tcl', 'tv'],
	[/^zte(?:[-_ ]|$)|中兴/i, 'zte', 'network'],
	[/printer|打印机|epson|canon|brother/i, null, 'printer'],
	[/camera|ipcam|摄像|hikvision|ezviz/i, null, 'camera'],
	[/\btv\b|电视/i, null, 'tv'], [/speaker|sonos|音箱/i, null, 'speaker'],
	[/iphone|phone|android|手机/i, null, 'phone'], [/tablet|\bpad\b|平板/i, null, 'tablet'],
	[/nas|storage|存储/i, null, 'storage'], [/laptop|desktop|\bpc\b|电脑/i, null, 'computer'],
	[/home[-_ ]?assistant|smart[-_ ]?plug|zigbee/i, null, 'iot']
];
var prefixes;
var glyphs = {
	phone: 'M7 2h10v20H7zM10 19h4', tablet: 'M4 2h16v20H4zM11 19h2',
	computer: 'M2 3h20v14H2zM12 17v4M7 21h10', tv: 'M2 4h20v14H2zM8 21h8',
	printer: 'M6 8V2h12v6M5 18H2V8h20v10h-3M6 14h12v8H6zM18 11h1',
	camera: 'M3 6h18v14H3zM8 6l2-3h4l2 3M8 13a4 4 0 1 0 8 0 4 4 0 0 0-8 0',
	storage: 'M3 3h18v7H3zM3 14h18v7H3zM6 6h1M6 17h1',
	speaker: 'M6 2h12v20H6zM9 14a3 3 0 1 0 6 0 3 3 0 0 0-6 0M11 6h2',
	game: 'M7 7h10c3 0 5 5 5 9s-3 4-6 0H8c-3 4-6 4-6 0s2-9 5-9M6 10v5M4 12.5h4M16 11h.1M19 14h.1',
	network: 'M3 3h6v6H3zM15 15h6v6h-6zM15 3h6v6h-6zM6 9v9h9M9 6h6',
	watch: 'M8 2h8l1 5H7zM7 17h10l-1 5H8zM6 7h12v10H6z',
	iot: 'M5 5h14v14H5zM9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4'
};

function identify(hostname, address) {
	var mac = String(address || '').trim().replace(/[:.-]/g, '').toUpperCase();
	var valid = /^[0-9A-F]{12}$/.test(mac) && !(parseInt(mac.slice(0, 2), 16) & 1) && mac !== '000000000000';
	var result = { key: null, name: null, type: null, source: null, localMac: valid && !!(parseInt(mac.slice(0, 2), 16) & 2) };
	for (var i = 0; i < rules.length; i++) {
		if (rules[i][0].test(String(hostname || ''))) {
			result.key = rules[i][1]; result.type = rules[i][2]; result.source = 'hostname'; break;
		}
	}
	if (!result.key && valid && !result.localMac) {
		if (!prefixes) {
			prefixes = new Map();
			Object.keys(catalog.prefixes).forEach(function(key) {
				var decoded = atob(catalog.prefixes[key]);
				for (var offset = 0; offset + 2 < decoded.length; offset += 3)
					prefixes.set((decoded.charCodeAt(offset) << 16) | (decoded.charCodeAt(offset + 1) << 8) | decoded.charCodeAt(offset + 2), key);
			});
		}
		var key = prefixes.get(parseInt(mac.slice(0, 6), 16));
		if (key) { result.key = key; result.source = 'mac'; }
	}
	var brand = catalog.brands[result.key];
	if (brand) {
		result.name = brand.name;
		result.type = result.type || brand.type || null;
		if (!brand.name) result.key = null;
	}
	return result;
}

function avatar(identity, large, label) {
	var brand = catalog.brands[identity.key], svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	var node = E('span', { 'class': 'uf-client-avatar' + (brand ? ' uf-brand-avatar' : '') + (large ? ' large' : ''),
		'title': label, 'aria-hidden': 'true', 'data-brand': identity.key || '' });
	if (brand && brand.color) node.style.color = brand.color;
	if (brand && brand.letter) node.appendChild(E('b', {}, brand.letter));
	else {
		svg.setAttribute('viewBox', '0 0 24 24');
		if (!brand) { svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '1.4'); }
		else svg.setAttribute('fill', 'currentColor');
		(brand ? brand.paths : [glyphs[identity.type] || glyphs.computer]).forEach(function(path) {
			var p = document.createElementNS(svg.namespaceURI, 'path'); p.setAttribute('d', path); svg.appendChild(p);
		});
		node.appendChild(svg);
	}
	return node;
}

return baseclass.extend({ identify: identify, avatar: avatar });
