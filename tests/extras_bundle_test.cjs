const fs=require('node:fs'),assert=require('node:assert/strict');
const puppeteer=require('/home/xmorano/Work/Eventos/whatsapp-service/node_modules/puppeteer');
(async()=>{const browser=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});try{
for(const oldEditor of [false,true]){
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent(fs.readFileSync('index.html','utf8').replace(/<script[^>]*>[\s\S]*?<\/script>/g,''));
 await page.evaluate(()=>{window.COMPAS_INITIAL_DATA={centers:[],groups:[],coreos:[],sessions:[]};window.cloudSave=()=>{}});
 if(oldEditor)await page.addScriptTag({path:'rich-extras.js'});
 await page.addScriptTag({path:'dist/clases/app.js'});
 const result=await page.evaluate(()=>{const html=coreoExtras({extras:'<!--compas-rich-v1--><b>Restart</b>'});editCoreo();return {html,editor:!!document.getElementById('extras-editor')};});
 assert(result.html.includes('<b>Restart</b>'));assert(result.editor);assert.deepEqual(errors,[]);await page.close();
}
console.log('Paquete verificado en Chrome: extras y editor funcionan sin rich-extras.js separado y con un cargador anterior que ya lo incluye.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
