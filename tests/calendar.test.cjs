'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const calendar=fs.readFileSync(path.join(root,'calendar.js'),'utf8');
const sharing=fs.readFileSync(path.join(root,'share.js'),'utf8');
const inline=html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
assert.ok(inline,'Het OHC-app-script is aanwezig');
const tags=[...html.matchAll(/<script[^>]*>/g)].map(x=>x[0]);
assert.ok(tags.findIndex(x=>x.includes('calendar.js'))<tags.findIndex(x=>x.includes('share.js')));
assert.ok(tags.findIndex(x=>x.includes('share.js'))<tags.findIndex(x=>x==='<script>'));

let drawn=[];
const ctx=()=>({
 fillStyle:'',strokeStyle:'',font:'',lineWidth:1,textAlign:'',
 fillRect(){},beginPath(){},moveTo(){},arcTo(){},closePath(){},fill(){},stroke(){},
 createRadialGradient(){return {addColorStop(){}}},
 createLinearGradient(){return {addColorStop(){}}},
 drawImage(){},scale(){},save(){},restore(){},
 measureText(v){return {width:String(v).length*12}},
 fillText(v){drawn.push(String(v))}
});
const context=vm.createContext({
 console,Date,Math,Intl,structuredClone,
 location:{hash:''},window:{},
 addEventListener(){},setTimeout(){},clearTimeout(){},
 document:{getElementById(){return null},createElement(name){
  if(name==='canvas')return {width:0,height:0,getContext:ctx};
  return {};
 }}
});
vm.runInContext(calendar,context,{filename:'calendar.js'});
vm.runInContext(sharing,context,{filename:'share.js'});
vm.runInContext(inline.replace(/\ninitialize\(\);\s*$/,''),context,{filename:'index.inline.js'});
const run=src=>vm.runInContext('(()=>{'+src+'})()',context);
function seed(){
 drawn=[];
 run("data=structuredClone(DEFAULT);authUser={id:'test'};isAdmin=true;archiveReadonly=false;"+
 "data.players=['Anna','Bram','Cato','Daan'].map((name,i)=>({id:String(i),name,blocked:[]}));"+
 "data.draw=['0','1','2','3'];"+
 "data.settings.roundWindows=structuredClone(LEGACY_ROUND_WINDOWS);"+
 "data.schedule={"+
 " '0:0':{date:'2026-12-31',time:'20:15',provisional:false},"+
 " '0:1':{date:'2026-12-31',time:'21:30',provisional:true},"+
 " '1:0':{date:'2027-01-04',time:'22:00',provisional:true}};"+
 "ohcCalendarMonth='';ohcCalendarSelectedDate='';ohcShareMonth='';");
}
test('Kalender heeft eigen beveiligde route en navigatie',()=>{
 seed();
 assert.match(html,/\['kalender','Kalender'\]/);
 assert.match(html,/kalender:typeof ohcCalendarView/);
 assert.match(calendar,/function openCalendarShare\(/);
});
test('Kalender toont duels onder hun datum en juiste speeltijd',()=>{
 seed();
 const entries=run("return ohcCalendarEntries()");
 assert.equal(entries.length,3);
 assert.equal(entries[0].date,'2026-12-31');
 assert.equal(entries[0].time,'20:15');
 assert.equal(entries[1].time,'21:30');
 assert.equal(entries[2].date,'2027-01-04');
 const markup=run("ohcCalendarMonth='2026-12';return ohcCalendarView()");
 assert.match(markup,/Anna/);
 assert.match(markup,/Bram/);
 assert.match(markup,/20:15/);
 assert.match(markup,/21:30/);
 assert.match(markup,/Voorlopig/);
 assert.match(markup,/2 duels/);
 assert.match(markup,/ohcCalendarSelectDate/);
});
test('Maandovergang rekent juiste weekvolgorde uit en sluit andere maand uit',()=>{
 seed();
 const days=run("return ohcCalendarMonthDates('2027-01')");
 assert.equal(days.length%7,0);
 assert.equal(days[0].iso,'2026-12-28');
 assert.equal(days.find(x=>x.iso==='2027-01-04').day,4);
 assert.equal(run("return ohcCalendarMonthName('2027-01')"),'Januari 2027');
 assert.equal(run("return ohcCalendarMonthAgenda(ohcCalendarEntries(),'2026-12').includes('22:00')"),false);
});
test('Vrijlotingen en ongedateerde duels worden niet opgenomen',()=>{
 seed();
 run("delete data.schedule['0:1'];");
 const entries=run("return ohcCalendarEntries()");
 assert.equal(entries.length,2);
 assert.ok(!entries.some(e=>e.id==='0:1'));
});
test('Maandkalender wordt opgemaakt als volledige, deelbare poster',()=>{
 seed();
 const output=run("ohcShareType='kalender';ohcShareMonth='2026-12';"+
  "const info=shareActiveInfo();const canvas=buildOhcSharePoster(info,null);"+
  "return {type:info.type,label:info.label,count:info.entries.length,width:canvas.width,height:canvas.height,file:shareFileLabel(info)}");
 assert.equal(output.count,2);
 assert.equal(output.type,'kalender');
 assert.equal(output.label,'December 2026');
 assert.equal(output.width,2160);
 assert.ok(output.height>=2880);
 assert.match(output.file,/kalender-2026-12\.png$/);
 assert.ok(drawn.includes('20:15'),'echte speeltijd ontbreekt');
 assert.ok(drawn.includes('21:30'),'tweede speeltijd ontbreekt');
 assert.ok(drawn.some(x=>x.includes('Anna')),'spelersnaam ontbreekt');
});
test('Volledige kalender bevat alle datums, duels en tijden',()=>{
 seed();
 const info=run("ohcShareType='kalender-volledig';return shareActiveInfo()");
 assert.equal(info.entries.length,3);
 const canvas=run("return buildOhcSharePoster(shareActiveInfo(),null)");
 assert.equal(canvas.width,1080);
 assert.ok(drawn.some(x=>x.includes('dec 2026')));
 assert.ok(drawn.some(x=>x.includes('jan 2027')));
 assert.ok(drawn.includes('22:00'));
 assert.ok(drawn.some(x=>/finale/i.test(x))||drawn.some(x=>x.includes('Ronde 2')));
});
test('Op een toekomstige nieuwe editie zonder loting zijn er geen fictieve duels',()=>{
 seed();
 run("data.draw=[];data.schedule={};");
 const markup=run("return ohcCalendarView()");
 assert.match(markup,/0 ingeplande duels/);
 assert.match(markup,/Geen wedstrijden in deze maand/);
 assert.equal(run("return shareActiveInfo()===null"),true);
});
test('Gearchiveerde kalender toont geen deelknoppen',()=>{
 seed();
 const markup=run("archiveReadonly=true;return ohcCalendarView()");
 assert.doesNotMatch(markup,/openCalendarShare/);
 assert.match(markup,/Anna/);
});
