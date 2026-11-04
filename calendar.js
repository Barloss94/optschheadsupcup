'use strict';

/* OHC monthly calendar: a read-only projection of the existing duel schedule.
   No duplicate storage. All dates follow Europe/Amsterdam calendar days. */
let ohcCalendarMonth='';
let ohcCalendarSelectedDate='';

function ohcCalendarToday(){
 return new Intl.DateTimeFormat('sv-SE',{
  timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'
 }).format(new Date());
}
function ohcCalendarValidMonth(value){
 return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value||''))&&
  Number(value.slice(0,4))>=2020&&Number(value.slice(0,4))<=2100;
}
function ohcCalendarEntries(){
 const rows=[];
 for(const m of bracket().flat()){
  if(m.isBye)continue;
  const schedule=data.schedule[m.id];
  if(!schedule?.date||!/^\d{4}-\d{2}-\d{2}$/.test(schedule.date))continue;
  const d=new Date(schedule.date+'T12:00:00Z');
  if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==schedule.date)continue;
  rows.push({
   id:m.id,date:schedule.date,time:schedule.time||DEFAULT_MATCH_TIME,
   round:m.round,index:m.index,isBronze:!!m.isBronze,
   a:m.a,b:m.b,winner:m.winner,
   left:bracketSlotText(m.round,m.index,0,m.a),
   right:bracketSlotText(m.round,m.index,1,m.b),
   score:data.settings?.resultText?.[m.id]||'',
   provisional:!!(schedule.provisional||schedule.requiresAgreement||schedule.conditionalOnWinners),
   status:matchStatus(m)
  });
 }
 return rows.sort((a,b)=>a.date.localeCompare(b.date)||
  a.time.localeCompare(b.time)||a.round-b.round||a.index-b.index);
}
function ohcCalendarPreferredMonth(entries){
 const today=ohcCalendarToday();
 const nearest=entries.find(m=>m.date>=today)||entries[entries.length-1];
 const period=getRoundWindows()[0]?.start;
 return nearest?.date.slice(0,7)||period?.slice(0,7)||today.slice(0,7);
}
function ohcCalendarCurrentMonth(entries=ohcCalendarEntries()){
 if(!ohcCalendarValidMonth(ohcCalendarMonth))
  ohcCalendarMonth=ohcCalendarPreferredMonth(entries);
 return ohcCalendarMonth;
}
function ohcCalendarFirstMatchDate(entries,month){
 return entries.find(x=>x.date.startsWith(month))?.date||'';
}
function ohcCalendarMonthDates(month){
 if(!ohcCalendarValidMonth(month))return[];
 const [year,m]=month.split('-').map(Number);
 const first=new Date(Date.UTC(year,m-1,1,12));
 const offset=(first.getUTCDay()+6)%7;
 const days=new Date(Date.UTC(year,m,0,12)).getUTCDate();
 const rows=Math.ceil((offset+days)/7);
 return Array.from({length:rows*7},(_,i)=>{
  const day=new Date(Date.UTC(year,m-1,1-offset+i,12));
  return {iso:day.toISOString().slice(0,10),current:day.getUTCMonth()===m-1,
   day:day.getUTCDate()};
 });
}
function ohcCalendarMonthName(month){
 if(!ohcCalendarValidMonth(month))return '';
 const [year,m]=month.split('-').map(Number);
 const label=new Intl.DateTimeFormat('nl-NL',{
  month:'long',year:'numeric',timeZone:'UTC'
 }).format(new Date(Date.UTC(year,m-1,1,12)));
 return label.charAt(0).toUpperCase()+label.slice(1);
}
function ohcCalendarChangeMonth(month){
 if(!ohcCalendarValidMonth(month))return;
 ohcCalendarMonth=month;
 ohcCalendarSelectedDate=ohcCalendarFirstMatchDate(ohcCalendarEntries(),month);
 render();
}
function ohcCalendarStepMonth(delta){
 if(![-1,1].includes(delta))return;
 const m=ohcCalendarCurrentMonth(),[year,month]=m.split('-').map(Number);
 const d=new Date(Date.UTC(year,month-1+delta,1,12));
 ohcCalendarChangeMonth(d.toISOString().slice(0,7));
}
function ohcCalendarGoToday(){
 ohcCalendarChangeMonth(ohcCalendarToday().slice(0,7));
 ohcCalendarSelectedDate=ohcCalendarToday();
 render();
}
function ohcCalendarSelectDate(date){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
 ohcCalendarMonth=date.slice(0,7);
 ohcCalendarSelectedDate=date;
 render();
}
function ohcCalendarMatchLabel(entry){
 return entry.isBronze?'Bronsfinale':
  entry.round===bracket().length-1?'Finale':'Ronde '+(entry.round+1)+' · duel '+(entry.index+1);
}
function ohcCalendarDayCard(entry){
 const statusClass=entry.status==='Gespeeld'?'played':
  entry.provisional?'provisional':'scheduled';
 return '<div class="ohc-calendar-match '+statusClass+'">'+
  '<div class="ohc-calendar-match-time"><strong>'+esc(entry.time)+'</strong><span>uur</span></div>'+
  '<div class="ohc-calendar-match-info"><span class="ohc-calendar-match-round">'+esc(ohcCalendarMatchLabel(entry))+'</span>'+
  '<strong>'+esc(entry.left)+' <span class="vs">vs</span> '+esc(entry.right)+'</strong>'+
  (entry.score&&entry.winner?'<span class="ohc-calendar-score">Uitslag: '+esc(entry.score)+'</span>':'')+
  '</div><span class="ohc-calendar-match-status">'+esc(entry.provisional&&entry.status!=='Gespeeld'?'Voorlopig':entry.status)+'</span>'+
  '</div>';
}
function ohcCalendarMonthAgenda(entries,month){
 const filtered=entries.filter(e=>e.date.startsWith(month));
 if(!filtered.length)return '<div class="empty ohc-calendar-empty"><div class="bigicon">📅</div>'+
  '<strong>Geen wedstrijden in deze maand</strong>'+
  '<p>Blader naar een andere maand of bekijk de wedstrijdplanning. Alleen duels met een speeldatum worden hier getoond.</p></div>';
 const groups=new Map();
 filtered.forEach(entry=>{
  if(!groups.has(entry.date))groups.set(entry.date,[]);
  groups.get(entry.date).push(entry);
 });
 return '<div class="ohc-calendar-agenda">'+[...groups].map(([date,matches])=>
  '<section class="ohc-calendar-agenda-day"><div class="ohc-calendar-day-title" id="ohcCalendarDay'+date+'">'+
  '<h3>'+esc(prettyDate(date))+'</h3><span class="pill blue">'+matches.length+
  (matches.length===1?' duel':' duels')+'</span></div>'+
  '<div class="ohc-calendar-match-list">'+matches.map(ohcCalendarDayCard).join('')+'</div></section>'
 ).join('')+'</div>';
}
function ohcCalendarView(){
 const entries=ohcCalendarEntries(),month=ohcCalendarCurrentMonth(entries);
 const monthEntries=entries.filter(e=>e.date.startsWith(month));
 if(!ohcCalendarSelectedDate||!ohcCalendarSelectedDate.startsWith(month))
  ohcCalendarSelectedDate=ohcCalendarFirstMatchDate(entries,month);
 const perDate=new Map();
 monthEntries.forEach(m=>{
  if(!perDate.has(m.date))perDate.set(m.date,[]);
  perDate.get(m.date).push(m);
 });
 const weekdays=['Ma','Di','Wo','Do','Vr','Za','Zo'];
 const today=ohcCalendarToday();
 const grid=ohcCalendarMonthDates(month).map(cell=>{
  const matches=perDate.get(cell.iso)||[];
  const chosen=cell.iso===ohcCalendarSelectedDate;
  const played=matches.length&&matches.every(m=>m.status==='Gespeeld');
  return '<button type="button" class="ohc-calendar-cell'+(!cell.current?' outside':'')+
   (matches.length?' has-duels':'')+(chosen?' selected':'')+(cell.iso===today?' today':'')+
   '" aria-label="'+esc(prettyDate(cell.iso))+': '+matches.length+' duels" aria-pressed="'+(chosen?'true':'false')+
   '" onclick="ohcCalendarSelectDate(\''+cell.iso+'\')">'+
   '<span class="ohc-calendar-daynum">'+cell.day+'</span>'+
   (matches.length?'<span class="ohc-calendar-count'+(played?' played':'')+'">'+matches.length+
    (matches.length===1?' duel':' duels')+'</span>':'')+
   (matches.length?'<span class="ohc-calendar-mini">'+esc(matches[0].left)+' vs '+esc(matches[0].right)+
    (matches.length>1?'<span>+'+(matches.length-1)+' meer</span>':'')+'</span>':'')+
   '</button>';
 }).join('');
 const selected=perDate.get(ohcCalendarSelectedDate)||[];
 const action=archiveReadonly?'':'<div class="btnbar ohc-calendar-sharebar">'+
  (monthEntries.length?button('📸 Deel deze maand',"openCalendarShare('month')",'alt'):'')+
  (entries.length?button('📤 Deel volledige speelkalender',"openCalendarShare('all')",'ghost'):'')+
  '</div>';
 return '<section class="panel ohc-calendar-panel">'+
  '<div class="sectiontitle"><h2>Speelkalender</h2><span class="pill blue">'+entries.length+' ingeplande duels</span></div>'+
  '<p class="panel-intro">Bekijk per datum welke wedstrijden gespeeld worden. De kalender werkt rechtstreeks met de bestaande wedstrijdplanning. Voorlopige speeldata herken je aan hun status; wijzigingen verschijnen na het opslaan automatisch hier.</p>'+
  '<div class="ohc-calendar-toolbar"><button class="ohc-calendar-arrow" type="button" aria-label="Vorige maand" onclick="ohcCalendarStepMonth(-1)">‹</button>'+
  '<h3>'+esc(ohcCalendarMonthName(month))+'</h3>'+
  '<button class="ohc-calendar-arrow" type="button" aria-label="Volgende maand" onclick="ohcCalendarStepMonth(1)">›</button>'+
  '<label class="ohc-calendar-monthpicker">Maand kiezen <input aria-label="Kies kalendermaand" type="month" min="2020-01" max="2100-12" value="'+month+'" onchange="ohcCalendarChangeMonth(this.value)"></label>'+
  '<button type="button" class="btn ghost small" onclick="ohcCalendarGoToday()">Vandaag</button></div>'+
  '<div class="ohc-calendar-weekdays">'+weekdays.map(d=>'<span>'+d+'</span>').join('')+'</div>'+
  '<div class="ohc-calendar-grid" role="group" aria-label="'+esc(ohcCalendarMonthName(month))+'">'+grid+'</div>'+
  '<div class="ohc-calendar-legend"><span><i class="ohc-legend-mark"></i> Duels gepland</span><span><i class="ohc-legend-mark played"></i> Alle duels gespeeld</span>'+
  '<span><i class="ohc-legend-mark selected"></i> Geselecteerde datum</span></div>'+
  (selected.length?'<div class="ohc-calendar-highlight"><strong>'+esc(prettyDate(ohcCalendarSelectedDate))+'</strong> · '+
   selected.length+(selected.length===1?' duel':' duels')+' — details hieronder</div>':'')+
  action+'</section>'+
  '<section class="panel ohc-calendar-agenda-panel"><div class="sectiontitle"><h2>Wedstrijden per datum</h2>'+
  '<span class="pill blue">'+monthEntries.length+(monthEntries.length===1?' duel':' duels')+' in '+esc(ohcCalendarMonthName(month))+'</span></div>'+
  ohcCalendarMonthAgenda(entries,month)+
  (!entries.length&&isAdmin?'<div class="btnbar">'+button('Wedstrijden plannen',"setTab('beheer-planning')",'alt')+'</div>':'')+
  '</section>';
}
function openCalendarShare(scope='month'){
 if(!authUser||archiveReadonly)return;
 if(!ohcCalendarEntries().length)return;
 const month=ohcCalendarCurrentMonth();
 ohcShareMonth=month;
 ohcShareType=scope==='all'?'kalender-volledig':'kalender';
 setTab('delen');
}
