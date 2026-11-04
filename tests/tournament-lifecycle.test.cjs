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

test('Nieuwe editie blijft gesloten totdat de inschrijfdeadline is ingevuld',()=>{
 emptyEvent();
 const result=run("return {closed:registrationClosed(),configured:registrationDeadlineConfigured(),label:effectiveStatus(),setup:tournamentSetupChecklist()};");
 assert.equal(result.closed,true);
 assert.equal(result.configured,false);
 assert.match(result.label,/nog instellen/i);
 assert.match(result.setup,/Inschrijfdeadline/);
 assert.match(result.setup,/beheer-instellingen/);
});

test('Inschrijfdeadline is per editie aan te passen in het beheerscherm',()=>{
 emptyEvent();
 const h=run("return adminConfigPage()");
 assert.match(h,/ohcEventTitle/);
 assert.match(h,/ohcRegistrationClose/);
 assert.match(h,/datetime-local/);
 assert.match(h,/saveGeneralSettings/);
 assert.match(h,/ohcWeekFrom0/);
 assert.match(h,/ohcWeekUntil4/);
});

test('Inschrijfdeadline gebruikt Nederlandse winter- en zomertijd, ongeacht toestel',()=>{
 emptyEvent();
 assert.equal(run("return dutchLocalDeadlineIso('2027-01-17T23:59')"),'2027-01-17T22:59:00.000Z');
 assert.equal(run("return dutchLocalDeadlineIso('2027-07-17T23:59')"),'2027-07-17T21:59:00.000Z');
 assert.equal(run("return localDeadlineInput('2027-01-17T22:59:00.000Z')"),'2027-01-17T23:59');
 assert.throws(()=>run("return dutchLocalDeadlineIso('2027-03-28T02:30')"),/bestaat niet/);
 assert.throws(()=>run("return dutchLocalDeadlineIso('2027-10-31T02:30')"),/wintertijdomschakeling/);
});

test('Handmatige inschrijving sluit zodra de instelbare deadline is verstreken',()=>{
 emptyEvent();
 assert.equal(run("data.settings.registrationClosesAt='2090-01-01T12:00:00.000Z';return registrationClosed()"),false);
 assert.equal(run("data.settings.registrationClosesAt='2020-01-01T12:00:00.000Z';return registrationClosed()"),true);
 assert.equal(run("data.settings.registrationClosesAt='2090-01-01T12:00:00.000Z';data.settings.status='Inschrijving gesloten';return registrationClosed()"),true);
});

test('Na een reset of archivering opent direct de instelpagina van de nieuwe editie',()=>{
 emptyEvent();
 const source=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 const block=source.slice(source.indexOf('async function refreshCurrentAfterLifecycle()'),
   source.indexOf('async function resetCurrentTournament()'));
 assert.match(block,/tab=isAdmin\?'beheer-instellingen':'overzicht'/);
});
