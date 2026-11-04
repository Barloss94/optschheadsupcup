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

let drawn=[],gradients=[];
const makeGradient=()=>{
 const stops=[];gradients.push(stops);
 return {addColorStop(position,color){stops.push({position,color})}};
};
const makeContext=()=>({
 fillStyle:'',strokeStyle:'',lineWidth:1,font:'',textAlign:'',textBaseline:'',
 fillRect(){},beginPath(){},moveTo(){},lineTo(){},arcTo(){},closePath(){},fill(){},stroke(){},
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
 drawn=[];gradients=[];
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

test('De volledige toernooiboom staat als afzonderlijke deeloptie op de website',()=>{
 seed();
 const markup=run("ohcShareType='boom';return shareView()");
 assert.match(markup,/Volledige toernooiboom/);
 assert.match(markup,/LIGGEND/);
 assert.match(markup,/bracket-poster-preview/);
 assert.match(markup,/Download als PNG/);
 assert.match(markup,/Deel afbeelding/);
 assert.doesNotMatch(markup,/id="ohcShareRound"/);
 assert.match(html,/openShare\('boom'\)/);
 assert.match(html,/function exportBracketPng\(\)\{if\(!authUser\|\|archiveReadonly\)return;openShare\('boom'\)\}/);
});
test('Een bracket van 32 spelers bevat alle 5 rondes en 16 openingsduels op één PNG',()=>{
 seed(32);
 const result=run("ohcShareType='boom';const info=shareActiveInfo();"+
  "const canvas=buildOhcSharePoster(info,null);const g=bracketPosterGeometry(info.rounds);"+
  "return {rounds:info.rounds.length,openings:info.rounds[0].length,"+
  "width:canvas.width,height:canvas.height,geometry:g,filename:shareFileLabel(info)}");
 assert.equal(result.rounds,5);
 assert.equal(result.openings,16);
 assert.ok(result.width>=3400&&result.width<=4300);
 assert.ok(result.height>=1500);
 assert.match(result.filename,/toernooiboom\.png$/);
 for(let n=1;n<=16;n++)
  assert.ok(drawn.includes('DUEL '+n),'Duel '+n+' ontbreekt in de export');
 assert.ok(drawn.some(t=>t.includes('Deelnemer 1 Achternaam')));
 assert.ok(drawn.some(t=>t.includes('Deelnemer 32 Achternaam')));
 assert.ok(drawn.includes('TOERNOOIBOOM')||drawn.includes('VOLLEDIGE TOERNOOIBOOM'));
 assert.ok(drawn.includes('BRONSFINALE'),'Bronsfinale ontbreekt');
 assert.ok(drawn.includes('FINALE'),'Finale ontbreekt');
});
test('De bracketconnectoren koppelen werkelijk op basis van vaste matchroutes',()=>{
 seed(32);
 const boxes=run("const rounds=bracket(),g=bracketPosterGeometry(rounds);"+
  "return {semis:g.centers[3],champ:g.centers[4][0],bronze:g.centers[4][1],"+
  "first:g.centers[0],c0:g.centers[1][0]};");
 assert.ok(boxes.first.length===16);
 assert.ok(boxes.semis.length===2);
 assert.ok(Math.abs(boxes.champ-(boxes.semis[0]+boxes.semis[1])/2)<.01);
 assert.ok(boxes.bronze>boxes.champ);
 assert.ok(Math.abs(boxes.c0-(boxes.first[0]+boxes.first[1])/2)<.01);
});
test('Zonder loting is de complete bracketexport uitgeschakeld',()=>{
 seed(0);
 const result=run("ohcShareType='boom';return {info:shareActiveInfo(),markup:shareView()};");
 assert.equal(result.info,null);
 assert.match(result.markup,/disabled/);
 assert.match(result.markup,/Er zijn nog geen gegevens/);
});
test('Deelbare boom behoudt de zichtbare chronologische duelnummering',()=>{
 seed(4);
 run("data.schedule={'0:0':{date:'2026-12-04',time:'20:00'},"+
  "'0:1':{date:'2026-12-01',time:'20:00'}};ohcShareType='boom';"+
  "buildOhcSharePoster(shareActiveInfo(),null)");
 assert.ok(drawn.includes('DUEL 1'));
 assert.ok(drawn.includes('DUEL 2'));
 assert.ok(drawn.some(t=>t==='Deelnemer 1 Achternaam'));
});

test('Spiegelbeeld: finalekaart in middelste kolom en bronsfinale direct eronder',()=>{
 seed(32);
 const g=run("return bracketMirrorLayout(bracket())");
 assert.equal(g.columns,9);
 assert.equal(g.centerColumn,4);
 assert.equal(g.positions[4][0].column,4);
 assert.equal(g.positions[4][1].column,4);
 assert.ok(g.positions[4][1].cy>g.positions[4][0].cy+g.cardHeight);
 assert.equal(g.positions[3][0].column,3);
 assert.equal(g.positions[3][1].column,5);
 assert.equal(g.positions[0][0].column,0);
 assert.equal(g.positions[0][8].column,8);
 assert.equal(g.positions[0][0].cy,g.positions[0][8].cy);
 assert.equal(g.positions[3][0].cy,g.positions[4][0].cy);
 assert.equal(g.positions[3][1].cy,g.positions[4][0].cy);
 const p=run("return bracketPosterGeometry(bracket())");
 assert.equal(p.layout.centerColumn,4);
 assert.equal(p.layout.positions[4][0].column,4);
 assert.equal(p.layout.positions[4][1].column,4);
 assert.equal(p.layout.positions[3][0].column,3);
 assert.equal(p.layout.positions[3][1].column,5);
});
test('Gespiegelde boom toont alle bracketduels precies eenmaal en behoudt de vaste matches',()=>{
 seed(32);
 const markup=run("return bracketView()");
 const cards=[...markup.matchAll(/data-duel="([0-9]+:[0-9]+)"/g)].map(x=>x[1]);
 const unique=new Set(cards);
 assert.equal(cards.length,32);
 assert.equal(unique.size,cards.length);
 assert.equal((markup.match(/class="bracketcolumn mirrored-column/g)||[]).length,9);
 assert.equal((markup.match(/mirrored-column center/g)||[]).length,1);
 assert.match(markup,/Finale en bronsfinale/);
 assert.match(markup,/class="matchcard final-match"/);
 assert.match(markup,/class="matchcard bronze-match"/);
 assert.match(markup,/ohcBracketScroll/);
 assert.match(html,/function centerBracketOnFinal\(\)/);
 assert.match(html,/requestAnimationFrame\(\(\)=>\{drawBracketConnections\(\);centerBracketOnFinal\(\)\}\)/);
});
test('Ook bij vier spelers blijven beide finales midden tussen de twee halve finales',()=>{
 seed(4);
 const g=run("return bracketMirrorLayout(bracket())");
 assert.equal(g.columns,3);
 assert.equal(g.centerColumn,1);
 assert.equal(g.positions[0][0].column,0);
 assert.equal(g.positions[0][1].column,2);
 assert.equal(g.positions[1][0].column,1);
 assert.equal(g.positions[1][1].column,1);
 assert.ok(g.positions[1][1].cy>g.positions[1][0].cy);
});

test('De website en alle deelbare posters gebruiken dezelfde nieuwe slagzin',()=>{
 const slogan='Duelleer. Overwin & Pak die titel!';
 assert.ok(html.includes('Duelleer. Overwin &amp; Pak die titel!'));
 assert.equal(sharing.split(slogan).length-1,2);
 assert.doesNotMatch(sharing,/WIN JE DUEL\. GA DOOR\. PAK DE TITEL\.|IEDERE WINNAAR EEN STAP DICHTER BIJ DE TITEL/);
});


test('Finale- en bronsfinalekoppen hebben het gevraagde kleurverloop in website en PNG',()=>{
 const css=fs.readFileSync(path.join(__dirname,'..','layout.css'),'utf8');
 assert.match(css,/\.mirrored-bracket \.matchcard\.final-match \.matchid\{\s*background:linear-gradient\(105deg,#e7b45f 0%,#dcbf87 43%,#c3cbd8 100%\)/);
 assert.match(css,/\.mirrored-bracket \.matchcard\.bronze-match \.matchid\{\s*background:linear-gradient\(105deg,#986037 0%,#785039 43%,#493449 100%\)/);
 assert.match(css,/\.mirrored-bracket \.matchcard \.matchid\{[^}]*background:#493449/);
 seed(32);
 const page=run("return bracketView()");
 assert.match(page,/class="matchcard final-match"/);
 assert.match(page,/class="matchcard bronze-match"/);
 run("ohcShareType='boom';buildOhcSharePoster(shareActiveInfo(),null)");
 const gold=gradients.find(stops=>stops[0]?.color==='#e7b45f');
 const bronze=gradients.find(stops=>stops[0]?.color==='#986037');
 assert.ok(gold,'Goud-naar-zilververloop ontbreekt in de PNG');
 assert.ok(bronze,'Brons-naar-standaardverloop ontbreekt in de PNG');
 assert.deepEqual(gold.map(s=>s.color),['#e7b45f','#dcbf87','#c3cbd8']);
 assert.deepEqual(bronze.map(s=>s.color),['#986037','#785039','#493449']);
});
