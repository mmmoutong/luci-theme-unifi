/* SPDX-License-Identifier: Apache-2.0
 * Original OpenWrt dashboard helpers. No Ubiquiti code or assets. */
'use strict';
'require baseclass';

return baseclass.extend({
	bytes: function(value) {
		if (value == null || !isFinite(value)) return '—';
		var units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'], n = Math.max(0, Number(value)), i = 0;
		while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
		return n.toFixed(i && n < 10 ? 1 : 0) + ' ' + units[i];
	},
	rate: function(value) {
		if (value == null || !isFinite(value)) return '—';
		var n = Math.max(0, value * 8), units = ['bps', 'Kbps', 'Mbps', 'Gbps'], i = 0;
		while (n >= 1000 && i < units.length - 1) { n /= 1000; i++; }
		return n.toFixed(i && n < 10 ? 2 : 1) + ' ' + units[i];
	},
	uptime: function(seconds) {
		if (seconds == null) return '—';
		var d = Math.floor(seconds / 86400), h = Math.floor(seconds % 86400 / 3600), m = Math.floor(seconds % 3600 / 60);
		return (d ? d + 'd ' : '') + h + 'h ' + m + 'm';
	},
	percent: function(used, total) {
		return used != null && isFinite(used) && total > 0 ? Math.min(100, Math.max(0, used / total * 100)) : null;
	},
	cpu: function(text) {
		var m = /^cpu\s+([\d\s]+)$/m.exec(text || '');
		if (!m) return null;
		var n = m[1].trim().split(/\s+/).map(Number);
		// guest and guest_nice are already included in user/nice.
		return { total: n.slice(0, 8).reduce(function(a, b) { return a + b; }, 0), idle: (n[3] || 0) + (n[4] || 0) };
	},
	cpuUsage: function(before, after) {
		if (!before || !after || after.total <= before.total || after.idle < before.idle) return null;
		return Math.min(100, Math.max(0, (1 - (after.idle - before.idle) / (after.total - before.total)) * 100));
	},
	delta: function(before, after) {
		if (!before || !after || before.device !== after.device || after.uptime < before.uptime) return null;
		var dt = (after.time - before.time) / 1000;
		// Counter resets, device switches and long polling gaps are discontinuities.
		if (dt <= 0 || dt > 30 || after.rx < before.rx || after.tx < before.tx) return null;
		return { down: (after.rx - before.rx) / dt, up: (after.tx - before.tx) / dt };
	},
	activityHistory: function(history, state, result, now) {
		if (!state || state.id !== result.id || result.cursor < state.cursor) {
			history = [];
			state = { id: result.id, cursor: 0, offset: now - result.now };
		}
		var cursor = state.cursor, points = history.slice();
		result.samples.forEach(function(row) {
			if (row[0] <= cursor) return;
			var time = row[1] + state.offset;
			if (points.length && time - points[points.length - 1].time > 3000) points.push({ time: time - 1, down: null, up: null });
			points.push({ time: time, down: row[2], up: row[3] });
			cursor = row[0];
		});
		return {
			history: points.filter(function(p) { return p.time >= now - 3600000; }).slice(-3601),
			state: { id: result.id, cursor: result.cursor, offset: state.offset }
		};
	},
	series: function(points, key, width, height, max, start, end, overscan) {
		var paths = [], line = [], range = Math.max(1, end - start);
		overscan = overscan || 0;
		function finish() { if (line.length) paths.push(line.join(' ')); line = []; }
		points.forEach(function(p) {
			if (p.time < start - overscan || p.time > end + overscan) return;
			if (p[key] == null || !isFinite(p[key])) { finish(); return; }
			var x = (p.time - start) / range * width, y = height - Math.min(1, Math.max(0, p[key]) / max) * height;
			line.push((line.length ? 'L' : 'M') + x.toFixed(2) + ',' + y.toFixed(2));
		});
		finish(); return paths;
	}
});
