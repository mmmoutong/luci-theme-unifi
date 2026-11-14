/* Synthetic inventory exclusively for the local preview. Never shipped in the ipk. */
'use strict';
window.demoClients=[
	['MacBook Pro','10.0.0.221','A2:11:22:33:44:01','Home 5 GHz',-48],
	['iPhone 16 Pro','10.0.0.102','6A:11:22:33:44:02','Home 5 GHz',-59],
	['iPad Air','10.0.0.126','C2:11:22:33:44:03','Home 5 GHz',-62],
	['Living Room TV','10.0.0.151','E4:11:22:33:44:04'],
	['Tower NAS','10.0.0.103','80:11:22:33:44:05'],
	['Home Assistant','10.0.0.8','02:11:22:33:44:06'],
	['PlayStation 5','10.0.0.142','E0:11:22:33:44:07'],
	['小米扫地机器人','10.0.0.163','54:11:22:33:44:08','Home IoT',-72],
	['Desk PC','10.0.0.101','84:11:22:33:44:09'],
	['Nintendo Switch','10.0.0.178','7C:11:22:33:44:0A','Home 5 GHz',-65],
	['Guest iPhone','10.0.20.23','D2:11:22:33:44:0B','Guest',-68],
	['Sonos One','10.0.0.181','48:11:22:33:44:0C','Home IoT',-56],
	['Kindle','10.0.0.201','B0:11:22:33:44:0D'],
	['Pixel 9','10.0.0.127','7A:11:22:33:44:0E','Home 5 GHz',-55],
	['Raspberry Pi','10.0.0.45','B8:11:22:33:44:0F'],
	['Office Printer','10.0.0.61','30:11:22:33:44:10'],
	['Apple TV','10.0.0.152','60:11:22:33:44:11'],
	['Zigbee Bridge','10.0.0.24','70:11:22:33:44:12'],
	['Garage Camera','10.0.0.189','C0:11:22:33:44:13'],
	['Work Laptop','10.0.0.222','AC:11:22:33:44:14'],
	['Smart Plug','10.0.0.165','28:11:22:33:44:15'],
	['Backup Server','10.0.0.41','BC:11:22:33:44:16'],
	['','10.0.0.205','F2:11:22:33:44:17'],
	['Guest Tablet','10.0.20.24','C6:11:22:33:44:18']
].map(function(c,i){return {name:c[0],ip:c[1],mac:c[2],ssid:c[3]||'',signal:c[4],reserved:[4,5,8,14,15,20,21].indexOf(i)>=0,neighbor:!c[3]&&i!==12&&i!==23,lease:i!==4&&i!==5&&i!==21,ipv6:i%3===0?'fd00:10::'+(i+10).toString(16):null};});
