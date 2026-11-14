/* SPDX-License-Identifier: Apache-2.0 */
(function() {
 'use strict';
 var form=document.querySelector('.uf-login-form');
 if (!form) return;
 var username=form.querySelector('[name=luci_username]'),password=form.querySelector('[name=luci_password]');
 var submit=form.querySelector('[type=submit]'),pending=false;
 var initialLabel=submit.textContent;
 form.addEventListener('submit',function(event) {
  if (event.defaultPrevented) return;
  if (pending) {event.preventDefault();return;}
  pending=true;
  submit.disabled=true;
  submit.textContent=submit.dataset.busyLabel;
  form.setAttribute('aria-busy','true');
  // Let the browser POST the original field names to the current LuCI URL.
 });
 window.addEventListener('pageshow',function() {
  pending=false;submit.disabled=false;submit.textContent=initialLabel;
  form.removeAttribute('aria-busy');password.value='';
 });
 if (!username.value) username.focus();
})();
