// Run with: ucode tests/activity-store.uc
import { create_store } from '../root/usr/share/unifi/activity-store.uc';

function check(condition, message) {
	if (!condition) die(`FAIL: ${message}\n`);
}

const store = create_store('test', 3);
store.sample({ eth0: [100, 50], eth1: [200, 100] }, 100000, 10);
store.sample({ eth0: [1100, 550], eth1: [600, 300] }, 101000, 11);
let first = store.history('eth0', 0, '');
check(length(first.samples) == 2 && first.samples[0][2] == null, 'initial sample has no invented rate');
check(first.samples[1][2] == 1000 && first.samples[1][3] == 500, 'one-second rates');
check(store.history('eth1', 0, '').samples[1][2] == 400, 'interfaces stay isolated');
check(length(store.history('eth0', first.cursor, first.id).samples) == 0, 'incremental reads avoid duplicates');
store.sample({ eth0: [3100, 1550] }, 102000, 12);
store.sample({ eth0: [6100, 3050] }, 103000, 13);
let ring = store.history('eth0', first.cursor, first.id);
check(length(ring.samples) == 2 && ring.samples[0][2] == 2000 && ring.samples[1][2] == 3000, 'wrapped rings preserve ordering and cursor');
check(length(store.history('eth0', 0, '').samples) == 3, 'ring stays bounded');
store.sample({ eth0: [1, 1], eth1: [1000, 600] }, 104000, 14);
check(store.history('eth0', 0, '').samples[2][2] == null, 'counter resets break the line');
check(store.history('eth1', 0, '').samples[2][2] == null, 'reappearing devices start a new baseline');
store.sample({ eth0: [5001, 2501] }, 109000, 19);
check(store.history('eth0', 0, '').samples[2][2] == null, 'long sampling delays break the line');
store.sample({ eth0: [6001, 3001] }, 90000, 20);
let clock_reset = store.history('eth0', ring.cursor, ring.id);
check(clock_reset.id != ring.id && length(clock_reset.samples) == 1, 'clock jumps start a new generation');
check(length(create_store('restart').history('eth0', 0, '').samples) == 0, 'a fresh process has no persisted history');

const hour = create_store('hour');
for (let i = 0; i < 4000; i++) hour.sample({ eth0: [i * 1000, i * 500] }, 100000 + i * 1000, i);
let all = hour.history('eth0', 0, '');
check(length(all.samples) == 3601, 'full hour at one-second resolution');
check(all.samples[0][0] == 400 && all.samples[3600][0] == 4000, 'old samples are overwritten');
for (let i = 4000; i < 7602; i++) hour.sample({}, 100000 + i * 1000, i);
check(length(hour.history('eth0', 0, '').samples) == 0, 'disappeared devices expire after an hour');
print('Activity store checks passed\n');
