'use strict';

/* OHC share posters — same core workflow as OSC:
   choose an export type and round, preview a complete portrait PNG,
   download it or hand the image to the device share sheet. */
const OHC_SHARE_TYPES={
 boom:{label:'Volledig toernooischema',title:'TOERNOOISCHEMA'},
 loting:{label:'Ronde-indeling / loting',title:'LOTING'},
 schema:{label:'Speelschema',title:'SPEELSCHEMA'},
 uitslagen:{label:'Uitslagen',title:'UITSLAGEN'},
 deelnemers:{label:'Deelnemersoverzicht',title:'DEELNEMERS'},
 prijzen:{label:'Prijzen en buy-in',title:'PRIJZENPOT'},
 kalender:{label:'Speelkalender per maand',title:'SPEELKALENDER'},
 'kalender-volledig':{label:'Volledige speelagenda',title:'COMPLETE SPEELKALENDER'}
};
const OHC_SHARE_COLORS={
 bg:'#0d0d17',panel:'#171521',inner:'#24202e',gold:'#e4b76f',
 lightGold:'#fff1c8',muted:'#bdb4c8',white:'#ffffff',
 green:'#3de3a3',purple:'#b68bff',line:'#6e516f',
 pale:'#e1d9e6',warning:'#f6c47a'
};
const OHC_SHARE_W=1080;
const OHC_SHARE_SCALE=2;
let ohcShareType='loting',ohcShareRound=0,ohcShareBusy=false,ohcShareMonth='';
let ohcShareImage=null,ohcSharePoster=null,ohcShareRenderId=0;
let ohcSharePosterKey='';

