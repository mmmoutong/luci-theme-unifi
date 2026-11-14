// Run each suite in its own process so browser fixtures and globals stay isolated.
const {spawnSync}=require('node:child_process');
const path=require('node:path');
for(const suite of ['browser-smoke','client-ui-browser','settings-browser','activity-browser','controls-browser','tabs-browser','login-browser']) {
 const result=spawnSync(process.execPath,[path.resolve(__dirname,'../tests/'+suite+'.cjs')],{stdio:'inherit',env:process.env});
 if(result.error) throw result.error;
 if(result.status!==0) process.exit(result.status||1);
}
