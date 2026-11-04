# OPTSCH Heads-Up Cup (OHC)

De besloten website voor de **OPTSCH Heads-Up Cup**, met directe knock-out (single elimination). Alle toernooi-informatie is alleen toegankelijk na inloggen.

## Live database

De applicatie gebruikt het bestaande Supabase-project **OPTSCH Ranking** (`lnlaqrljtwrxtfsyotnn`), maar beheert de OHC volledig in afzonderlijke tabellen:

- `public.ohc_events`: volledige deelnemersgegevens, verhinderingen, loting, uitslagen, wedstrijdplanning en versienummer. Alleen bestaande Ranking-beheerders kunnen deze tabel lezen en wijzigen.
- `public.ohc_public_events`: een met Supabase Auth afgeschermd spelersoverzicht met **volledige namen**, loting en wedstrijduitslagen. Beschikbaarheid wordt hier niet vrijgegeven. Alleen ingelogde gebruikers kunnen dit overzicht lezen; anonieme toegang is ingetrokken.
- `public.ohc_save_state(...)`: bewaart een wijziging transactioneel, controleert de beheerrol en voorkomt overschrijven van nieuwere toernooiversies.

De databasewijziging is geregistreerd onder de migratie `create_ohc_isolated_tournament_tables`. De bestaande Ranking-tabellen zijn niet aangepast.

De API-sleutel in `index.html` is uitsluitend een **publishable** sleutel. Beveiliging verloopt via Supabase Auth en Row Level Security (RLS).

## Website

Open `index.html` in een browser via een HTTP-server of gebruik GitHub Pages. De website bevat:

- Besloten overzicht en deelnemerslijst voor ingelogde gebruikers
- Speelschema en volledige voor- en achternamen achter inlog
- Automatische knock-outtoernooiboom, vrijloten en voortgang
- Inloggen met bestaande OPTSCH-/Supabase-accounts; alleen beheerders krijgen extra beheerfuncties
- Deelnemersbeheer en import van de Google Forms-inschrijvings-CSV
- Loting, winnaars, automatisch doorschuiven en wedstrijdplanning
- Rondedeadlines, CSV-export, PNG-export en JSON-back-up

De eerste twee deelnemers zijn op basis van het aangeleverde inschrijvingsbestand in de OHC-database gezet. De **loting is niet uitgevoerd**.

## Inschrijven en CSV-verwerking

- **Inschrijven voor spelers:** tot en met **20 november 2026 om 23:59 uur Nederlandse tijd**.
- **21 november 2026:** de beheerder uploadt het Google Forms-CSV-bestand met alle tijdig ontvangen inschrijvingen.
- De datum waarop de beheerder het CSV-bestand verwerkt staat los van de inschrijfdeadline voor spelers. De import mag daarom ook ná het sluiten van de inschrijving nieuwe deelnemers uit de ontvangen CSV aanmaken.
- De CSV-import is uitsluitend beschikbaar achter de bestaande Ranking-beheerlogin. Rechtstreeks nieuwe spelers handmatig toevoegen wordt vanaf 21 november in de interface geblokkeerd; bestaande gegevens kunnen nog worden gecorrigeerd.
- Na de officiële loting slaat de import nieuwe deelnemers over om de toernooiboom intact te houden.

## Vaste knock-outbracket en beschikbaarheid

- De beheerder voert **één loting** uit voor de eerste ronde. Alle volgende ontmoetingen volgen daarna de vaste knock-outroutes: winnaar van duel 1 speelt tegen winnaar van duel 2, enzovoort. Er wordt **niet opnieuw geloot**.
- De loting houdt rekening met de opgegeven beschikbare weekdagen. **Spelers zonder gezamenlijke speeldag worden zo laat mogelijk tegenover elkaar geplaatst**: eerst probeert de loting alle zulke combinaties in verschillende brackethelften onder te brengen. Als dat niet volledig mogelijk is, minimaliseert de loting ontmoetingen in ronde 1, vervolgens ronde 2, enzovoort.
- Als er drie spelers zijn die elk alleen op een andere dag kunnen, gaat de loting dus **wel door**. Een onvermijdelijke ontmoeting wordt zo laat mogelijk in de bracket geplaatst; wanneer deze spelers elkaar uiteindelijk treffen, spreken zij **onderling een andere datum af binnen de officiële rondeperiode**.
- Optimalisatie gebeurt met meerdere willekeurige indelingen en verbeterstappen. Er is geen vaste plaatsingslijst. Bij ingewikkelde verhinderingen is de uitkomst een best mogelijke **benadering**, geen mathematisch gegarandeerd globaal optimum.
- Bij onvermijdelijke onverenigbaarheid is er **geen afwijzing van de loting**. Er blijven uitsluitend structurele controles over: maximaal 32 deelnemers, elke deelnemer één keer en geen volledig lege eerste-ronde-duels.
- De originele verhinderingen van deelnemers kunnen na de loting door de beheerder worden bijgewerkt. Dit verandert de vaste route in de bracket niet. De website en database controleren de identiteit en structuur van de bracket.
- Een bestaande bracket kan alleen opnieuw worden geloot na een expliciete volledige herstart door de beheerder.

