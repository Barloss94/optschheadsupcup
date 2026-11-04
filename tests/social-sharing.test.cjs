'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const inline=(html.match(/<script>\s*([\s\S]*?)<\/script>/)||[])[1];
const sharing=fs.readFileSync(path.join(__dirname,'..','share.js'),'utf8');
const calendar=fs.readFileSync(path.join(__dirname,'..','calendar.js'),'utf8');
assert.ok(inline,'De hoofdapp heeft een script');
assert.match(html,/share\.js\?v=/);

let drawn=[];
const makeGradient=()=>({addColorStop(){}});
const makeContext=()=>({
 fillStyle:'',strokeStyle:'',lineWidth:1,font:'',textAlign:'',textBaseline:'',
 fillRect(){},beginPath(){},moveTo(){},arcTo(){},closePath(){},fill(){},stroke(){},
 createRadialGradient:makeGradient,createLinearGradient:makeGradient,
 drawImage(){},scale(){},save(){},restore(){},
 measureText(s){return {width:String(s).length*13}},
 fillText(str){drawn.push(String(str))}
});
const context=vm.createContext({
  location:{hash:''},window:{},structuredClone,Date,Intl,Math,console,
  addEventListener(){},setTimeout(){},clearTimeout(){},
  document:{
   getElementById(){return null},
   createElement(tag){
    if(tag==='canvas')return {width:0,height:0,getContext:makeContext};
    return {};
   }
  }
});
vm.runInContext(calendar,context,{filename:'calendar.js'});
vm.runInContext(sharing,context,{filename:'share.js'});
vm.runInContext(inline.replace(/\ninitialize\(\);\s*$/,''),context,{filename:'index.inline.js'});
const run=s=>vm.runInContext('(()=>{'+s+'})()',context);

function seed(count=32){
 drawn=[];
 context.playersFixture=Array.from({length:count},(_,i)=>({
  id:'p'+i,name:'Deelnemer '+(i+1)+' Achternaam',blocked:[]
 }));
 run('data=structuredClone(DEFAULT);data.players=structuredClone(playersFixture);isAdmin=true;authUser={id:"test"};');
 if(count>=2)run("data.draw=data.players.map(p=>p.id)");
 run("data.settings.roundWindows=structuredClone(LEGACY_ROUND_WINDOWS);");
}

test('De deelpagina toont exporttypes en rondekeuze zoals OSC',()=>{
 seed();
 const markup=run("return shareView()");
 assert.match(markup,/Ronde-indeling \/ loting/);
 assert.match(markup,/Speelschema/);
 assert.match(markup,/Uitslagen/);
 assert.match(markup,/Deelnemersoverzicht/);
 assert.match(markup,/Prijzen en buy-in/);
 assert.match(markup,/ohcShareRound/);
 assert.match(markup,/Download als PNG/);
 assert.match(markup,/Deel afbeelding/);
});
test('Eén eerste-rondeposter bevat alle 16 duels bij 32 deelnemers',()=>{
 seed();
 const summary=run("ohcShareType='loting';ohcShareRound=0;const p=shareActiveInfo();const canvas=buildOhcSharePoster(p,null);return {count:p.matches.length,width:canvas.width,height:canvas.height,filename:shareFileLabel(p)}");
 assert.equal(summary.count,16);
 assert.equal(summary.width,2160);
 assert.ok(summary.height>2880);
 assert.match(summary.filename,/loting-ronde-1\.png$/);
 for(let i=1;i<=16;i++)assert.ok(drawn.includes('DUEL '+i),'Duel '+i+' ontbreekt');
 assert.ok(drawn.some(x=>x.includes('Deelnemer 1 Achternaam')));
 assert.ok(drawn.some(x=>x.includes('Deelnemer 32 Achternaam')));
});
test('Speelschema-poster bevat speeldatum en starttijd',()=>{
 seed(4);
 const values=run("data.schedule['0:0']={date:'2026-12-01',time:'20:30',provisional:false};ohcShareType='schema';ohcShareRound=0;const info=shareActiveInfo();buildOhcSharePoster(info,null);return info.matches.length;");
 assert.equal(values,2);
 assert.ok(drawn.some(x=>x.includes('20:30')),'starttijd ontbreekt');
});
test('Uitslagenposter benadrukt winnaar en score',()=>{
 seed(4);
 run("data.results['0:0']='p0';data.settings.resultText['0:0']='2-1';ohcShareType='uitslagen';ohcShareRound=0;buildOhcSharePoster(shareActiveInfo(),null)");
 assert.ok(drawn.some(x=>x.startsWith('WINNAAR:')));
 assert.ok(drawn.some(x=>x.includes('Deelnemer 1 Achternaam')));
 assert.ok(drawn.some(x=>x.includes('2-1')));
});
test('Deelnemersposter toont alle ingeschreven namen',()=>{
 seed(32);
 const page=run("ohcShareType='deelnemers';const canvas=buildOhcSharePoster(shareActiveInfo(),null);return {w:canvas.width,h:canvas.height};");
 assert.equal(page.w,2160);
 assert.ok(page.h>=2880);
 assert.ok(drawn.some(x=>x.includes('Deelnemer 32 Achternaam')));
});
test('Prijzenposter maakt een overzicht volgens huidige prijsberekening',()=>{
 seed(32);
 run("ohcShareType='prijzen';buildOhcSharePoster(shareActiveInfo(),null)");
 assert.ok(drawn.some(x=>x.includes('PRIJZENPOT')));
 assert.ok(drawn.some(x=>x.includes('€')));
});
test('Zonder inloggen kan geen gedeelde poster worden geopend',()=>{
 seed(4);
 const tab=run("authUser=null;tab='overzicht';openShare('loting',0);return tab;");
 assert.equal(tab,'overzicht');
});
test('Zonder loting kan geen rondeposter worden opgebouwd',()=>{
 seed(0);
 const result=run("ohcShareType='loting';return shareActiveInfo();");
 assert.equal(result,null);
});
