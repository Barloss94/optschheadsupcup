'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const source=html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
assert.ok(source);
const context=vm.createContext({
 structuredClone,Date,Math,Intl,console,
 location:{hash:''},window:{},document:{getElementById(){return null}},
 addEventListener(){},setTimeout(){},clearTimeout(){}
});
vm.runInContext(source.replace(/\ninitialize\(\);\s*$/,''),context,{filename:'OHC.js'});
const run=code=>vm.runInContext('(()=>{'+code+'})()',context);

const wrapped=[
 '"Tijdstempel,""Voor- en achternaam"",""Doe jij mee met de OPTSCH HEADS-UP CUP?"",""Welke weekdagen kan jij echt niet spelen? (meerdere antwoorden mogelijk)""";;;;',
 '"2026/11/03 2:38:09 p.m. CET,""Daniël van der Wielen"",""Ja"",""Ik kan alle weekdagen spelen""";;;;',
 '"2026/11/03 3:22:43 p.m. CET,""Ernst Hanouwer"",""Ja"",""Dinsdagen";"Woensdagen""";;;',
 '"2026/11/03 3:30:00 p.m. CET,""Jan """"Coinflip"""" Taxi"",""Ja"",""Zondagen";"Maandagen";"Dinsdagen""";;'
].join('\r\n')+'\r\n';

test('Het geüploade CSV-formaat met extra puntkomma-laag wordt herkend',()=>{
 context.sample=wrapped;
 const rows=run('return parseCSV(sample)');
 assert.equal(rows.length,4);
 assert.equal(rows[0].length,4);
 assert.equal(rows[0][1],'Voor- en achternaam');
 assert.equal(rows[1][1],'Daniël van der Wielen');
 assert.equal(rows[1][3],'Ik kan alle weekdagen spelen');
 assert.equal(rows[2][3],'Dinsdagen;Woensdagen');
 assert.equal(rows[3][1],'Jan "Coinflip" Taxi');
 assert.equal(rows[3][3],'Zondagen;Maandagen;Dinsdagen');
 assert.equal(run('return parseCSV(sample)[0].findIndex(csvNameColumn)'),1);
});

test('Google Forms CSV met komma-gescheiden kolommen wordt gewoon ingelezen',()=>{
 context.sample='Tijdstempel,"Voor- en achternaam","Doe jij mee?","Welke weekdagen?"\r\n'+
  '"2026/11/03 20:00","Anna Test","Ja","Maandagen,Woensdagen"\r\n';
 const rows=run('return parseCSV(sample)');
 assert.equal(rows.length,2);
 assert.equal(rows[1][1],'Anna Test');
 assert.equal(rows[1][3],'Maandagen,Woensdagen');
});

test('Ook een normaal puntkomma-CSV-bestand wordt herkend',()=>{
 context.sample='Tijdstempel;Voor- en achternaam;Doe jij mee?;Welke weekdagen?\r\n'+
  '"2026/11/03";"Bram Test";"Ja";"Dinsdagen;Donderdagen"\r\n';
 const rows=run('return parseCSV(sample)');
 assert.equal(rows.length,2);
 assert.equal(rows[1][1],'Bram Test');
 assert.equal(rows[1][3],'Dinsdagen;Donderdagen');
});

test('Bestaande Naam-kolom en quoted multi-line tekst blijven werken',()=>{
 context.sample='Naam,Opmerking\r\n"Cato Test","Meerdere regels\r\nin antwoord"\r\n';
 const rows=run('return parseCSV(sample)');
 assert.equal(rows.length,2);
 assert.equal(rows[1][0],'Cato Test');
 assert.equal(rows[1][1],'Meerdere regels\r\nin antwoord');
});

test('Lege regels en UTF-8 BOM blokkeren de import niet',()=>{
 context.sample='\uFEFFNaam,Extra\r\n\r\n"Daan Test","Ja"\r\n';
 const rows=run('return parseCSV(sample)');
 assert.equal(rows.length,2);
 assert.equal(rows[0][0],'Naam');
});

test('Onvolledig CSV-bestand wordt expliciet afgewezen',()=>{
 context.sample='Naam,Beschikbaar\r\n"Naam zonder sluitteken,\r\n';
 assert.throws(()=>run('return parseCSV(sample)'),/aanhalingsteken/);
});
