'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const inline=html.match(/<script>\s*([\s\S]*?)<\/script>/);
assert.ok(inline,'Er is een inline app-script');
const source=inline[1].replace(/\ninitialize\(\);\s*$/,'');
const context=vm.createContext({
  location:{hash:''},window:{},document:{},
  addEventListener(){},structuredClone,console,Date,Math,Intl
});
vm.runInContext(source,context,{filename:'index.inline.js'});
function run(source){return vm.runInContext('(()=>{'+source+'})()',context);}
const players=[
 ['Anna',1],['Bram',1],['Cato',2],['Daan',2],
 ['Eva',2],['Felix',2],['Gert',2],['Hanna',2]
];
function seed(count=4){
 const roster=players.slice(0,count).map(([name,day],i)=>({
   id:String(i),name,
   blocked:[0,1,2,3,4,5,6].filter(n=>n!==day)
 }));
 context.testRoster=roster;
 run("isAdmin=true;data=structuredClone(DEFAULT);data.players=structuredClone(testRoster);data.draw=['0','1','2','3'];");
}

test('Nieuwe onverenigbare duels worden gewaarschuwd vóór opslaan',()=>{
 seed();
 const output=run("const result=analyzeFirstRoundSwap(0,2);return {previous:result.directOld.length,newCount:result.directNew.length,newPairs:result.addedDirect.length,valid:!result.blocked};");
 assert.equal(output.previous,0);
 assert.equal(output.newCount,2);
 assert.equal(output.newPairs,2);
 assert.equal(output.valid,true);
});

test('De preview wijzigt de werkelijke indeling niet',()=>{
 seed();
 assert.equal(run("analyzeFirstRoundSwap(0,2);return data.draw.join(',')"),'0,1,2,3');
});

test('Nog niet alle duels klaar: gedane uitslag in gewijzigde partij vervalt',()=>{
 seed();
 const result=run("data.results['0:0']='0';const p=analyzeFirstRoundSwap(0,2);return {open:!firstRoundIsComplete(),erased:p.erasedResults.includes('0:0'),after:!!p.state.results['0:0']};");
 assert.deepEqual([result.open,result.erased,result.after],[true,true,false]);
});

test('Voltooide eerste ronde vergrendelt aanpassingen',()=>{
 seed();
 const result=run("data.results={'0:0':'0','0:1':'2'};return {complete:firstRoundIsComplete(),error:analyzeFirstRoundSwap(0,2).error};");
 assert.equal(result.complete,true);
 assert.match(result.error,/vergrendeld/i);
});

test('Omkeren van thuis/uit binnen hetzelfde duel bewaart de uitslag',()=>{
 seed();
 const result=run("data.results={'0:0':'0'};const p=analyzeFirstRoundSwap(0,1);return {erased:p.erasedResults.length,winner:p.state.results['0:0']};");
 assert.equal(result.erased,0);
 assert.equal(result.winner,'0');
});

test('Vrijloting verplaatsen kan, een volledig leeg duel maken niet',()=>{
 seed(6);
 run("data.draw=['0','1','2','3','4',null,'5',null];data.results={'0:0':'0'};");
 const result=run("const ok=analyzeFirstRoundSwap(1,5),invalid=analyzeFirstRoundSwap(4,7);return {allowed:!ok.error&&!ok.blocked,draw:ok.state.draw.join(','),rejected:!!invalid.error};");
 assert.equal(result.allowed,true);
 assert.equal(result.draw,'0,,2,3,4,1,5,');
 assert.equal(result.rejected,true);
});

test('Definitief ingeplande speeldagen worden expliciet gemeld bij reset',()=>{
 seed();
 const result=run("data.schedule={'0:0':{date:'2026-12-01',time:'20:00',provisional:false}};const p=analyzeFirstRoundSwap(0,2);return p.erasedConfirmations.includes('0:0');");
 assert.equal(result,true);
});

test('Afhankelijke ronde-2-uitslag vervalt; onafhankelijke uitslagen blijven',()=>{
 seed(8);
 run("data.draw=['0','1','2','3','4','5','6','7'];data.results={'0:0':'0','0:1':'2','0:2':'4','1:0':'0'};");
 const result=run("const p=analyzeFirstRoundSwap(0,4);return {first:!!p.state.results['0:0'],third:!!p.state.results['0:2'],next:!!p.state.results['1:0'],second:p.state.results['0:1'],erased:p.erasedResults.length};");
 assert.equal(result.first,false);
 assert.equal(result.third,false);
 assert.equal(result.next,false);
 assert.equal(result.second,'2');
 assert.equal(result.erased,3);
});

test('Lotingspagina toont veilige wisselcontrols en start na hoofdsectie',()=>{
 seed();
 const html=run("return adminLotteryPage()");
 assert.match(html,/id="swapFrom"/);
 assert.match(html,/id="swapTo"/);
 assert.match(html,/<\/p><\/section><section class="panel" id="roundOneSwap">/);
});