function openShare(type='loting',round=null){
 if(!authUser)return;
 if(OHC_SHARE_TYPES[type])ohcShareType=type;
 if(round!==null&&Number.isInteger(Number(round)))ohcShareRound=Math.max(0,Number(round));
 setTab('delen');
}
function shareView(){
 const rounds=bracket().length;
 const roundTypes=['loting','schema','uitslagen'].includes(ohcShareType);
 const calendarTypes=ohcShareType==='kalender'||ohcShareType==='kalender-volledig';
 const calendarEntries=calendarTypes?ohcCalendarEntries():[];
 const calendarMonths=[...new Set(calendarEntries.map(e=>e.date.slice(0,7)))];
 const selectedMonth=calendarMonths.includes(ohcShareMonth)?ohcShareMonth:
  (calendarMonths.includes(ohcCalendarMonth)?ohcCalendarMonth:calendarMonths[0]||'');
 const haveData=(ohcShareType==='boom'||roundTypes)?rounds>0:calendarTypes?
  (ohcShareType==='kalender'?calendarEntries.some(e=>e.date.startsWith(selectedMonth)):calendarEntries.length>0):
  ohcShareType==='deelnemers'?data.players.length>0:true;
 const value=rounds?Math.min(ohcShareRound,rounds-1):0;
 const opts=Object.entries(OHC_SHARE_TYPES).map(([k,v])=>
  '<option value="'+k+'"'+(ohcShareType===k?' selected':'')+'>'+esc(v.label)+'</option>').join('');
 return '<section class="panel share-panel"><div class="sectiontitle"><h2>Deelbare OHC-afbeeldingen</h2>'+
  '<span class="pill ok">PNG • WhatsApp-formaat</span></div>'+
  '<p class="panel-intro">Net als in de OSC maak je hier een verzorgde afbeelding met het officiële OHC-logo en alle informatie. Kies het soort overzicht en eventueel de ronde of maand; de export wordt één complete poster.</p>'+
  '<div class="formgrid share-controls"><div class="field"><label for="ohcShareType">Soort afbeelding</label>'+
  '<select id="ohcShareType" onchange="changeShareType(this.value)">'+opts+'</select></div>'+
  (roundTypes?'<div class="field"><label for="ohcShareRound">Toernooironde</label>'+
   '<select id="ohcShareRound" onchange="changeShareRound(this.value)" '+(!rounds?'disabled':'')+'>'+
   (rounds?Array.from({length:rounds},(_,r)=>
    '<option value="'+r+'"'+(r===value?' selected':'')+'>'+esc(roundLabel(r,rounds))+'</option>').join(''):'<option>Na de loting beschikbaar</option>')+'</select></div>':
   ohcShareType==='kalender'?'<div class="field"><label for="ohcShareMonth">Speelmaand</label>'+
    '<select id="ohcShareMonth" onchange="changeShareMonth(this.value)" '+(!calendarMonths.length?'disabled':'')+'>'+
    (calendarMonths.length?calendarMonths.map(m=>'<option value="'+m+'"'+(m===selectedMonth?' selected':'')+'>'+
      esc(ohcCalendarMonthName(m))+'</option>').join(''):'<option>Geen geplande duels</option>')+
    '</select></div>':
   '<div class="field"><label>Weergave</label><div class="share-selection-note">'+
    (ohcShareType==='boom'?'Alle rondes en doorgangen in één liggende afbeelding':
     ohcShareType==='kalender-volledig'?'Alle geplande datums met duels, op één afbeelding':
     'De volledige editie op één afbeelding')+'</div></div>')+
  '</div>'+
  (!haveData?'<div class="notice orange">Er zijn nog geen gegevens om dit overzicht te delen. Voer eerst de loting uit of voeg deelnemers toe.</div>':'')+
  '<div class="btnbar share-actions">'+
  '<button type="button" class="btn" onclick="downloadSharePoster()" '+(!haveData?'disabled':'')+'>📸 Download als PNG</button>'+
  '<button type="button" class="btn alt" onclick="sharePosterNative()" '+(!haveData?'disabled':'')+'>Deel afbeelding (WhatsApp e.a.)</button>'+
  '</div>'+
  '<p class="muted smalltext share-advice">'+(ohcShareType==='boom'?'Het complete toernooischema is een liggende afbeelding. Op je telefoon kun je horizontaal door het voorbeeld scrollen. ':'')+'De afbeelding bevat volledige spelersnamen. Deel deze alleen in groepen waarvoor de informatie bedoeld is. Op een telefoon kun je WhatsApp kiezen vanuit het deelmenu; op andere apparaten kun je het PNG-bestand versturen.</p>'+
  '<div class="share-preview-section"><div class="share-preview-head"><h3>Voorbeeld</h3><span class="tag">'+(ohcShareType==='boom'?'LIGGEND • HOGE RESOLUTIE':'1080 PX • HOGE RESOLUTIE')+'</span></div>'+
  '<div class="share-poster-preview'+(ohcShareType==='boom'?' bracket-poster-preview':'')+'" id="ohcSharePosterContainer">'+
  (haveData?'<canvas id="ohcSharePreview" aria-label="Voorbeeld van deelbare OHC-poster" role="img"></canvas>':
   '<div class="empty"><div class="bigicon">♠</div><strong>Nog geen voorbeeld beschikbaar</strong></div>')+'</div>'+
  '<div id="ohcShareStatus" class="smalltext muted" aria-live="polite"></div></div></section>';
}
function changeShareType(type){
 if(!OHC_SHARE_TYPES[type])return;
 ohcShareType=type;ohcSharePoster=null;ohcSharePosterKey='';
 render();
}
function changeShareRound(index){
 const count=bracket().length;
 const r=Number(index);
 if(!Number.isInteger(r)||r<0||r>=count)return;
 ohcShareRound=r;ohcSharePoster=null;ohcSharePosterKey='';
 render();
}
function shareActiveInfo(){
 const type=ohcShareType,rounds=bracket();
 if(type==='boom')return rounds.length?{type,round:null,matches:[],rounds,label:'Volledig toernooischema'}:null;
 if(['loting','schema','uitslagen'].includes(type)){
  if(!rounds.length)return null;
  const round=Math.min(Math.max(0,ohcShareRound),rounds.length-1);
  return {type,round,matches:rounds[round],label:roundLabel(round,rounds.length)};
 }
 if(type==='deelnemers'){
  if(!data.players.length)return null;
  return {type,matches:[],round:null,label:'Deelnemersoverzicht'};
 }
 if(type==='prijzen')return {type,matches:[],round:null,label:'Buy-in en prijzenpot'};
 if(type==='kalender'||type==='kalender-volledig'){
  const all=ohcCalendarEntries();
  if(!all.length)return null;
  if(type==='kalender-volledig')return {
   type,round:null,matches:[],entries:all,month:null,label:'Alle speeldata'
  };
  const months=[...new Set(all.map(e=>e.date.slice(0,7)))];
  const month=months.includes(ohcShareMonth)?ohcShareMonth:
   months.includes(ohcCalendarMonth)?ohcCalendarMonth:months[0];
  return {type,round:null,matches:[],month,
   entries:all.filter(e=>e.date.startsWith(month)),label:ohcCalendarMonthName(month)};
 }
 return null;
}
function changeShareMonth(month){
 if(!ohcCalendarValidMonth(month))return;
 if(!ohcCalendarEntries().some(e=>e.date.startsWith(month)))return;
 ohcShareMonth=month;ohcSharePoster=null;ohcSharePosterKey='';
 render();
}
function shareStatus(text){
 const el=document.getElementById('ohcShareStatus');
 if(el)el.textContent=text;
}
function shareFileLabel(info){
 const prefix=(data.settings?.title||'OHC').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,35)||'ohc';
 return prefix+'-'+(info.type==='boom'?'toernooischema':info.type)+(info.round===null?'':'-ronde-'+(info.round+1))+(info.month?'-'+info.month:'')+'.png';
}
function shareContextKey(info){
 return JSON.stringify({type:info.type,round:info.round,month:info.month||null,
  players:data.players,draw:data.draw,results:data.results,
  schedule:data.schedule,settings:data.settings});
}
async function getOhcShareLogo(){
 if(ohcShareImage)return ohcShareImage;
 if(!getOhcShareLogo.pending){
  getOhcShareLogo.pending=new Promise(resolve=>{
   const image=new Image();
   image.onload=()=>{ohcShareImage=image;resolve(image)};
   image.onerror=()=>resolve(null);
   image.src='./assets/ohc-logo.avif';
  });
 }
 return getOhcShareLogo.pending;
}
function shareRoundedRect(ctx,x,y,w,h,r){
 const rr=Math.min(r,w/2,h/2);
 ctx.beginPath();ctx.moveTo(x+rr,y);
 ctx.arcTo(x+w,y,x+w,y+h,rr);
 ctx.arcTo(x+w,y+h,x,y+h,rr);
 ctx.arcTo(x,y+h,x,y,rr);
 ctx.arcTo(x,y,x+w,y,rr);
 ctx.closePath();
}
function shareFillRound(ctx,x,y,w,h,r,fill,stroke=null,width=1){
 shareRoundedRect(ctx,x,y,w,h,r);
 ctx.fillStyle=fill;ctx.fill();
 if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}
}
function shareFit(ctx,text,maxWidth,maxChars=70){
 let s=String(text??'').slice(0,maxChars);
 if(ctx.measureText(s).width<=maxWidth)return s;
 while(s.length>2&&ctx.measureText(s+'…').width>maxWidth)s=s.slice(0,-1);
 return s+'…';
}
function shareText(ctx,text,x,y,maxWidth,color,size=28,weight=700,align='left',maxChars=70){
 ctx.save();ctx.fillStyle=color;ctx.font=weight+' '+size+'px Arial, sans-serif';
 ctx.textAlign=align;ctx.textBaseline='alphabetic';
 ctx.fillText(shareFit(ctx,text,maxWidth,maxChars),x,y);
 ctx.restore();
}
function shareBase(ctx,height,logo,info,itemsCount){
 const C=OHC_SHARE_COLORS,w=OHC_SHARE_W;
 ctx.fillStyle=C.bg;ctx.fillRect(0,0,w,height);
 const emerald=ctx.createRadialGradient(75,0,25,120,230,650);
 emerald.addColorStop(0,'rgba(35,154,110,0.31)');emerald.addColorStop(1,'rgba(35,154,110,0)');
 ctx.fillStyle=emerald;ctx.fillRect(0,0,w,800);
 const violet=ctx.createRadialGradient(w,height-150,40,w-100,height-280,720);
 violet.addColorStop(0,'rgba(142,74,204,0.28)');violet.addColorStop(1,'rgba(142,74,204,0)');
 ctx.fillStyle=violet;ctx.fillRect(0,height-950,w,950);
 shareRoundedRect(ctx,42,38,w-84,height-76,34);
 ctx.fillStyle='rgba(8,10,17,.81)';ctx.fill();
 ctx.strokeStyle=C.gold;ctx.lineWidth=5;ctx.stroke();
 shareRoundedRect(ctx,51,47,w-102,height-94,28);
 ctx.strokeStyle='rgba(182,139,255,.43)';ctx.lineWidth=3;ctx.stroke();
 if(logo){
  ctx.globalAlpha=.038;
  const side=720;ctx.drawImage(logo,w-680,height-820,side,side);
  ctx.globalAlpha=1;
  ctx.drawImage(logo,75,77,170,170);
 }
 shareText(ctx,'OPTSCH HEADS-UP CUP',285,110,715,C.gold,29,900);
 const tag=OHC_SHARE_TYPES[info.type]?.title||'OVERZICHT';
 const label=info.round!==null?'RONDE '+(info.round+1)+' · '+tag:tag;
 shareText(ctx,label,285,168,720,C.white,45,900);
 shareText(ctx,info.round!==null?info.label:info.label,285,207,715,C.purple,23,750);
 const subtitle=info.round!==null?
  ((getRoundWindows()[info.round]?.label||'')+' · '+itemsCount+' duels'):
  ['kalender','kalender-volledig'].includes(info.type)?
   itemsCount+' duels op '+new Set(info.entries.map(e=>e.date)).size+' speeldagen':
   info.type==='deelnemers'?itemsCount+' ingeschreven spelers':'Prijzen en uitbetalingen';
 shareText(ctx,subtitle,84,274,912,C.pale,25,650);
 ctx.fillStyle='rgba(236,192,128,.5)';ctx.fillRect(84,304,912,2);
 ctx.fillStyle='rgba(236,192,128,.4)';ctx.fillRect(84,height-142,912,2);
 shareText(ctx,'Duelleer. Overwin & Pak die titel!',w/2,height-91,840,C.lightGold,23,850,'center');
 shareText(ctx,'OPTSCH • HEADS-UP CUP',w/2,height-63,700,C.purple,16,800,'center');
}
function shareCard(ctx,m,info,x,y,w,h){
 const C=OHC_SHARE_COLORS;
 shareFillRound(ctx,x,y,w,h,20,'rgba(32,27,41,.96)','rgba(166,120,188,.55)',2);
 const ribbon=ctx.createLinearGradient(x,y,x+w,y);
 ribbon.addColorStop(0,'#f2ca84');ribbon.addColorStop(1,'#bf8352');
 shareFillRound(ctx,x+13,y+12,w-26,44,12,ribbon);
 const label=displayDuelLabel(m).toUpperCase();
 shareText(ctx,label,x+30,y+43,w-58,'#1b1423',22,950);
 const a=m.a?name(m.a):bracketSlotText(info.round,m.index,0,m.a);
 const b=m.b?name(m.b):m.isBye?'Vrijloting':bracketSlotText(info.round,m.index,1,m.b);
 const xname=x+27;
 const nameWidth=w-52;
 const result=info.type==='uitslagen',win=m.winner;
 const colorA=result&&win&&m.a===win?C.green:C.white;
 const colorB=result&&win&&m.b===win?C.green:m.isBye?C.muted:C.white;
 shareText(ctx,a,xname,y+99,nameWidth,colorA,24,850);
 shareText(ctx,b,xname,y+137,nameWidth,colorB,24,850);
 ctx.fillStyle='rgba(189,172,197,.25)';ctx.fillRect(x+25,y+151,w-50,1);
 let detail='',score='';
 const scheduled=data.schedule[m.id];
 if(result){
  if(m.isBye)detail='AUTOMATISCH DOOR';
  else if(m.winner){
   score=String(data.settings?.resultText?.[m.id]||'').slice(0,20);
   detail='WINNAAR: '+name(m.winner);
  }else detail='NOG GEEN UITSLAG';
 }else if(scheduled?.date){
  detail=prettyDate(scheduled.date)+' · '+(scheduled.time||DEFAULT_MATCH_TIME)+' uur';
  if(scheduled.provisional)detail+=' • VOORLOPIG';
 }else detail=m.isBye?'VRIJLOTING':'DATUM VOLGT';
 shareText(ctx,detail,x+27,y+h-26,nameWidth-(score?92:0),
   (result&&m.winner)?C.green:C.warning,17,800);
 if(score)shareText(ctx,score,x+w-25,y+h-26,88,C.lightGold,19,900,'right');
}
function shareCardPosters(ctx,info){
 const items=sortedRoundMatches(info.round);
 const columns=items.length===1?1:2;
 const gap=18,origin=86,available=908,cardW=(available-gap*(columns-1))/columns,cardH=210,rowGap=19;
 for(let i=0;i<items.length;i++){
  const col=i%columns,row=Math.floor(i/columns);
  const x=origin+col*(cardW+gap),y=339+row*(cardH+rowGap);
  shareCard(ctx,items[i],info,x,y,cardW,cardH);
 }
}
function sharePlayersPoster(ctx,info){
 const roster=[...data.players].sort((a,b)=>a.name.localeCompare(b.name,'nl'));
 const cols=roster.length>1?2:1,gap=22,cardW=cols===2?440:908;
 roster.forEach((p,i)=>{
  const col=i%cols,row=Math.floor(i/cols),x=86+col*(cardW+gap),y=345+row*64;
  shareFillRound(ctx,x,y,cardW,54,10,'rgba(34,29,42,.95)','rgba(131,97,144,.45)',1);
  shareText(ctx,String(data.players.findIndex(x=>x.id===p.id)+1).padStart(2,'0'),x+15,y+36,53,OHC_SHARE_COLORS.gold,22,900);
  shareText(ctx,p.name,x+70,y+36,cardW-85,OHC_SHARE_COLORS.white,23,750);
 });
}
function sharePrizesPoster(ctx){
 const C=OHC_SHARE_COLORS;
 const count=data.players.length,exact=count>=17&&count<=32;
 const info=projectedPrizes(exact?count:32);
 const names=['1E PRIJS','2E PRIJS','3E PRIJS','4E PRIJS',
  'GEDEELD 5E','GEDEELD 5E','GEDEELD 5E','GEDEELD 5E'];
 shareFillRound(ctx,86,343,908,135,17,'rgba(38,30,38,.94)','rgba(222,174,104,.6)',2);
 shareText(ctx,exact?'VOORLOPIGE NETTO PRIJZENPOT':'REKENVOORBEELD • 32 SPELERS',113,387,855,C.muted,23,800);
 shareText(ctx,euros(info.netPrizeCents),113,452,855,C.lightGold,52,950);
 names.forEach((label,i)=>{
  const x=86+(i%2)*462,y=515+Math.floor(i/2)*165,w=446;
  shareFillRound(ctx,x,y,w,147,16,'rgba(37,30,46,.96)','rgba(150,103,169,.48)',2);
  shareText(ctx,label,x+21,y+41,w-40,C.purple,21,900);
  shareText(ctx,euros(info.payouts[i]),x+21,y+113,w-40,C.white,39,900);
 });
 shareText(ctx,'BUY-IN '+euros(BUY_IN_CENTS)+' • ORGANISATIEKOSTEN '+euros(FIXED_COSTS_CENTS),
  90,1255,890,C.muted,21,800);
 if(!exact)shareText(ctx,'Bij minder dan 17 spelers is deze verdeling nog niet vastgesteld.',
  90,1294,890,C.warning,18,700);
}

