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

- De beheerder voert **één willekeurige loting** uit: spelers worden over de eerste ronde en eventuele vrijlotingen verdeeld.
- Vanaf dat moment zijn alle routes vastgelegd. De winnaars van duels 1 en 2 komen bij elkaar in het eerste duel van de volgende ronde, de winnaars van duels 3 en 4 in het tweede duel, enzovoort.
- De toernooiboom toont de routes met verbindingslijnen, ook voordat winnaars bekend zijn. Onbekende deelnemers worden weergegeven als `Winnaar R1 · duel 1` enzovoort.
- Na een ingevoerde uitslag schuift de winnaar automatisch door naar het vooraf vastliggende vak. **Geen nieuwe loting per ronde.**
- Een bestaande bracket kan niet onbedoeld opnieuw geloot worden; uitsluitend een expliciete volledige herstart door de beheerder wist de loting.

## Officieel speelschema 2026–2027

| Ronde | ISO-weken | Toegestane periode | Niet spelen |
|---|---|---|---|
| 1 | 49/50 2026 | 30 november t/m 13 december 2026 | 4, 5 en 6 december |
| 2 | 51/52 2026 | 14 t/m 27 december 2026 | 24, 25 en 26 december |
| 3 | 1/2 2027 | 4 t/m 17 januari 2027 | geen aanvullende uitzonderingen |
| 4 | 2/3 2027 | 11 t/m 24 januari 2027 | geen aanvullende uitzonderingen |
| 5 | 3/4 2027 | 18 t/m 31 januari 2027 | geen aanvullende uitzonderingen |

De loting verdeelt de wedstrijden automatisch zo gelijkmatig mogelijk over de toegestane dagen binnen de eigen ronde. Elke wedstrijd in een vervolgronde moet **na** zijn voorgaande duels vallen; dat geldt ook voor de overlappende periodes van ronde 3, 4 en 5. Automatische datums zijn voorlopig totdat de organisatie ze bevestigt. Speeldatums buiten de rondes of op uitgesloten dagen worden door de browser **en de database** geweigerd.

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
- Blindstructuur, buy-in, prijzen en forfaitregels zijn nog niet definitief vastgesteld.
- Gebruik het bestaande Ranking-adminaccount. Nieuwe OHC-beheeraccounts worden niet automatisch aangemaakt.
