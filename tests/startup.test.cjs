'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const poster=fs.readFileSync(path.join(root,'share.js'),'utf8');
const calendar=fs.readFileSync(path.join(root,'calendar.js'),'utf8');
const tags=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
const loadOrder=tags.map(match=>({tag:match[0].slice(0,180),inline:match[1]}));
const calendarIndex=loadOrder.findIndex(x=>x.tag.includes('src="./calendar.js?'));
const shareIndex=loadOrder.findIndex(x=>x.tag.includes('src="./share.js?'));
const mainIndex=loadOrder.findIndex(x=>x.inline.includes("function render(){"));
assert.ok(shareIndex>=0,'Share script tag bestaat');
assert.ok(mainIndex>=0,'Main script bestaat');

test('De share-module laadt voordat de hoofdapp initialiseert',()=>{
 assert.ok(calendarIndex>=0&&calendarIndex<shareIndex&&shareIndex<mainIndex,
  'Eerst calendar.js, dan share.js en daarna pas het hoofdscript laden.');
 assert.match(loadOrder[mainIndex].inline,/initialize\(\);\s*$/);
});

test('Website toont het inlogformulier direct bij anonieme eerste opening',async()=>{
 const nodes={
  nav:{innerHTML:''},
  main:{innerHTML:''},
  toast:{textContent:'',classList:{add(){},remove(){}}}
 };
 const browser={
  location:{hash:''},
  console,
  structuredClone,
  setTimeout,
  clearTimeout,
  requestAnimationFrame(fn){fn()},
  addEventListener(){},
  document:{getElementById(id){return nodes[id]||null}},
  window:{supabase:{createClient(){return {
   auth:{
    getSession:async()=>({data:{session:null},error:null}),
    onAuthStateChange:()=>({data:{subscription:{}}})
   }
  }} }}
 };
 const ctx=vm.createContext(browser);
 vm.runInContext(calendar,ctx,{filename:'calendar.js'});
 vm.runInContext(poster,ctx,{filename:'share.js'});
 const inline=loadOrder[mainIndex].inline.replace(/\ninitialize\(\);\s*$/,'');
 vm.runInContext(inline,ctx,{filename:'index-inline.js'});
 await vm.runInContext('initialize()',ctx);
 assert.match(nodes.main.innerHTML,/Inloggen/);
 assert.match(nodes.main.innerHTML,/loginEmail/);
 assert.doesNotMatch(nodes.main.innerHTML,/Verbinding mislukt/);
});

test('Linksboven wordt een echte OHC-logoafbeelding getoond, ook op mobiele schermen',()=>{
 const brand=fs.readFileSync(path.join(root,'brand.css'),'utf8');
 const header=html.match(/<header class="top">[\s\S]*?<\/header>/)?.[0];
 assert.ok(header,'De bovenste websiteheader bestaat');
 assert.match(header,/<img\s+class="brand-emblem"\s+src="\.\/assets\/ohc-logo\.avif"/);
 assert.match(header,/width="84" height="66"/);
 assert.doesNotMatch(header,/<div class="mark brand-emblem"/);
 assert.match(brand,/\.identity img\.brand-emblem\s*\{[^}]*display:block/);
 assert.match(brand,/@media\(max-width:690px\)\s*\{[\s\S]*?\.identity img\.brand-emblem\s*\{[^}]*height:57px/);
 assert.doesNotMatch(brand,/\.mark\.brand-emblem\s*\{[^}]*background:none/);
});

test('Kleine goudgele labels gebruiken leesbare lettervormen zonder gloed',()=>{
 const brand=fs.readFileSync(path.join(root,'brand.css'),'utf8');
 const layout=fs.readFileSync(path.join(root,'layout.css'),'utf8');
 assert.match(brand,/h1,h2,h3,\.stat \.number[^{}]*\{font-family:Inter/);
 assert.match(layout,/\.launch-title\{[^}]*font-weight:700;[^}]*font-size:16px;[^}]*font-family:Inter/);
 assert.match(layout,/\.dashboard-status-title\{[^}]*font-family:Inter/);
 assert.match(layout,/\.stat \.status-number\{[^}]*color:#ffe8b5;[^}]*font-size:18px;[^}]*font-weight:700/);
 assert.match(html,/<div class="number status-number">\$\{esc\(effectiveStatus\(\)\)\}/);
 assert.doesNotMatch(html,/font-size:16px;margin-top:16px;color:var\(--orange\)/);
});


test('Op desktop staat het menu onder het OHC-logo en de titel in een aparte rij',()=>{
 const brand=fs.readFileSync(path.join(root,'brand.css'),'utf8');
 const header=html.match(/<header class="top">[\s\S]*?<\/header>/)?.[0];
 assert.ok(header,'Websiteheader ontbreekt');
 assert.ok(header.indexOf('class="identity"')<header.indexOf('id="nav"'));
 assert.match(brand,/@media\(min-width:1001px\)\{/);
 assert.match(brand,/\.topinner\{\s*flex-direction:column;\s*align-items:stretch;/);
 assert.match(brand,/\.topinner \.nav\{\s*width:100%;\s*margin-top:9px;/);
 assert.match(brand,/\.topinner \.nav\{[^}]*justify-content:center;/);
 assert.match(brand,/@media\(max-width:690px\)/,'Mobiele CSS blijft afzonderlijk bestaan');
});