function shareCalendarGroupedDates(entries){
 const groups=[];
 for(const entry of entries){
  let group=groups[groups.length-1];
  if(!group||group.date!==entry.date){
   group={date:entry.date,matches:[]};
   groups.push(group);
  }
  group.matches.push(entry);
 }
 return groups;
}
function shareCalendarGridRows(month){
 return Math.ceil(ohcCalendarMonthDates(month).length/7);
}
function shareCalendarAgendaStart(info){
 if(info.type!=='kalender')return 347;
 return 403+shareCalendarGridRows(info.month)*102+63;
}
function shareCalendarPosterHeight(info){
 const groups=shareCalendarGroupedDates(info.entries).length;
 const start=shareCalendarAgendaStart(info);
 return Math.max(1440,start+groups*65+info.entries.length*120+220);
}
function shareCalendarGrid(ctx,info){
 const C=OHC_SHARE_COLORS,dates=ohcCalendarMonthDates(info.month);
 const groups=new Map();
 info.entries.forEach(e=>{
  if(!groups.has(e.date))groups.set(e.date,[]);
  groups.get(e.date).push(e);
 });
 const origin=86,gap=8,cellW=(908-gap*6)/7,cellH=93,rowH=102;
 const weekdays=['MA','DI','WO','DO','VR','ZA','ZO'];
 weekdays.forEach((day,i)=>
  shareText(ctx,day,origin+i*(cellW+gap)+cellW/2,365,cellW,C.muted,18,800,'center'));
 const top=390;
 dates.forEach((day,i)=>{
  const x=origin+(i%7)*(cellW+gap),y=top+Math.floor(i/7)*rowH;
  const matches=groups.get(day.iso)||[],isInMonth=day.iso.startsWith(info.month);
  const allPlayed=matches.length&&matches.every(m=>m.status==='Gespeeld');
  const fill=!isInMonth?'rgba(19,19,27,.58)':
    matches.length?'rgba(51,43,62,.98)':'rgba(28,26,37,.95)';
  shareFillRound(ctx,x,y,cellW,cellH,10,fill,
   matches.length?allPlayed?'#368455':'#d4a85e':'rgba(107,86,109,.45)',matches.length?2:1);
  shareText(ctx,String(day.day),x+10,y+29,cellW-20,
   isInMonth?C.white:C.muted,22,isInMonth?800:500);
  if(matches.length){
   shareText(ctx,String(matches.length)+(matches.length===1?' DUEL':' DUELS'),
    x+10,y+52,cellW-20,allPlayed?C.green:C.gold,15,850);
   shareText(ctx,matches.length===1?matches[0].time+' UUR':'BEKIJK LIJST',
    x+10,y+74,cellW-20,C.muted,11,650);
  }
 });
}
function shareCalendarAgenda(ctx,info){
 const C=OHC_SHARE_COLORS,groups=shareCalendarGroupedDates(info.entries);
 const x=86,w=908,headerH=45,cardH=110,gap=10;
 let y=shareCalendarAgendaStart(info);
 shareText(ctx,info.type==='kalender'?'WEDSTRIJDEN IN DEZE MAAND':'ALLE GEPLANDE DUELS',
  x,y-19,w,C.lightGold,25,900);
 for(const group of groups){
  shareFillRound(ctx,x,y,w,headerH,11,'rgba(100,72,49,.65)','rgba(224,178,105,.46)',1);
  shareText(ctx,prettyDate(group.date),x+18,y+31,w-180,C.lightGold,23,850);
  shareText(ctx,group.matches.length+(group.matches.length===1?' DUEL':' DUELS'),
   x+w-19,y+30,165,C.pale,16,800,'right');
  y+=headerH+10;
  for(const entry of group.matches){
   shareFillRound(ctx,x,y,w,cardH,12,'rgba(35,30,45,.95)','rgba(128,99,138,.58)',1.5);
   shareFillRound(ctx,x+12,y+11,130,87,10,'rgba(65,51,66,.86)');
   shareText(ctx,entry.time,x+77,y+51,117,C.lightGold,25,900,'center');
   shareText(ctx,'UUR',x+77,y+77,110,C.muted,14,800,'center');
   shareText(ctx,entry.left,x+159,y+35,w-192,C.white,25,800);
   shareText(ctx,'VS '+entry.right,x+159,y+67,w-192,C.white,25,800);
   const status=entry.status==='Gespeeld'?'GESPEELD':
     entry.provisional?'VOORLOPIG':entry.status.toUpperCase();
   shareText(ctx,ohcCalendarMatchLabel(entry)+'   •   '+status+
    (entry.score&&entry.winner?'   •   '+entry.score:''),
    x+159,y+96,w-196,entry.status==='Gespeeld'?C.green:C.purple,17,750);
   y+=cardH+10;
  }
  y+=7;
 }
}