### Planning en de op papier thuisspelende speler

- De **eerstgenoemde speler in een duel** is de op papier thuisspelende speler.
- Alle ingelogde gebruikers zien de volledige voor- en achternamen. De naamafkorting uit de Game Tracker is niet van toepassing op de Heads-Up Cup.
- Een speler die een duel wint, komt ook in de volgende ronde voor. Dit is **doorschuiven**, geen dubbele loting. De eerste-rondebracket bevat altijd iedere speler precies één keer.
- De beschikbare weekdagen en verhinderingen van spelers worden **niet getoond in het publieke speelschema**. De beheerder kan ze gebruiken om de planning op te stellen.
- Per ronde worden wedstrijden automatisch **gespreid over geschikte speeldagen** binnen de vastgestelde rondeperiode, met uitsluiting van de geblokkeerde feestdagen en met inachtneming van voorafgaande rondes.
- **Harde rondevolgorde:** de speelperiodes mogen elkaar overlappen, maar ingeplande rondes nooit. Elke wedstrijd van ronde 3 moet bijvoorbeeld zijn gespeeld vóór de eerste wedstrijd van ronde 4; hetzelfde geldt voor alle andere opeenvolgende rondes. De hele vorige ronde is leidend, niet slechts de twee voedende duels van een bepaalde wedstrijd. Zowel de browser als de database blokkeren overlappingen.
- **Vastgestelde datum:** wanneer de berekening voor alle mogelijke deelnemers een conflictvrije speeldag vindt en alle voorafgaande rondes zelf vaststaan, wordt de dag automatisch **definitief vastgesteld om 20:00 uur**. De beheerder hoeft dit niet nogmaals te bevestigen. Verplaatsen of de tijd aanpassen kan uitsluitend nadat beide spelers akkoord zijn.
- **Voorlopig:** bij ontbrekende gezamenlijke beschikbaarheid, bij uitkomsten die nog bepalend zijn voor de juiste speeldag of als een voorafgaande ronde nog niet vaststaat, blijft het een voorstel totdat een geldige afspraak kan worden bevestigd.
- **De volledige vaste bracket wordt vooruit doorgerekend**: voor ronde 2 staan de mogelijke winnaars uit beide eerste-ronde-duels al vast; voor ronde 3 en verder volgt hetzelfde principe. Ook de finale en bronsfinale worden berekend.
- Per toekomstige wedstrijd worden de beschikbare dagen van **alle mogelijke deelnemers** vergeleken. Een datum die voor alle uitkomsten past, krijgt voorrang. Als die niet bestaat, wordt een voorlopige datum gekozen die voor zoveel mogelijk mogelijke deelnemers werkt. Die datum wordt opnieuw gecontroleerd zodra de werkelijke winnaars bekend zijn.
- In het publieke speelschema staat niet 'Nog niet bekend', maar de **precieze bracketherkomst** van een nog onbekende speler, bijvoorbeeld `Winnaar ronde 1 duel 1`, en voor de bronsfinale `Verliezer halve finale 1`.
- Als een datum nog afhankelijk is van toekomstige uitslagen, vermeldt het schema **'Voorlopige datum afhankelijk van winnaars'**. Ook een datum die bij alle mogelijke deelnemers past, blijft een voorstel totdat hij is bevestigd.
- Wanneer beide spelers een dag kunnen, heeft een **gezamenlijk beschikbare dag** voorrang.
- Wanneer de twee spelers **geen passende gezamenlijke dag** hebben, wordt voor het voorlopige schema een dag gekozen waarop de **op papier thuisspelende speler** kan. Deze datum is nadrukkelijk **nog geen definitieve afspraak**.
- De spelers moeten daarna **onderling overeenkomen** welke toegestane dag zij spelen. De beheerder bevestigt het akkoord. De geplande dag en **20:00 uur** blijven standaard; andere speeldagen binnen de rondeperiode of starttijden zijn met wederzijds akkoord toegestaan.
- Bevestigde afspraken worden bij herplannen niet stilzwijgend gewijzigd. Als een volgende ronde niet meer past, vraagt de planning om handmatige beoordeling in plaats van een verboden datum te forceren.

