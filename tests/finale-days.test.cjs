'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const app=html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
assert.ok(app,'Het OHC-app-script bestaat');
const ctx=vm.createContext({
 console,Date,Math,Intl,structuredClone,
 location:{hash:''},window:{},document:{getElementById(){return null}},
 addEventListener(){},setTimeout(){},clearTimeout(){}
});
vm.runInContext(app.replace(/\ninitialize\(\);\s*$/,''),ctx,{filename:'index.inline.js'});
const run=s=>vm.runInContext('(()=>{'+s+'})()',ctx);
function seed(){
 run("data=structuredClone(DEFAULT);"+
  "data.players=['Anna','Bram','Cato','Daan'].map((name,i)=>({id:String(i),name,blocked:[]}));"+
  "data.draw=['0','1','2','3'];"+
  "data.settings.roundWindows=["+
  "{weeks:'01',start:'2027-01-01',end:'2027-01-03',exclusions:[],label:'1 t/m 3 januari 2027'},"+
  "{weeks:'02/03',start:'2027-01-04',end:'2027-01-17',exclusions:[],label:'4 t/m 17 januari 2027'}"+
  "];");
}
function pair(){
 return run("const m=finalPairMatches();return {main:data.schedule[m[0].id],bronze:data.schedule[m[1].id],"+
  "days:Math.abs(dateDifference(data.schedule[m[0].id].date,data.schedule[m[1].id].date))};");
}

test('Finale en bronsfinale worden op dezelfde datum gepland als iedereen kan',()=>{
 seed();
 const p=run("return autoPlanMatches(false)");
 assert.equal(p.conflicts.length,0);
 const dates=pair();
 assert.equal(dates.days,0);
 assert.ok(dates.main.date>='2027-01-04');
 assert.ok(dates.main.date<='2027-01-17');
 assert.match(run("return finalDaysNotice()"),/Dezelfde speeldag/);
});
test('Wanneer gedeelde beschikbaarheid ontbreekt, volgen twee aangrenzende dagen',()=>{
 seed();
 run("data.players[0].blocked=[0,1,2,3,4,5];"+
 "data.players[2].blocked=[0,1,2,3,4,5];"+
 "data.players[1].blocked=[1,2,3,4,5,6];"+
 "data.players[3].blocked=[1,2,3,4,5,6];"+
 "data.results={'0:0':'0','0:1':'2'};"+
 "data.schedule={"+
 " '0:0':{date:'2027-01-02',time:'20:00',provisional:false,mutualAgreement:true,agreedPlayers:['0','1']},"+
 " '0:1':{date:'2027-01-02',time:'20:00',provisional:false,mutualAgreement:true,agreedPlayers:['2','3']}"+
 "};");
 const planned=run("return autoPlanMatches(false)");
 assert.equal(planned.conflicts.length,0);
 const dates=pair();
 assert.equal(dates.main.date,'2027-01-09');
 assert.equal(dates.bronze.date,'2027-01-10');
 assert.equal(dates.days,1);
 assert.match(run("return finalDaysNotice()"),/Twee opeenvolgende dagen/);
});
test('Een bevestigde finaledatum blijft staan en stuurt de andere finaledag',()=>{
 seed();
 run("data.schedule={'1:0':{date:'2027-01-09',time:'21:30',provisional:false}};");
 const planned=run("return autoPlanMatches(false)");
 assert.equal(planned.conflicts.length,0);
 const dates=pair();
 assert.equal(dates.main.date,'2027-01-09');
 assert.equal(dates.main.time,'21:30');
 assert.equal(dates.bronze.date,'2027-01-09');
});
test('Twee bevestigde finaledatums worden nooit stilzwijgend overschreven',()=>{
 seed();
 run("data.schedule={"+
 " '1:0':{date:'2027-01-09',time:'20:00',provisional:false},"+
 " '1:1':{date:'2027-01-16',time:'20:00',provisional:false}"+
 "};");
 const result=run("return autoPlanMatches(false)");
 assert.equal(result.conflicts.length,0);
 const dates=pair();
 assert.equal(dates.main.date,'2027-01-09');
 assert.equal(dates.bronze.date,'2027-01-16');
 assert.equal(dates.days,7);
 assert.match(run("return finalDaysNotice()"),/7 dagen uit elkaar/);
 assert.match(run("return finalDaysNotice()"),/niet automatisch verplaatst/);
});
test('De keuze respecteert uitgesloten datums en de vaste volgorde van rondes',()=>{
 seed();
 run("data.settings.roundWindows[1].exclusions=['2027-01-09','2027-01-10'];");
 const planned=run("return autoPlanMatches(false)");
 assert.equal(planned.conflicts.length,0);
 const dates=pair();
 assert.equal(dates.days,0);
 assert.notEqual(dates.main.date,'2027-01-09');
 assert.notEqual(dates.main.date,'2027-01-10');
 const first=run("return lastRoundDate(0,data.schedule)");
 assert.ok(dates.main.date>first);
});
test('Het speelschema en beheer tonen het advies over de finaledagen',()=>{
 seed();
 run("autoPlanMatches(false)");
 const schedule=run("return scheduleView()");
 const admin=run("return adminScheduleView()");
 assert.match(schedule,/Finaledagen/);
 assert.match(admin,/Finaledagen/);
});
