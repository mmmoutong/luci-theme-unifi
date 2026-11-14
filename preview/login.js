/* The preview never sends credentials, even to the local preview server. */
(function() {
 'use strict';
 var form=document.querySelector('.uf-login-form');
 form.addEventListener('submit',function(event) {
  event.preventDefault();event.stopImmediatePropagation();
  var status=document.getElementById('preview-login-status');
  if (!status) {
   status=document.createElement('p');status.id='preview-login-status';
   status.className='uf-login-noscript';status.setAttribute('role','status');
   form.appendChild(status);
  }
  status.textContent='本地预览不验证用户名或密码，也不会发送登录信息。';
 },true);
})();
