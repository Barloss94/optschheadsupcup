# OPTSCH Heads-Up Cup (OHC)

De besloten website voor de **OPTSCH Heads-Up Cup**, met directe knock-out (single elimination). Alle toernooi-informatie is alleen toegankelijk na inloggen.

## Resetten, archiveren en nieuwe toernooien (november 2026)

- **Volledig resetten:** Beheer → Toernooi beheren → Toernooi volledig resetten. Bevestig tweemaal (waaronder het intypen van `RESET`). Alle actieve deelnemers, verhinderingen, loting, uitslagen, planning en weekinstellingen worden gewist, zonder archief te maken. Bestaande archieven blijven bewaard.
- **Archiveren en nieuw starten:** vanuit hetzelfde beheerscherm kan de beheerder een archiefnaam invoeren, het huidige toernooi bewaren en een nieuwe, volledig lege competitie starten. Dit is één database-transactie: bij een fout blijft het huidige toernooi intact.
- **Beveiligd archief:** volledige originele snapshots blijven in `ohc_archives` (uitsluitend beheerders), een kopie zonder verhinderingen in `ohc_archive_public` (alleen ingelogde gebruikers). De archiefpagina toont deelnemers, wedstrijden, toernooiboom, speelperiodes en prijzen als alleen-lezen.
- **Instelbare ISO-weeknummers:** Beheer → Instellingen. Vul bij elke ronde de eerste en laatste ISO-week met weekjaar in, bijvoorbeeld `2027-W01` t/m `2027-W02`. De beginweek start op maandag en de eindweek eindigt op zondag. Optionele geblokkeerde kalenderdatums zijn instelbaar. Bestaande vaste afspraken mogen niet buiten de nieuwe perioden worden geplaatst.
- **Nieuwe competitie is blanco:** geen deelnemers, loting, resultaten, speelschema, speelweken of inschrijfdeadline. Titel en deadline worden door de beheerder ingesteld.
- **Veiligheid:** alleen beheerders kunnen resetten of archiveren; acties gebruiken een version-check. Reeds bestaande toernooidata wordt niet automatisch gewijzigd.

## OHC-beheerdersrechten, onafhankelijk van de Ranking

De OHC gebruikt de bestaande gebruikersaccounts van de OPTSCH Ranking-database,
maar heeft **eigen OHC-beheerdersrechten**. Een Ranking-host kan in de OHC
volwaardig beheerder zijn zonder Ranking-admin te worden.

- Bestaande Ranking-admins hebben automatisch ook volledige OHC-beheerrechten.
- Extra OHC-beheerders worden door de databasebeheerder aan de private
  `public.ohc_admin_access`-tabel gekoppeld op `auth.users.id` (met `active=true`).
  De tabel is niet rechtstreeks toegankelijk vanuit de browser en gebruikt RLS.
- `public.ohc_is_admin()` controleert of een ingelogde gebruiker óf
  Ranking-admin óf expliciet OHC-beheerder is; rollen worden **niet**
  overgenomen uit een andere Supabase-database zoals OSC.
- De OHC-RLS-policies voor deelnemersgegevens, privé-toernooidata en archieven,
  en alle mutatie-RPC's (`ohc_save_state`, `ohc_reset_current`,
  `ohc_archive_and_start_new`) gebruiken `ohc_is_admin()`.
- De OHC-website controleert beheerdersrechten door de private
  `ohc_events`-gegevens te laden; een OHC-beheerder ziet dan alle
  beheerschermen zonder aanpassing van de frontend.
- De aparte OSC-accountrechten en de Ranking-rol van een OHC-beheerder
  blijven volledig ongewijzigd.

## Live database

De applicatie gebruikt het bestaande Supabase-project **OPTSCH Ranking** (`lnlaqrljtwrxtfsyotnn`), maar beheert de OHC volledig in afzonderlijke tabellen:

- `public.ohc_events`: volledige deelnemersgegevens, verhinderingen, loting, uitslagen, wedstrijdplanning en versienummer. Alleen OHC-beheerders en bestaande Ranking-admins kunnen deze tabel lezen en wijzigen.
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

## Inschrijfdeadline voor iedere nieuwe editie