## Bronsfinale en plaats 3/4

- De **twee verliezers van de halve finales** spelen een extra wedstrijd om het brons. De winnaar wordt **3e**, de verliezer **4e**.
- Dit is **geen extra knock-outronde**: de bronsfinale wordt tegelijk met de gewone finale in de vijfde speelperiode gehouden (**18 t/m 31 januari 2027** bij vijf ronden).
- De twee deelnemers worden automatisch bepaald zodra beide halve finales zijn beslist. Er is geen extra loting.
- De bronsfinale heeft een eigen uitslag, wedstrijddatum, planning en vermelding in de toernooiboom en CSV/PNG-exports. Bij een veranderde halvefinale-uitslag vervalt de bronzuitslag automatisch, zodat nooit de verkeerde spelers de derde en vierde prijs krijgen.
- Het toernooi wordt pas als afgerond aangemerkt als zowel de gewone finale als de bronsfinale een winnaar heeft.
- De bronsfinale verbindt, net als de gewone finale, spelers uit **verschillende brackethelften**. Als zij geen gezamenlijke opgegeven speeldag hebben, mogen zij in onderling overleg een andere toegestane datum kiezen. De beheerder legt dit vast zonder de oorspronkelijke verhinderingen aan te passen.
- Bij **32 spelers** zijn er **32 aparte knock-outduels** (31 voor de titel plus één om het brons). De aantallen *heads-ups* bij eventueel meerdere games per duel kunnen hiervan afwijken.

## Buy-in en prijzenverdeling

- Eenmalige buy-in: **€12,50 per speler** voor de volledige competitie, maximaal **32 deelnemers**.
- Vaste organisatiekosten: **€56,50**. Deze worden éénmaal van de bruto inleg afgehaald. Het restant is de **netto prijzenpot**.
- Richtpercentages over de netto prijzenpot: **1e 35%**, **2e 25%**, **3e 15,5%**, **4e 12,5%**, **vier verliezers van ronde 3 elk 3%**.
- Er is **geen minimumbedrag van €12,50** voor de verliezers van ronde 3.
- **Afronden volgens de spreadsheet**:
  1. Bereken de oorspronkelijke bedragen volgens hun percentage van de netto prijzenpot.
  2. Rond plaats **1 en 2 naar beneden af op hele euro's**.
  3. Rond plaats **4 af op de dichtstbijzijnde €0,50**.
  4. Rond de vier **gedeelde vijfde plaatsen elk gelijk naar beneden af op hele euro's**.
  5. Geef het **volledige overgebleven bedrag aan plaats 3**.
- Alle prijzen blijven veelvouden van **€0,50** en de netto prijzenpot wordt volledig uitgekeerd; doordat plaats 3 het restant krijgt, kan het werkelijke aandeel van plaats 3 afwijken van 15,5%.
- Voorbeeld bij **32 deelnemers**: bruto inleg **€400,00**, vaste kosten **€56,50**, netto prijzenpot **€343,50**. Prijzen: **€120,00 / €85,00 / €55,50 / €43,00**, plus viermaal **€10,00**.
- De acht prijzen gelden voor de vijf rondes bij **17 t/m 32 deelnemers**. Bij minder dan 17 deelnemers is een aparte prijsverdeling nog niet vastgesteld; de website toont dan alleen het voorbeeld van 32 deelnemers.
- De **winnaar van de bronsfinale** krijgt de derde prijs; de verliezer krijgt de vierde prijs.

## Officieel speelschema 2026–2027

| Ronde | ISO-weken | Toegestane periode | Niet spelen |
|---|---|---|---|
| 1 | 49/50 2026 | 30 november t/m 13 december 2026 | 4, 5 en 6 december |
| 2 | 51/52 2026 | 14 t/m 27 december 2026 | 24, 25 en 26 december |
| 3 | 1/2 2027 | 4 t/m 17 januari 2027 | geen aanvullende uitzonderingen |
| 4 | 2/3 2027 | 11 t/m 24 januari 2027 | geen aanvullende uitzonderingen |
| 5 | 3/4 2027 | 18 t/m 31 januari 2027 | geen aanvullende uitzonderingen |

