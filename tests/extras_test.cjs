const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const nodes=new Map();const document={querySelector:s=>{if(!nodes.has(s))nodes.set(s,{classList:{toggle(){},add(){},remove(){}}});return nodes.get(s)},querySelectorAll:()=>[],addEventListener(){}};
const sandbox={document,URL,structuredClone,localStorage:{getItem:()=>null,setItem(){}},setTimeout(){},crypto:require('node:crypto').webcrypto};vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('previous-class.js','utf8')+'\n'+fs.readFileSync('app.js','utf8'),sandbox);
vm.runInContext(String.raw`
let formHtml,commit;modal=(title,html,handler)=>{formHtml=html;commit=handler};
editCoreo('r1');if(!formHtml.includes('name="extras"'))throw Error('Campo ausente');
commit({...coreo('r1'),extras:'Restart pared 3\nTag <4> & final',sheet:'https://example.com/hoja'});
activeSession='s1';const html=sessionView();
if(!html.includes('Restart pared 3\nTag &lt;4&gt; &amp; final'))throw Error('Extras escapados');
if(!html.includes('href="https://example.com/hoja"')||!html.includes('Hoja de la coreografía'))throw Error('Enlace ausente');
if(!coreoCards().includes('Restart pared 3'))throw Error('Catálogo');
editCoreo('r1');if(!formHtml.includes('Tag &lt;4&gt; &amp; final'))throw Error('Edición');
if(classCoreoResources({sheet:'javascript:alert(1)'}))throw Error('URL insegura');
if(classCoreoResources({}))throw Error('Ficha antigua');
`,sandbox);
console.log('Extras: edición, conservación, catálogo/clase, saltos de línea, escape HTML, enlace válido y compatibilidad con fichas antiguas verificados.');
