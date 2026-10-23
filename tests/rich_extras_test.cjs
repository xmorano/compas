const puppeteer=require('/home/xmorano/Work/Eventos/whatsapp-service/node_modules/puppeteer');const assert=require('node:assert/strict');
(async()=>{const browser=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});try{
const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8124/');
await page.evaluate(()=>{coreo('r1').extras='Restart <16>\nTag 4 counts';editCoreo('r1')});assert((await page.$eval('#extras-editor',e=>e.textContent)).includes('Restart <16>'));assert.equal(await page.$eval('#extras-editor',e=>e.querySelectorAll('br').length),1);
await page.$eval('#extras-editor',e=>{e.innerHTML='Restart';e.focus();const r=document.createRange();r.selectNodeContents(e);window.getSelection().removeAllRanges();window.getSelection().addRange(r)});
await page.click('[data-extras-command="bold"]');assert(await page.$('#extras-editor b, #extras-editor strong'));
await page.click('[data-extras-command="insertUnorderedList"]');assert(await page.$('#extras-editor ul li'));
page.once('dialog',d=>d.accept('https://example.com/pasos'));
await page.click('[data-extras-command="createLink"]');assert(await page.$('#extras-editor a[href="https://example.com/pasos"]'));
await page.click('#form button[type="submit"]');await page.reload();await page.evaluate(()=>{activeSession='s1';render()});
assert(await page.$('.routine-main .extras-rich b,.routine-main .extras-rich strong'));assert(await page.$('.routine-main .extras-rich ul li'));assert(await page.$('.routine-main .extras-rich a[target="_blank"][rel="noopener noreferrer"]'));
await page.evaluate(()=>editCoreo('r1'));assert(await page.$('#extras-editor ul li'));await page.click('#cancel');
const sanitized=await page.evaluate(()=>extrasHtml(EXTRAS_RICH_PREFIX+'<script>alert(1)</script><img src=x onerror=alert(1)><svg onload=alert(1)></svg><a href="javascript:alert(1)" onclick="alert(1)">bad</a><strong style="color:red">safe</strong>'));
assert(!/script|onerror|onclick|style=|<img|<svg|javascript:/i.test(sanitized));assert(sanitized.includes('<strong>safe</strong>'));
assert.equal(await page.evaluate(()=>extrasHtml('<b>texto antiguo</b>')),'&lt;b&gt;texto antiguo&lt;/b&gt;');
await page.evaluate(()=>editCoreo('r1'));await page.$eval('#extras-editor',e=>e.innerHTML='');await page.click('#form button[type="submit"]');assert.equal(await page.evaluate(()=>coreo('r1').extras),'');
assert.deepEqual(errors,[]);console.log('Editor verificado en Chrome: texto antiguo, negrita, listas, enlaces, guardado/recarga, edición, borrado y limpieza de HTML inseguro.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