De planning verdeelt de speeldagen vooraf binnen hun rondeperiode, rekening houdend met verhinderingen, de vaste bracket en waar bekend de beschikbaarheid van de op papier thuisspelende speler. De **volledige vorige ronde** moet zijn afgerond voordat de volgende begint, ook waar de toegestane speelperiodes elkaar overlappen. Speeldatums buiten de rondeperiodes of op uitgesloten dagen blijven verboden.

### Speeldag en starttijd (vastgesteld)

- **Standaard:** de automatisch vastgestelde speeldag met een starttijd van **20:00 uur** zodra de datum voor alle mogelijke deelnemers én de rondevolgorde conflictvrij is. Wanneer dat niet aantoonbaar is, blijft de datum expliciet voorlopig.
- **In onderling overleg:** beide spelers mogen de **speeldag en/of starttijd** wijzigen, mits de nieuwe speeldag binnen de officiële rondeperiode ligt en de rondevolgorde en uitgesloten dagen worden gerespecteerd.
- **Administratie:** de beheerder legt de afspraak vast en vinkt aan dat **beide spelers akkoord** zijn. Zonder dit akkoord kan een datum- of tijdwijziging niet worden bevestigd.
- **Automatisch opnieuw plannen:** bevestigde afspraken worden niet stilzwijgend overschreven; eventuele conflicten komen ter beoordeling bij de beheerder.
- Deze afspraken gelden **ook voor de finale en de bronsfinale**.

De kalender biedt vijf rondes, dus maximaal **32 deelnemers** bij directe knock-out. De beheerder kan verhinderingen van deelnemers instellen, ook op zaterdag en zondag. Zonder gezamenlijke speeldag stelt de planning een beschikbare dag van de thuisspeler voor; beide spelers moeten daarna gezamenlijk een dag afspreken. Vrijloten zijn geen duels en worden niet ingepland. De officiële loting wordt niet automatisch opnieuw uitgevoerd door een planningswijziging.

## Wedstrijduitslagen invoeren

- Meld je met je bestaande Ranking-beheerdersaccount aan in de OHC-website.
- Open **Beheer** en klik op de knop **Uitslagen invoeren** bovenaan de beheerpagina. De sectie **Loting en resultaten → Uitslagen invoeren** wordt dan in beeld gebracht.
- Zoek het duel, vul desgewenst de score in en klik op de **knop van de winnende speler**. Zijn of haar naam schuift automatisch door naar de volgende ronde; die wedstrijd wordt opnieuw op beschikbaarheid beoordeeld.
- De uitslag kan door de beheerder worden gecorrigeerd of gewist; afhankelijke uitslagen en afspraken worden daarbij opnieuw gecontroleerd.
- De bronsfinale heeft een eigen uitslag: de winnaar wordt derde en de verliezer vierde.

## Publiceren op GitHub Pages

De repository heeft een GitHub Pages-workflow op `.github/workflows/pages.yml`.

1. Ga naar **Settings → Pages** van deze repository.
2. Stel bij **Build and deployment → Source** de optie **GitHub Actions** in.
3. Start indien nodig de workflow **Deploy OHC website** bij **Actions**.
4. De website is dan normaal bereikbaar via **https://barloss94.github.io/optschheadsupcup/**.

Als de URL nog niet bereikbaar is, is GitHub Pages nog niet geactiveerd of is de workflow nog niet afgerond.

## Veiligheid en aandachtspunten

- Zonder login is geen toernooidata zichtbaar of via de OHC-database opvraagbaar. De database bepaalt de rechten.
- Wijzigingen worden online opgeslagen. Er is geen lokale opslag van persoonsgegevens.
- Ingelogde gebruikers zien volledige namen, bracket, speeldata en uitslagen. Alleen beheerders mogen de persoonlijke beschikbaarheden bekijken en wedstrijden of inschrijvingen wijzigen.
- De website biedt momenteel één OHC-evenement (`2026`). Meerdere seizoenen zijn een toekomstige uitbreiding.
- Blindstructuur en forfaitregels zijn nog niet definitief vastgesteld. De derde en vierde plaats worden door de bronsfinale bepaald.
- Gebruik een bestaand OPTSCH-account om de OHC te bekijken. Met een bestaand Ranking-adminaccount zijn ook de beheerdersfuncties toegankelijk. Nieuwe OHC-beheeraccounts worden niet automatisch aangemaakt.

