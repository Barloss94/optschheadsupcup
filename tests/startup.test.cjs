'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const poster=fs.readFileSync(path.join(root,'share.js'),'utf8');
const tags=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
const loadOrder=tags.map(match=>({tag:match[0].slice(0,180),inline:match[1]}));
const shareIndex=loadOrder.findIndex(x=>x.tag.includes('src="./share.js?'));
const mainIndex=loadOrder.findIndex(x=>x.inline.includes("function render(){"));
assert.ok(shareIndex>=0,'Share script tag bestaat');
assert.ok(mainIndex>=0,'Main script bestaat');

test('De share-module laadt voordat de hoofdapp initialiseert',()=>{
 assert.ok(shareIndex<mainIndex,
  'Eerst share.js laden, anders crasht render() bij de functie shareView.');
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
