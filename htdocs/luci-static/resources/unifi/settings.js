/* SPDX-License-Identifier: Apache-2.0 */
'use strict';
'require baseclass';

// Only the theme header supplies these settings. No new RPC is needed per page.
var choices={mode:['auto','light','dark'],page_size:['10','25','50','100'],client_refresh:['5','10','30','60'],dashboard_refresh:['1','2','5','10','30','60'],nav_expanded:['0','1'],activity_always:['0','1']};
var defaults={mode:'auto',page_size:'50',client_refresh:'10',dashboard_refresh:'5',nav_expanded:'0',activity_always:'1'};
return baseclass.extend({
	get:function(key){
		var value=document.documentElement.getAttribute('data-uf-'+key.replace(/_/g,'-'));
		return choices[key]&&choices[key].indexOf(value)>=0?value:defaults[key];
	}
});
