# OPTSCH Heads-Up Cup (OHC)

De openbare website voor de **OPTSCH Heads-Up Cup**, met directe knock-out (single elimination).

## Live database

De applicatie gebruikt het bestaande Supabase-project **OPTSCH Ranking** (`lnlaqrljtwrxtfsyotnn`), maar beheert de OHC volledig in afzonderlijke tabellen:

- `public.ohc_events`: volledige deelnemersgegevens, verhinderingen, loting, uitslagen, wedstrijdplanning en versienummer. Alleen bestaande Ranking-beheerders kunnen deze tabel lezen en wijzigen.
- `public.ohc_public_events`: beveiligd afgeleid publiek overzicht met afgekorte spelersnamen, loting en wedstrijduitslagen.
- `public.ohc_save_state(...)`: bewaart een wijziging transactioneel, controleert de beheerrol en voorkomt overschrijven van nieuwere toernooiversies.

De databasewijziging is geregistreerd onder de migratie `create_ohc_isolated_tournament_tables`. De bestaande Ranking-tabellen zijn niet aangepast.

De API-sleutel in `index.html` is uitsluitend een **publishable** sleutel. Beveiliging verloopt via Supabase Auth en Row Level Security (RLS).

## Website

Open `index.html` in een browser via een HTTP-server of gebruik GitHub Pages. De website bevat:

- Publiek overzicht en deelnemerslijst
- Speelschema en afgekorte namen voor bezoekers
- Automatische knock-outtoernooiboom, vrijloten en voortgang
- Beveiligde beheerlogin met het bestaande Ranking-adminaccount
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

## Vaste knock-outbracket

- De beheerder voert **één beschikbaarheidsgestuurde willekeurige loting** uit: spelers worden binnen de speelbare beperkingen willekeurig verdeeld over de eerste ronde en eventuele vrijlotingen.
- Vanaf dat moment zijn alle routes vastgelegd. De winnaars van duels 1 en 2 komen bij elkaar in het eerste duel van de volgende ronde, de winnaars van duels 3 en 4 in het tweede duel, enzovoort.
- De toernooiboom toont de routes met verbindingslijnen, ook voordat winnaars bekend zijn. Onbekende deelnemers worden weergegeven als `Winnaar R1 · duel 1` enzovoort.

### Beschikbaarheid in de volledige bracket

- Het systeem controleert alle **mogelijke** ontmoetingen vanaf ronde 1 tot en met de halve finale. Spelers die geen enkele gezamenlijke speeldag hebben, mogen niet in dezelfde brackethelft terechtkomen.
- In de **finale en bronsfinale** kunnen spelers zonder gezamenlijke opgegeven beschikbare speeldag tegenover elkaar komen te staan. De spelers spreken dan onderling een toegestane speeldag af binnen de finaleperiode.
- De verdeling van deelnemers over de twee brackethelften wordt berekend voordat de loting definitief wordt vastgelegd. Andere combinaties en de plaatsing van vrijloten worden vervolgens willekeurig bepaald binnen de geldige mogelijkheden.
- Als de verhinderingen onmogelijk over de twee brackethelften te verdelen zijn, **wordt er niet geloot**. Een melding geeft aan dat beschikbaarheid of afspraken moeten worden aangepast; het systeem forceert nooit een ongeldige bracket.
- De website controleert ook veranderingen achteraf (handmatige wijziging van verhinderingen, CSV-import en back-upherstel). Een extra database-trigger weigert ongeldige wijzigingen zelfs als een client de gebruikersinterface omzeilt.
- **Belangrijk:** een niet als verhinderd opgegeven dag geldt als beschikbaar, ook zaterdag en zondag. Controleer daarom alle zeven dagen voor de loting, vooral wanneer een speler aangeeft uitsluitend op één dag te kunnen.

- Na een ingevoerde uitslag schuift de winnaar automatisch door naar het vooraf vastliggende vak. **Geen nieuwe loting per ronde.**
- Een bestaande bracket kan niet onbedoeld opnieuw geloot worden; uitsluitend een expliciete volledige herstart door de beheerder wist de loting.

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

De planning verdeelt de speeldagen vooraf zo gelijkmatig mogelijk binnen hun rondeperiode, rekening houdend met de verhinderingen en de vaste bracket. Elke wedstrijd in een vervolgronde moet **na** zijn voorgaande duels plaatsvinden. Dat geldt ook voor de overlappende periodes van ronde 3, 4 en 5. Speeldatums buiten de rondeperiodes of op uitgesloten dagen blijven verboden.

### Speeldag en starttijd (vastgesteld)

- **Standaard:** de vooraf geplande speeldag met een starttijd van **20:00 uur**.
- **In onderling overleg:** beide spelers mogen de **speeldag en/of starttijd** wijzigen, mits de nieuwe speeldag binnen de officiële rondeperiode ligt en de rondevolgorde en uitgesloten dagen worden gerespecteerd.
- **Administratie:** de beheerder legt de afspraak vast en vinkt aan dat **beide spelers akkoord** zijn. Zonder dit akkoord kan een datum- of tijdwijziging niet worden bevestigd.
- **Automatisch opnieuw plannen:** bevestigde afspraken worden niet stilzwijgend overschreven; eventuele conflicten komen ter beoordeling bij de beheerder.
- Deze afspraken gelden **ook voor de finale en de bronsfinale**.

De kalender biedt vijf rondes, dus maximaal **32 deelnemers** bij directe knock-out. De beheerder kan verhinderingen van deelnemers instellen, ook op zaterdag en zondag. Als geen gezamenlijke dag in de betreffende ronde mogelijk is, blijft het duel ongepland en krijgt het beheer hiervan een melding. Vrijloten zijn geen duels en worden niet ingepland. De officiële loting wordt niet automatisch uitgevoerd door deze wijziging.

## Publiceren op GitHub Pages

De repository heeft een GitHub Pages-workflow op `.github/workflows/pages.yml`.

1. Ga naar **Settings → Pages** van deze repository.
2. Stel bij **Build and deployment → Source** de optie **GitHub Actions** in.
3. Start indien nodig de workflow **Deploy OHC website** bij **Actions**.
4. De website is dan normaal bereikbaar via **https://barloss94.github.io/optschheadsupcup/**.

Als de URL nog niet bereikbaar is, is GitHub Pages nog niet geactiveerd of is de workflow nog niet afgerond.

## Veiligheid en aandachtspunten

- Bezoekers kunnen geen wijzigingen uitvoeren; de database bepaalt de rechten.
- Wijzigingen worden online opgeslagen. Er is geen lokale opslag van persoonsgegevens.
- De beheerders zien volledige namen en beschikbaarheid; de publieke tabellen tonen alleen de eerste voornaam en de eerste letter van de laatste achternaam.
- De website biedt momenteel één OHC-evenement (`2026`). Meerdere seizoenen zijn een toekomstige uitbreiding.
- Blindstructuur en forfaitregels zijn nog niet definitief vastgesteld. De derde en vierde plaats worden door de bronsfinale bepaald.
- Gebruik het bestaande Ranking-adminaccount. Nieuwe OHC-beheeraccounts worden niet automatisch aangemaakt.
