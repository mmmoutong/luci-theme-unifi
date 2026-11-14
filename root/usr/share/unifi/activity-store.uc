// SPDX-License-Identifier: Apache-2.0
// Fixed-size, per-interface rings. This module performs no file writes.
export function create_store(id, capacity) {
	capacity = capacity ?? 3601;
	let devices = {};
	let sequence = 0;
	let last_clock = null;
	let revision = 0;
	return {
		sample: function(counters, clock, uptime) {
			// NTP may move wall time backwards. Keep monotonic time for rates,
			// and start a new history generation when the chart clock jumps.
			if (last_clock != null && (clock <= last_clock || clock - last_clock > 30000)) {
				devices = {};
				revision++;
			}
			last_clock = clock;
			sequence++;
			for (let name, values in counters) {
				let state = devices[name];
				if (!state) state = devices[name] = { ring: [], head: 0, count: 0 };
				let before = state.previous;
				let elapsed = before ? uptime - before.uptime : 0;
				let valid = before && elapsed > 0 && elapsed <= 3 &&
					values[0] >= before.rx && values[1] >= before.tx;
				state.ring[state.head] = [sequence, clock,
					valid ? (values[0] - before.rx) / elapsed : null,
					valid ? (values[1] - before.tx) / elapsed : null];
				state.head = (state.head + 1) % capacity;
				state.count = min(state.count + 1, capacity);
				state.previous = { rx: values[0], tx: values[1], uptime };
				state.seen = clock;
			}
			for (let name, state in devices) {
				if (!(name in counters)) state.previous = null;
				if (clock - state.seen > 3600000) delete devices[name];
			}
		},
		history: function(name, since, previous_id) {
			let generation = `${id}:${revision}`;
			let state = devices[name];
			let samples = [];
			if (previous_id != generation || since > sequence) since = 0;
			if (state) {
				// A one-second incremental poll only needs the newest ring slot.
				let start = since > 0 ? max(0, state.count - (sequence - since)) : 0;
				for (let i = start; i < state.count; i++) {
					let point = state.ring[(state.head - state.count + capacity + i) % capacity];
					if (point[0] > since && last_clock - point[1] <= 3600000) push(samples, point);
				}
			}
			return { id: generation, device: name, cursor: sequence, now: last_clock,
				rx: state?.previous?.rx, tx: state?.previous?.tx, samples };
		}
	};
};
