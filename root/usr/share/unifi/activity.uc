// SPDX-License-Identifier: Apache-2.0
import { readfile } from 'fs';
import { connect } from 'ubus';
import { init, timer, run } from 'uloop';
import { create_store } from './activity-store.uc';

init();
const bus = connect();
if (!bus) die('Unable to connect network activity collector to ubus\n');
const store = create_store(trim(readfile('/proc/sys/kernel/random/uuid')));

function sample() {
	let counters = {};
	// One kernel counter snapshot per second, without spawning commands or
	// inspecting packets, Wi-Fi associations, or connection tracking entries.
	for (let line in split(readfile('/proc/net/dev') ?? '', '\n')) {
		let row = match(line, /^\s*([^:]+):\s*(.+)$/);
		if (!row || row[1] == 'lo') continue;
		let fields = split(trim(row[2]), /\s+/);
		if (length(fields) < 16) continue;
		let rx = +fields[0], tx = +fields[8];
		if (rx >= 0 && tx >= 0) counters[trim(row[1])] = [rx, tx];
	}
	let uptime = +(split(readfile('/proc/uptime') ?? '', ' ')[0]);
	store.sample(counters, time() * 1000, uptime);
}

// Retain both resources for the lifetime of the event loop.
const object = bus.publish('unifi.activity', {
	history: {
		// uhttpd adds the authenticated session field to browser RPC calls.
		args: { device: '', since: 0, id: '', ubus_rpc_session: '' },
		call: function(request) {
			request.reply(store.history(request.args.device,
				max(0, request.args.since ?? 0), request.args.id));
		}
	}
});
if (!object) die('Unable to publish network activity history\n');
sample();
let sampling_timer;
sampling_timer = timer(1000, function() {
	sample();
	sampling_timer.set(1000);
});
run();
