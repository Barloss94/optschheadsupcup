'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const source=(html.match(/<script>\s*([\s\S]*?)<\/script>/)||[])[1];
assert.ok(source,'Het OHC-script bestaat');
const nodes={};
const context=vm.createContext({
 location:{hash:''},window:{},structuredClone,Date,Math,Intl,console,
 document:{getElementById:id=>nodes[id]},
 addEventListener(){},setTimeout(){},clearTimeout(){}
});
vm.runInContext(source.replace(/\ninitialize\(\);\s*$/,''),context);
const run=code=>vm.runInContext('(()=>{'+code+'})()',context);
function seedForm(periods,exclude={}){
 for(let i=0;i<5;i++){
  nodes['ohcWeekFrom'+i]={value:periods[i][0]};
  nodes['ohcWeekUntil'+i]={value:periods[i][1]};
  nodes['ohcWeekExcluded'+i]={value:exclude[i]||''};
 }
}
function emptyEvent(){
 run("data=structuredClone(DEFAULT);isAdmin=true;");
}
test('Een nieuw toernooi heeft geen spelers, resultaten, speeldata of speelperiodes',()=>{
 emptyEvent();
 const v=run("return {players:data.players.length,draw:data.draw.length,results:Object.keys(data.results).length,schedule:Object.keys(data.schedule).length,roundWindows:getRoundWindows().length,deadline:data.settings.registrationClosesAt};");
 assert.deepEqual({...v},{players:0,draw:0,results:0,schedule:0,roundWindows:0,deadline:null});
});
test('ISO-week 1 van 2027 en jaargrens 2026 correct verwerkt',()=>{
 const w=run("return isoWeekMonday('2027-W01')");
 assert.deepEqual({...w},{start:'2027-01-04',end:'2027-01-10'});
 assert.equal(run("return weekValueFromDate('2026-12-28')"),'2026-W53');
 assert.equal(run("return isoWeekMonday('2027-W53')"),null);
});
test('Vijf periodes kunnen over de jaargrens lopen met optionele uitgesloten datums',()=>{
 emptyEvent();
 seedForm([
  ['2026-W49','2026-W50'],
  ['2026-W51','2026-W52'],
  ['2027-W01','2027-W02'],
  ['2027-W02','2027-W03'],
  ['2027-W03','2027-W04']
 ],{0:'2026-12-04, 2026-12-05',1:'2026-12-24'});
 const result=run("return collectRoundWindows()");
 assert.equal(result.problems.length,0);
 assert.equal(result.windows.length,5);
 assert.equal(result.windows[0].start,'2026-11-30');
 assert.equal(result.windows[0].end,'2026-12-13');
 assert.equal(result.windows[4].end,'2027-01-31');
 assert.equal(result.windows[0].exclusions.length,2);
});
test('Weekperiodes met omgekeerde volgorde worden geweigerd',()=>{
 emptyEvent();
 seedForm(Array.from({length:5},()=>['2027-W03','2027-W02']));
 const result=run("return collectRoundWindows()");
 assert.equal(result.problems.length,5);
});
test('Geen uitgesloten dagen buiten eigen weekperiode toegestaan',()=>{
 emptyEvent();
 seedForm(Array.from({length:5},()=>['2027-W01','2027-W02']),{0:'2027-01-20'});
 const result=run("return collectRoundWindows()");
 assert.ok(result.problems.some(x=>x.includes('uitgesloten dag')));
});
test('Beheer heeft afzonderlijke archief- en resetknoppen met waarschuwende teksten',()=>{
 emptyEvent();
 const h=run("return adminFilesPage()");
 assert.match(h,/archiveAndStartNew/);
 assert.match(h,/resetCurrentTournament/);
 assert.match(h,/geen archief/i);
 assert.match(h,/volledig lege nieuwe competitie/i);
});
test('De archiefweergave bouwt alleen-lezen informatie zonder actieve data te wijzigen',()=>{
 emptyEvent();
 run("data.players=[{id:'p1',name:'Anna',blocked:[]}];");
 const before=run("return data.players.length");
 context.snapshot={id:'123',title:'OHC afgesloten',archived_at:'2026-12-31T00:00:00Z',
   state:{players:[{id:'p2',name:'Bram',blocked:[]}],draw:[],results:{},schedule:{},settings:{roundWindows:[]}}};
 context.archiveSnapshot=context.snapshot;
 const result=run("archiveRecord=archiveSnapshot;const text=archivedReadOnlyView('deelnemers');return {html:text,active:data.players[0].name,admin:isAdmin,readOnly:archiveReadonly};");
 assert.match(result.html,/Bram/);
 assert.doesNotMatch(result.html,/Anna/);
 assert.equal(result.active,'Anna');
 assert.equal(result.admin,true);
 assert.equal(result.readOnly,false);
});
test('Archieflijst is voor ingelogde bezoekers zichtbaar',()=>{
 emptyEvent();
 const view=run("archiveRecord=null;archivesCache=[{id:'12345678-1234-1234-1234-123456789abc',title:'OHC 2026',archived_at:'2026-12-31T00:00:00Z'}];return archiveView()");
 assert.match(view,/OHC 2026/);
 assert.match(view,/openArchive/);
});