/* Volledige deelbare toernooischema: één liggende afbeelding, inclusief routes.
   Alleen de zichtbare nummering hangt af van de speeldagen; de match-ID's en
   doorschuifkoppelingen blijven zoals vastgelegd bij de loting. */
/* De PNG gebruikt dezelfde spiegeling en dezelfde match-ID's als de website. */
/* Meet de daadwerkelijke kaartinhoud met de canvas-lettertypes.
   Daardoor zijn kaart- en kolombreedtes niet langer afhankelijk van 276px. */
function bracketPosterCardWidth(rounds){
 let ctx=null;
 try{ctx=document.createElement('canvas').getContext('2d')}catch(_){}
 const textWidth=(value,size,weight)=>{
  const str=String(value??'');
  if(ctx){
   ctx.font=weight+' '+size+'px Arial,sans-serif';
   return ctx.measureText(str).width;
  }
  return Array.from(str).reduce((sum,c)=>sum+
   size*(/[ilI1.,:;!|]/.test(c)?.27:/[MW@#%]/.test(c)?.85:.54),0);
 };
 let longest=0;
 const consider=(text,size,weight,extra=0)=>{
  longest=Math.max(longest,textWidth(text,size,weight)+extra);
 };
 for(let r=0;r<rounds.length;r++)for(const m of rounds[r]){
  consider(displayDuelLabel(m,rounds).toUpperCase(),15,900,1);
  for(let slot=0;slot<2;slot++){
   const id=slot===0?m.a:m.b;
   const text=id?name(id):m.isBye&&slot===1?'Vrijloting':
    bracketSlotText(r,m.index,slot,id);
   consider((id&&id===m.winner?'✓ ':'')+text,16,
    id&&id===m.winner?900:700,2);
  }
  const schedule=data.schedule[m.id];
  const when=m.isBye?'VRIJLOTING':schedule?.date?
   prettyDate(schedule.date)+(schedule.time?' · '+schedule.time+' uur':''):
   'DATUM VOLGT';
  consider(when,12,700,1);
 }
 // De koppen boven de kolommen mogen afbreken, de inhoud van de kaart niet.
 return Math.max(118,Math.ceil(longest+34));
}
function bracketPosterGeometry(rounds){
 const cardW=bracketPosterCardWidth(rounds),cardH=101,colGap=53,marginX=68;
 const layout=bracketMirrorLayout(rounds,{
  cardHeight:cardH,pitch:119,top:355,bronzeGap:185
 });
 const width=marginX*2+layout.columns*cardW+(layout.columns-1)*colGap;
 const bottom=Math.max(...layout.positions.flat().map(p=>p.y+cardH));
 const height=Math.max(1170,Math.ceil(bottom+165));
 return {cardW,cardH,colGap,marginX,width,height,layout,
  centers:layout.positions.map(row=>row.map(pos=>pos.cy)),
  x:(r,i)=>marginX+layout.positions[r][i].column*(cardW+colGap),
  y:(r,i)=>layout.positions[r][i].y};
}
function bracketPosterConnections(ctx,rounds,g){
 ctx.save();
 ctx.lineWidth=3;
 ctx.strokeStyle='rgba(227,183,108,.8)';
 ctx.lineJoin='round';
 ctx.lineCap='round';
 const last=rounds.length-1;
 function draw(source,dest,dashed=false){
  const a=g.layout.positions[source.round][source.index];
  const b=g.layout.positions[dest.round][dest.index];
  const fromLeft=a.column<b.column;
  const sx=g.x(source.round,source.index)+(fromLeft?g.cardW:0);
  const tx=g.x(dest.round,dest.index)+(fromLeft?0:g.cardW);
  const branch=(sx+tx)/2;
  ctx.beginPath();
  ctx.moveTo(sx,a.cy+(dashed?29:0));
  ctx.lineTo(branch,a.cy+(dashed?29:0));
  ctx.lineTo(branch,b.cy);
  ctx.lineTo(tx,b.cy);
  ctx.stroke();
 }
 for(let r=0;r<last;r++)for(const m of rounds[r]){
  const next=rounds[r+1][Math.floor(m.index/2)];
  if(next)draw(m,next);
 }
 const semis=rounds[last-1]||[];
 const bronze=rounds[last]?.find(m=>m.isBronze);
 if(bronze&&semis.length===2){
  ctx.strokeStyle='rgba(197,170,211,.78)';
  ctx.lineWidth=2;
  ctx.setLineDash?.([9,8]);
  semis.forEach(m=>draw(m,bronze,true));
  ctx.setLineDash?.([]);
 }
 ctx.restore();
}
function bracketPosterCard(ctx,m,r,i,g,rounds){
 const C=OHC_SHARE_COLORS,x=g.x(r,i),y=g.y(r,i),w=g.cardW,h=g.cardH;
 const bronze=!!m.isBronze,final=r===rounds.length-1&&!bronze,decided=!!m.winner;
 shareFillRound(ctx,x,y,w,h,15,bronze?'#302436':final?'#35283b':'#211b2d',
  decided?'rgba(64,210,147,.9)':final?'#e9b970':bronze?'rgba(205,160,105,.9)':'rgba(160,122,190,.7)',final?3:2);
 let headFill='#493449';
 if(final||bronze){
  headFill=ctx.createLinearGradient(x+11,y+8,x+w-11,y+8);
  if(final){
   headFill.addColorStop(0,'#e7b45f');
   headFill.addColorStop(.43,'#dcbf87');
   headFill.addColorStop(1,'#c3cbd8');
  }else{
   headFill.addColorStop(0,'#986037');
   headFill.addColorStop(.43,'#785039');
   headFill.addColorStop(1,'#493449');
  }
 }
 shareFillRound(ctx,x+9,y+5,w-18,24,7,headFill);
 const label=displayDuelLabel(m,rounds).toUpperCase();
 shareText(ctx,label,x+17,y+24,w-34,
  final?'#24192a':bronze?'#fff0d9':C.gold,15,900);
 for(let slot=0;slot<2;slot++){
  const id=slot===0?m.a:m.b;
  const str=id?name(id):m.isBye&&slot===1?'Vrijloting':
   bracketSlotText(r,m.index,slot,id);
  const winner=id&&id===m.winner;
  shareText(ctx,(winner?'✓ ':'')+str,x+14,y+48+slot*19,w-28,
   winner?C.green:id?C.white:C.muted,16,winner?900:700,'left',200);
 }
 // De speeldatum blijft onder beide spelers; er is geen extra kolom nodig.
 const schedule=data.schedule[m.id];
 const when=m.isBye?'VRIJLOTING':schedule?.date?
  prettyDate(schedule.date)+(schedule.time?' · '+schedule.time+' uur':''):
  'DATUM VOLGT';
 ctx.fillStyle='rgba(193,158,182,.35)';
 ctx.fillRect(x+14,y+75,w-28,1);
 shareText(ctx,when,x+14,y+92,w-28,schedule?.date?C.pale:C.muted,12,700);
}
function buildOhcBracketPoster(logo,rounds){
 if(!rounds?.length)throw Error('Er is nog geen loting om te exporteren.');
 const C=OHC_SHARE_COLORS,g=bracketPosterGeometry(rounds);
 const canvas=document.createElement('canvas');
 canvas.width=g.width;canvas.height=g.height;
 const ctx=canvas.getContext('2d');
 if(!ctx)throw Error('Canvas is niet beschikbaar.');
 ctx.fillStyle=C.bg;ctx.fillRect(0,0,g.width,g.height);
 const glow=ctx.createRadialGradient(g.width/2,0,10,g.width/2,50,g.width*.72);
 glow.addColorStop(0,'rgba(98,49,129,.3)');
 glow.addColorStop(1,'rgba(9,9,18,0)');
 ctx.fillStyle=glow;ctx.fillRect(0,0,g.width,g.height);
 shareFillRound(ctx,20,20,g.width-40,g.height-40,28,
  'rgba(12,12,23,.8)','rgba(221,174,104,.7)',3);
 if(logo)ctx.drawImage(logo,72,58,145,145);
 shareText(ctx,'OPTSCH HEADS-UP CUP',244,103,g.width-320,C.gold,32,900);
 shareText(ctx,'VOLLEDIG TOERNOOISCHEMA',244,163,g.width-320,C.white,47,900);
 shareText(ctx,(data.settings.title||'OHC')+'  •  '+data.players.length+
  ' spelers  •  '+rounds.length+' rondes',244,204,g.width-320,C.purple,22,750);
 ctx.fillStyle='rgba(236,192,128,.6)';ctx.fillRect(76,246,g.width-152,2);
 for(let col=0;col<g.layout.columns;col++){
  const m=rounds.flat().find(m=>g.layout.positions[m.round][m.index].column===col);
  if(!m)continue;
  const title=col===g.layout.centerColumn?'FINALE & BRONSFINALE':
   roundLabel(m.round,rounds.length).toUpperCase();
  shareText(ctx,title,g.marginX+col*(g.cardW+g.colGap)+g.cardW/2,316,
   g.cardW,col===g.layout.centerColumn?C.gold:C.lightGold,
   col===g.layout.centerColumn?17:20,850,'center');
 }
 bracketPosterConnections(ctx,rounds,g);
 rounds.forEach((matches,r)=>matches.forEach((m,i)=>
  bracketPosterCard(ctx,m,r,i,g,rounds)));
 ctx.fillStyle='rgba(236,192,128,.5)';
 ctx.fillRect(76,g.height-114,g.width-152,2);
 const champ=champion();
 if(champ){
  shareText(ctx,'🏆 KAMPIOEN: '+name(champ),g.width/2,g.height-65,
   g.width-170,C.lightGold,29,900,'center');
 }else shareText(ctx,'Duelleer. Overwin & Pak die titel!',
  g.width/2,g.height-65,g.width-180,C.lightGold,23,850,'center');
 return canvas;
}

function buildOhcSharePoster(info,logo){
 if(info.type==='boom')return buildOhcBracketPoster(logo,info.rounds);
 const isCalendar=['kalender','kalender-volledig'].includes(info.type);
 const n=isCalendar?info.entries.length:info.round!==null?info.matches.length:
  info.type==='deelnemers'?data.players.length:8;
 const rows=info.round!==null?Math.ceil(n/(n===1?1:2)):
  info.type==='deelnemers'?Math.ceil(n/(n===1?1:2)):4;
 const height=isCalendar?shareCalendarPosterHeight(info):
  Math.max(1440,339+rows*(info.round!==null?229:64)+220);
 // Very tall full-tournament posters use native 1080px resolution to stay
 // within memory limits of mobile browsers; monthly posters remain 2160px wide.
 const scale=info.type==='kalender-volledig'?1:OHC_SHARE_SCALE;
 const canvas=document.createElement('canvas');
 canvas.width=OHC_SHARE_W*scale;
 canvas.height=height*scale;
 const ctx=canvas.getContext('2d');
 if(!ctx)throw Error('Canvas niet beschikbaar');
 ctx.scale(scale,scale);
 shareBase(ctx,height,logo,info,n);
 if(isCalendar){
  if(info.type==='kalender')shareCalendarGrid(ctx,info);
  shareCalendarAgenda(ctx,info);
 }
 else if(info.round!==null)shareCardPosters(ctx,info);
 else if(info.type==='deelnemers')sharePlayersPoster(ctx,info);
 else if(info.type==='prijzen')sharePrizesPoster(ctx);
 return canvas;
}
async function updateSharePreview(){
 if(tab!=='delen'||!authUser)return;
 const currentId=++ohcShareRenderId;
 const info=shareActiveInfo();
 const display=document.getElementById('ohcSharePreview');
 if(!display||!info){ohcSharePoster=null;return}
 shareStatus('Afbeelding opbouwen…');
 try{
  const key=shareContextKey(info);
  const logo=await getOhcShareLogo();
  if(tab!=='delen'||currentId!==ohcShareRenderId)return;
  if(ohcSharePosterKey!==key||!ohcSharePoster){
   ohcSharePoster=buildOhcSharePoster(info,logo);
   ohcSharePosterKey=key;
  }
  display.width=ohcSharePoster.width;display.height=ohcSharePoster.height;
  const ctx=display.getContext('2d');
  ctx.drawImage(ohcSharePoster,0,0);
  shareStatus('Klaar om te downloaden of via de telefoon te delen.');
 }catch(error){
  shareStatus('De poster kon niet worden opgebouwd: '+String(error?.message||error));
 }
}
async function sharePosterBlob(){
 const info=shareActiveInfo();
 if(!info)throw Error('Er zijn nog geen gegevens beschikbaar.');
 const key=shareContextKey(info);
 if(!ohcSharePoster||ohcSharePosterKey!==key){
  ohcSharePoster=buildOhcSharePoster(info,await getOhcShareLogo());
  ohcSharePosterKey=key;
 }
 const blob=await new Promise(resolve=>ohcSharePoster.toBlob(resolve,'image/png'));
 if(!blob)throw Error('Het maken van de PNG is mislukt.');
 return {blob,info,filename:shareFileLabel(info)};
}
function saveShareBlob(blob,filename){
 const link=document.createElement('a'),url=URL.createObjectURL(blob);
 link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),5000);
}
async function downloadSharePoster(){
 if(!authUser||ohcShareBusy)return;
 ohcShareBusy=true;shareStatus('PNG maken…');
 try{
  const {blob,filename}=await sharePosterBlob();
  saveShareBlob(blob,filename);
  shareStatus('PNG opgeslagen: '+filename);
 }catch(e){shareStatus('Download mislukt: '+e.message);notify('PNG maken mislukt: '+e.message)}
 finally{ohcShareBusy=false}
}
async function sharePosterNative(){
 if(!authUser||ohcShareBusy)return;
 ohcShareBusy=true;shareStatus('Deelbare afbeelding maken…');
 try{
  const {blob,filename,info}=await sharePosterBlob();
  const file=new File([blob],filename,{type:'image/png'});
  if(navigator.share&&navigator.canShare?.({files:[file]})){
   try{
    await navigator.share({
     files:[file],
     title:'OPTSCH Heads-Up Cup • '+OHC_SHARE_TYPES[info.type].label,
     text:info.round===null?'OPTSCH Heads-Up Cup':info.label
    });
    shareStatus('De afbeelding is aan het deelmenu aangeboden.');
   }catch(error){
    if(error.name==='AbortError'){shareStatus('Delen geannuleerd.');return}
    saveShareBlob(blob,filename);
    shareStatus('Delen via dit apparaat mislukte. PNG is gedownload om handmatig te versturen.');
   }
  }else{
   saveShareBlob(blob,filename);
   shareStatus('Dit apparaat ondersteunt geen directe afbeeldingsdeling. De PNG is gedownload om via WhatsApp te versturen.');
  }
 }catch(e){shareStatus('Delen mislukt: '+e.message);notify('Afbeelding delen mislukt: '+e.message)}
 finally{ohcShareBusy=false}
}
