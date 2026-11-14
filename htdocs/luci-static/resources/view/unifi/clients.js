/* SPDX-License-Identifier: Apache-2.0 */
'use strict';
'require view';
'require unifi.clients as clients';

return view.extend({
	load:function(){return clients.load();},
	render:function(data){return clients.render(data);},
	handleSaveApply:null,
	handleSave:null,
	handleReset:null
});