- Een nieuwe OHC-competitie begint met een **lege inschrijfdeadline**, lege speelperiodes, geen spelers en geen loting. Er worden geen datums of weeknummers uit eerdere edities overgenomen.
- De beheerder gaat naar **Beheer → Instellingen en deadline** en stelt onder **1. Toernooi en inschrijving instellen** de toernooinaam, uiterste inschrijfdatum **inclusief tijd** en toernooistatus in. Alle tijden worden geïnterpreteerd als **Nederlandse tijd** (met zomer-/wintertijd).
- Onder **2. Speelperiodes per ISO-week** stelt de beheerder daarna de speelweken voor iedere ronde in. Het beheer toont welke van deze twee onderdelen nog niet zijn afgerond.
- Zonder ingevulde deadline blijft de nieuwe editie **in voorbereiding**: handmatig deelnemers toevoegen wordt niet opengesteld, ook niet als de beheerder de status op "Inschrijving open" heeft gezet. Na het verstrijken van de gekozen deadline sluit het handmatig toevoegen van deelnemers automatisch.
- De beheerder mag het ontvangen inschrijvings-CSV-bestand na de deadline nog importeren, bijvoorbeeld om aanmeldingen die op tijd zijn ontvangen alsnog te verwerken. Na de loting kan de import geen nieuwe deelnemers toevoegen.
- **Externe Google Forms-formulieren** worden niet vanuit de OHC-app gesloten; als de inschrijving via een extern formulier loopt, moet de sluitdatum daarvan apart worden ingesteld.
- Na volledig resetten of archiveren en opnieuw starten opent bij een beheerder direct de instellingenpagina van de nieuwe editie.

## Vaste knock-outbracket en beschikbaarheid

- De beheerder voert **één loting** uit voor de eerste ronde. Alle volgende ontmoetingen volgen daarna de vaste knock-outroutes: winnaar van duel 1 speelt tegen winnaar van duel 2, enzovoort. Er wordt **niet opnieuw geloot**.
- De loting houdt rekening met de opgegeven beschikbare weekdagen. **Spelers zonder gezamenlijke speeldag worden zo laat mogelijk tegenover elkaar geplaatst**: eerst probeert de loting alle zulke combinaties in verschillende brackethelften onder te brengen. Als dat niet volledig mogelijk is, minimaliseert de loting ontmoetingen in ronde 1, vervolgens ronde 2, enzovoort.
- Als er drie spelers zijn die elk alleen op een andere dag kunnen, gaat de loting dus **wel door**. Een onvermijdelijke ontmoeting wordt zo laat mogelijk in de bracket geplaatst; wanneer deze spelers elkaar uiteindelijk treffen, spreken zij **onderling een andere datum af binnen de officiële rondeperiode**.
- Optimalisatie gebeurt met meerdere willekeurige indelingen en verbeterstappen. Er is geen vaste plaatsingslijst. Bij ingewikkelde verhinderingen is de uitkomst een best mogelijke **benadering**, geen mathematisch gegarandeerd globaal optimum.
- Bij onvermijdelijke onverenigbaarheid is er **geen afwijzing van de loting**. Er blijven uitsluitend structurele controles over: maximaal 32 deelnemers, elke deelnemer één keer en geen volledig lege eerste-ronde-duels.
- De originele verhinderingen van deelnemers kunnen na de loting door de beheerder worden bijgewerkt. Dit verandert de vaste route in de bracket niet. De website en database controleren de identiteit en structuur van de bracket.
- Een bestaande bracket kan alleen opnieuw worden geloot na een expliciete volledige herstart door de beheerder.
- **Handmatig wisselen in ronde 1:** via **Beheer → Loting → Eerste ronde aanpassen** kunnen beheerders twee eerste-rondeplaatsen (spelers of vrijlotingen) omwisselen zolang nog niet alle duels van ronde 1 zijn afgewerkt. De vaste routes van de latere rondes blijven behouden; er wordt niet opnieuw geloot.
- Vóór bevestiging verschijnt een preview van de nieuwe ontmoetingen, het aantal duels zonder gezamenlijke toegestane speeldag, nieuwe conflicten en mogelijke probleemontmoetingen die eerder in de bracket kunnen ontstaan.
- Een wissel die een al gespeelde wedstrijd van tegenstander verandert, wist uitsluitend de **ongeldig geworden uitslagen en afhankelijke vervolgresultaten**, niet de uitslagen van volledig onaangetaste duels. Herberekende speeldata en eventuele eerder definitief vastgestelde afspraken worden expliciet gewaarschuwd. Omkeren van de thuis/uit-volgorde bij dezelfde twee spelers behoudt de uitslag.
- De beheerder bevestigt een wissel expliciet. Een wijziging die de vaste rondevolgorde of geldigheid van bevestigde data blokkeert kan niet worden opgeslagen. Zodra alle duels van ronde 1 zijn afgewerkt, sluit de wijzigingsmogelijkheid automatisch.

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
- Gebruik een bestaand OPTSCH-account om de OHC te bekijken. Met een bestaand Ranking-adminaccount of een expliciete OHC-beheerdersmachtiging zijn ook de beheerdersfuncties toegankelijk. Nieuwe OHC-beheeraccounts worden niet automatisch aangemaakt.

