import { getSetting, setSetting } from '@/db';
import { itemRepository } from '@/db/repositories/itemRepository';
import { libraryRepository } from '@/db/repositories/libraryRepository';
import { tmdbService } from '@/services/tmdbService';
import type { Library, MediaFormat, MediaType } from '@/types';

const ENABLE_SERIES_IMPORT = true;
const ENABLE_TMDB_LOOKUP = true;
const SERIES_IMPORT_SETTING_KEY = 'import:series:gemensamt';
const MOVIES_IMPORT_SETTING_KEY = 'import:movies:gemensamt';
const TMDB_ENRICH_SETTING_KEY = 'import:tmdb:gemensamt';
const TARGET_LIBRARY_NAME = 'Gemensamt';

const SERIES_CSV = `"title","sound","resolution"
"30 dagar i f?ngelse","AAC","1920x1080"
"99 Saker Man M?ste G?ra Innan Man D?r (2011)","AAC","716x404"
"Avatar - The Legend of Korra (2012)","AC-3","1920x1080"
"Avatar The Last Airbender (2005-2008)","AC-3","1440x1080"
"Bilar B?rgarns hejdl?sa historier (2010)","AC-3","720x576"
"En Fyra F?r Tre (1996)","AC-3","720x576"
"Erik och Mackan g?r Kentucky (2015)","AAC","1280x720"
"Erik och Mackan Hela och rena (2008)","MPEG Audio","640x352"
"Erik och Mackan kn?cker den manliga koden (2012)","AAC","716x404"
"Gumball 3000 med Erik & Mackan (2010)","MPEG Audio","640x352"
"Hem Till Midg?rd (2003)","AAC","720x576"
"Hey Baberiba (2005)","AC-3","720x576"
"Historie?tarna (2012)","AC-3","1280x718"
"Hitler - Ondskans natur (2003)","AC-3","720x576"
"Hj?lp! (2007)","MPEG Audio","640x352"
"Kontoret (2012-2013)","AAC","720x576"
"Lego Star Wars The Freemaker Adventures (2016)","AC-3","720x576"
"LEGO Star Wars The Yoda Chronicles (2013)","AC-3","720x576"
"Nemas Problemas (2015)","AC-3","1920x1080"
"NileCity 105.6 (1995)","AAC","720x576"
"Parlamentet - Det b?sta ur parlamentet (2009)","AC-3","720x576"
"Peaky Blinders (2013)","E-AC-3","1920x960"
"Scooby-Doo, Where Are You! (1969)","AC-3","720x576"
"Solsidan (2010)","AC-3","1920x1076"
"Star Wars The Clone Wars (2008)","DTS","1920x1080"
"The Big Bang Theory (2007)","E-AC-3","1920x1080"
"The Fairly OddParents (2001-2017)","AC-3","1920x1080"
"Tusenbr?der (2002)","AAC","720x576"
"V?rldens st?rsta konspirationer med Erik & Mackan (2013)","AAC","716x404"
"What's New, Scooby-Doo (2002)","AAC","720x576"`;

const MOVIES_CSV = `"title","year","sound","resolution"
"(500) Days of Summer (2009)","2009","DTS","1920x1080"
"2 Fast 2 Furious (2003)","2003","AC-3","720x576"
"2012 (2009)","2012","DTS","1920x1080"
"22 Jump Street (2014)","2014","AC-3","720x576"
"7 Miljon?rer (2006)","2006","AC-3","720x576"
"8 Mile (2002)","2002","AC-3","720x576"
"Adam & Eva (1997)","1997","AC-3","720x576"
"Agent 007 med r?tt att d?da (1962)","1962","AC-3","720x576"
"Agent 007 ser r?tt (1963)","1963","AC-3","720x576"
"Albert & Herbets Jul (1982)","1982","AC-3","720x576"
"Ali G Indahouse (2002)","2002","AC-3","720x576"
"Aloha Scooby Doo (2005)","2005","AC-3","720x576"
"Alvin och g?nget (2007)","2007","AAC","720x576"
"American Gangster (2007)","2007","AC-3","720x576"
"American Pie - The Wedding (2003)","2003","AC-3","720x576"
"American Pie Presents The Naked Mile (2006)","2006","AC-3","720x576"
"Andra sidan h?cken (2006)","2006","AAC","720x576"
"Arthur and the Invisibles 2 Arthur and the Revenge of Maltazard (2009)","2009","AAC","720x576"
"Bad Neighbours 2 (2016)","2016","AC-3","720x576"
"Barnaskrik och j?kelskap (2003)","2003","AC-3","720x576"
"Bean - Den totala katastroffilmen (1997)","1997","MPEG Audio","720x576"
"Beck ? Familjen (2015)","2015","DTS","1920x1080"
"Beck ? H?mndens pris (2001)","2001","AC-3","720x576"
"Beck ? Kartellen (2001)","2001","AC-3","720x576"
"Beck ? Sjukhusmorden (2015)","2015","DTS","1920x1080"
"Beck mannen utan ansikte (2001)","2001","AC-3","720x576"
"Bee Movie (2007)","2007","AC-3","720x576"
"Big Momma's House (2000)","2000","AC-3","720x576"
"Bilar (2006)","2006","AC-3","720x576"
"Bilar 2 (2011)","2011","AC-3","720x576"
"Blazing Saddles (1974)","1974","AAC","720x576"
"Bolt (2008)","2008","AC-3","720x576"
"Bondg?rden (2006)","2006","AC-3","720x576"
"Boog & Elliot ? Vilda v?nner (2006)","2006","AAC","720x576"
"Boog & Elliot 2 ? Vilda v?nner mot husdjuren (2008)","2008","AAC","720x576"
"Boog & Elliot 3 - Cirkusv?nner (2011)","2011","AC-3","720x576"
"Borat (2006)","2006","AAC","720x576"
"Bortspolad (2006)","2006","AC-3","720x576"
"Br?llopsfotografen (2009)","2009","AAC","720x576"
"Cannonball Run (1981)","1981","AC-3","720x576"
"Casino Royale (2006)","2006","AC-3","720x576"
"Chicken Run (2000)","2000","DTS","1920x1080"
"Clueless (1995)","1995","AC-3","720x576"
"Cockpit (2012)","2012","AC-3","720x576"
"Coco Chanel (2008)","2008","AC-3","720x576"
"Cornelis (2010)","2010","AAC","720x576"
"Countdown to Christmas (2002)","2002","AC-3","720x576"
"curious george old mcgeorgie had a farm (2011)","2011","AC-3","720x576"
"Curious George The Big Sleepy and other adventures (2011)","2011","AC-3","720x576"
"Dagboken ? Jag s?kte dig och fann mitt hj?rta (2004)","2004","AC-3","1920x1080"
"Den ofrivillige golfaren (1991)","1991","AC-3","720x576"
"Det v?ras f?r Frankenstein (1974)","1974","AAC","720x576"
"Die Another Day (2002)","2002","AC-3","720x576"
"Dogma (1999)","1999","AC-3","720x576"
"Don't Try This at Home The Steve-O Video (2001)","2001","AC-3","720x576"
"Draktr?naren (2010)","2010","MLP FBA","1920x1080"
"Draktr?naren 2 (2014)","2014","DTS","1920x1080"
"Draktr?naren 3 (2019)","2019","MLP FBA","1920x1080"
"En G?ng I Phuket (2011)","2011","AAC","1920x1080"
"EN HELKV?LL MED TIMON & PUMBAA (1996)","1996","AC-3","720x576"
"En ov?ntad v?nskap (2011)","2011","AAC","1920x1080"
"Eva & Adam ? fyra f?delsedagar och ett fiasko (2001)","2001","AC-3","720x576"
"F9 The Fast Saga (2021)","2021","AC-3","720x576"
"Farsan (2010)","2010","DTS","1920x1080"
"Fast & Furious 4 (2009)","2009","AAC","720x576"
"Fast & Furious 6 (2013)","2013","DTS","1920x1080"
"Fast & Furious 7 (2015)","2015","DTS","1920x1080"
"Fast & Furious 8 (2017)","2017","AC-3","720x576"
"Fast & Furious Hobbs & Shaw (2019)","2019","AC-3","720x576"
"Fast Five (2011)","2011","AC-3","720x576"
"Fast X (2023)","2023","MLP FBA","1920x1080"
"Fight Club (1999)","1999","DTS","1920x1080"
"Forrest Gump (1994)","1994","AAC","720x576"
"Four Lions (2010)","2010","DTS","1920x1040"
"F?rortsungar (2006)","2006","AC-3","720x576"
"Garden State (2004)","2004","AC-3","1920x1080"
"Greven av Monte Cristo (2002)","2002","AAC","720x576"
"Grown Ups (2010)","2010","AC-3","720x576"
"Gudfadern (1972)","1972","AC-3","1920x1080"
"Gudfadern del II (1974)","1974","AC-3","1920x1080"
"Gudfadern del III (1990)","1990","AC-3","1920x1080"
"Gustaf (2004)","2004","AC-3","720x576"
"Hata G?teborg (2007)","2007","AC-3","720x576"
"Herbie Fully Loaded (2005)","2005","AC-3","720x576"
"Herr Peabody & Sherman (2014)","2014","DTS","1920x1080"
"High School Musical (2006)","2006","AC-3","720x576"
"High School Musical 2 (2007)","2007","AC-3","720x576"
"Hip hip hora! (2004)","2004","AC-3","720x576"
"Holiday Fun With Mr Bean (2011)","2011","AAC","720x576"
"Horton Hears a Who! (2008)","2008","AC-3","720x576"
"Hunger Games (2012)","2012","AC-3","720x576"
"Hur m?nga kramar finns det i v?rlden (2013)","2013","AC-3","720x576"
"Hur m?nga lingon finns det i v?rlden (2011)","2011","AC-3","720x576"
"H?lsoresan (1999)","1999","AC-3","720x576"
"Ice Age (2002)","2002","AAC","720x576"
"Ice Age 2 Istiden har aldrig varit hetare (2006)","2006","AAC","720x576"
"Ice Age 3 Det v?ras f?r dinosaurierna (2009)","2009","AC-3","720x576"
"Ice Age 4 Jorden skakar loss (2012)","2012","AC-3","720x576"
"Into The Wild (2007)","2007","AAC","720x576"
"Iskallt uppdrag (1987)","1987","AC-3","720x576"
"Jackass 3 (2010)","2010","AAC","720x576"
"Jimi Hendrix ? Blue Wild Angel Jimi Hendrix Live At The Isle Of Wight (2014)","2014","PCM","1920x1080"
"JUNO (2007)","2007","AC-3","720x576"
"J?nssonligan - Den perfekta st?ten (2015)","2015","AAC","720x576"
"J?nssonligan Dynamitharry (1982)","1982","AAC","720x576"
"J?nssonligan f?r guldfeber (1984)","1984","AAC","720x576"
"J?nssonligan Svarta Diamanten (1992)","1992","AAC","720x576"
"J?nssonligans st?rsta kupp (1995)","1995","AAC","720x576"
"Kalle och chokladfabriken (2005)","2005","AC-3","720x576"
"Kill Bill Volume 2 (2004)","2004","AC-3","720x576"
"Kingpin (1996)","1996","MPEG Audio","720x576"
"Kog?nget (2004)","2004","DTS","1920x1080"
"Koks i lasten (1992)","1992","AAC","720x576"
"Kommissarie Sp?ck (2010)","2010","AC-3","720x576"
"Kopps (2003)","2003","AC-3","720x576"
"Kurt & Courtney (1998)","1998","E-AC-3","1920x1080"
"Kurt Cobain - About a son (2006)","2006","AC-3","1920x1080"
"Kurt Cobain - Montage of heck (2015)","2015","DTS","1920x1080"
"Last Chance Harvey (2008)","2008","AAC","720x576"
"Leva och l?ta d? (1973)","1973","AC-3","720x576"
"Lilla J?nssonligan & stj?rnkuppen (2006)","2006","AAC","720x576"
"Lilla J?nssonligan och cornflakeskuppen (1996)","1996","AC-3","720x576"
"Lilla Kycklingen (2005)","2005","AC-3","720x576"
"Lone Survivor (2013)","2013","AC-3","1920x1080"
"Mamma Mia (2008)","2008","AC-3","720x576"
"Man lever bara tv? g?nger (1967)","1967","AC-3","720x576"
"Moonraker (1979)","1979","AC-3","720x576"
"Narnia (2010)","2010","AC-3","720x576"
"Nasses stora film (2002)","2002","AC-3","720x576"
"Natt p? Museet (2006)","2006","AAC","720x576"
"Natt p? Museet 2 (2009)","2009","AC-3","720x576"
"Need for speed (2014)","2014","DTS","1920x1080"
"Never Say Never Again (1983)","1983","AC-3","720x576"
"Nicke Nyfiken - En apkul jul (2009)","2009","AC-3","720x576"
"Nicke Nyfiken (2006)","2006","AC-3","720x576"
"Nicke Nyfiken 3 - Tillbaka till djungeln (2015)","2015","AC-3","720x576"
"Nyckeln till frihet (1994)","1994","AC-3","1920x1080"
"Ondskan (2003)","2003","AC-3","720x576"
"Pettson och Findus - katten och gubbens ?r (1999)","1999","AC-3","720x576"
"Pingvinerna Fr?n Madagaskar - Uppdrag Semester (2012)","2012","AC-3","720x576"
"Pippi L?ngstrum - M?ter Vita Frun (1997)","1997","AC-3","720x576"
"Pippi L?ngstrump - buskul p? marknaden (1997)","1997","AC-3","720x576"
"Pippi L?ngstrump p? de sju haven (1970)","1970","AC-3","720x576"
"Pippis ballongf?rd (1969)","1969","AC-3","720x576"
"Pirates of the Caribbean- On Stranger Tides (2011)","2011","DTS","1920x1080"
"Pirates of the Caribbean Svarta P?rlans f?rbannelse (2003)","2003","AC-3","720x576"
"Pitch Perfect 2 (2015)","2015","AC-3","720x576"
"Pulp Fiction (1994)","1994","AAC","3840x1634"
"P? sm?llen (2007)","2007","AAC","720x576"
"Rango (2011)","2011","AC-3","1920x1080"
"Red Dawn (2012)","2012","AAC","720x576"
"Resident Evil Extinction (2007)","2007","MLP FBA","1920x1080"
"Ringaren i Notre Dame (1996)","1996","AC-3","1920x1080"
"Ringaren i Notre Dame II (2002)","2002","AC-3","720x576"
"Robin Hood (1973)","1973","AC-3","720x576"
"Robotar (2005)","2005","DTS","1920x1080"
"R?narna (2003)","2003","AC-3","720x576"
"R?jar-Ralf (2012)","2012","DTS","1920x1080"
"Safe Haven (2013)","2013","DTS","1920x1080"
"Sammys ?ventyr 2 (2012)","2012","AC-3","1920x1080"
"Scarface (1983)","1983","AC-3","720x576"
"Scary Movie 3 (2003)","2003","AC-3","720x576"
"Scary Movie V (2013)","2013","AAC","720x576"
"School Of Rock (2004)","2004","AAC","720x576"
"Scooby Doo (Scooby-Doo) (2002)","2002","AAC","720x576"
"Scooby Doo 2 ? Monstren ?r l?sa (2002)","2002","AC-3","720x576"
"Scooby Doo och arabiska n?tter (1994)","1994","AC-3","720x576"
"Scooby Doo och ghoulskolan (1988)","1988","AC-3","720x576"
"Scooby Doo och monstret fr?n Mexico (2003)","2003","AC-3","720x576"
"Scooby-Doo Hassle in the Castle (1969)","1969","AC-3","720x576"
"Scooby-Doo m?ter br?derna Bu (1987)","1987","AC-3","720x576"
"Scooby-Doo Och den Motvillige Varulven (1988)","1988","AAC","720x576"
"Scooby-Doo och legenden om vampyren (2003)","2003","AAC","720x576"
"Scooby-Doo och Loch Ness-monstret (2004)","2004","AAC","720x576"
"Scooby-Doo p? Zombie?n (1998)","1998","AC-3","720x576"
"Scooby-Doo! & Mysteriet med samurajsv?rdet (2008)","2008","AC-3","720x576"
"Scooby-Doo! 13 Spooky Tales Field of Screams (2014)","2014","AC-3","720x576"
"Scooby-Doo! Och Inkr?ktarna Fr?n Rymden (2000)","2000","AC-3","720x576"
"Scooby-Doo! Pirates Ahoy! (2006)","2006","AC-3","720x576"
"Scooby-Doo! Rysliga sommar (2010)","2010","AC-3","720x576"
"Scooby-Doo's Greatest Mysteries (2006)","2006","AAC","720x576"
"scream 4 (2011)","2011","AAC","720x576"
"Sean Banan inuti Seanfrika (2012)","2012","AC-3","720x576"
"Shrek 2 (2004)","2004","AAC","720x576"
"Shrek den tredje (2007)","2007","AC-3","720x576"
"Skattkammarplaneten (2002)","2002","DTS","1920x1080"
"Sk?nheten och odjuret (1991)","1991","DTS","1920x1080"
"Sleepy Hollow (1999)","1999","AAC","720x576"
"Sl?kten ?r v?rst (2000)","2000","AC-3","720x576"
"Sm? citroner gula (2013)","2013","AC-3","720x576"
"Snabba cash - Livet deluxe (2013)","2013","DTS","1920x1080"
"Snabba cash (2010)","2010","AC-3","720x576"
"Snabba cash II (2012)","2012","AC-3","720x576"
"Sn?lvatten och j?kelskap (2001)","2001","AAC","708x576"
"Soaked In Bleach (2015)","2015","AC-3","720x576"
"Sommaren Med G?ran (2009)","2009","AC-3","720x576"
"SOS ? en segels?llskapsresa (1988)","1988","AC-3","720x576"
"Space Jam A New Legacy (2021)","2021","MLP FBA","1920x1080"
"Stand By Me (1986)","1986","AAC","3840x2160"
"Star Trek (2009)","2009","AAC","720x576"
"Star Wars Episod III (2005)","2005","AC-3","720x576"
"Star Wars The Clone Wars (2008)","2008","AC-3","1920x1080"
"Step Up (2006)","2006","AC-3","720x576"
"Step Up 2 The Streets (2008)","2008","AC-3","720x576"
"Sune Och Hans V?rld Dr?mprinsen (2002)","2002","AC-3","720x576"
"Surfs Up (2007)","2007","AAC","720x576"
"Svensson Svensson - filmen (1997)","1997","AC-3","720x576"
"S?llskapsresan (1980)","1980","AC-3","720x576"
"S?llskapsresan II ? Snowroller (1985)","1985","AC-3","720x576"
"Terminator 2 judgement day (1991)","1991","AC-3","720x576"
"Terminator 3 ? Rise of the Machines (2003)","2003","AC-3","720x576"
"The Bucket List (2007)","2007","AAC","1920x1080"
"The Dictator (2012)","2012","AC-3","720x576"
"The Fast and the Furious (2001)","2001","AC-3","720x576"
"The Fast And The Furious Tokyo Drift (2006)","2006","AAC","720x576"
"The Hangover (2009)","2009","AC-3","720x576"
"The Hangover Part III (2013)","2013","AAC","720x576"
"The Inbetweeners (2011)","2011","AC-3","720x576"
"The Lego Movie (2014)","2014","DTS","1920x1080"
"The Lucky One (2012)","2012","AAC","720x576"
"The Penguins Of Madagascar Operation Impossible Possible (2009)","2009","AC-3","720x576"
"The rebound (2009)","2009","DTS","1920x1080"
"The Simpsons Movie (2007)","2007","AC-3","1920x1080"
"The Steve-O Video Vol. II - The Tour Video (2002)","2002","AC-3","720x576"
"The Tourist (2010)","2010","DTS","1920x1080"
"The Wolf of Wall Street (2013)","2013","AC-3","720x576"
"Tid f?r h?mnd (1989)","1989","AAC","720x576"
"Tillbaka till bromma (2014)","2014","DTS","1920x1080"
"Tillbaka till framtiden (1985)","1985","AC-3","720x576"
"Tillbaka till framtiden del II (1989)","1989","AAC","720x576"
"Tillbaka till framtiden del III (1990)","1990","AAC","720x576"
"Tintins ?ventyr Enh?rningens hemlighet (2011)","2011","DTS","1920x1080"
"Titanic (1997)","1997","AC-3","720x576"
"Tjenare Kungen (2005)","2005","AC-3","720x576"
"To The Wonder (2012)","2012","AAC","720x576"
"Tom & Jerry - The Classic Collection 12 (2001)","2001","AC-3","720x576"
"Tom & Jerry firar jul (2003)","2003","AC-3","720x576"
"Tom and Jerry Shiver Me Whiskers (2006)","2006","AC-3","720x576"
"Tomten ?r far till alla barnen (1999)","1999","AC-3","720x576"
"Torkel i Knipa (2004)","2004","E-AC-3","1920x1080"
"Torsk p? Tallinn (1999)","1999","AC-3","720x576"
"Transformers - Revenge of the Fallen (2009)","2009","DTS","1920x1080"
"Turbo (2013)","2013","DTS","1920x1080"
"Tv? tigerbr?der (2004)","2004","AC-3","720x576"
"Ur d?dlig synvinkel (1981)","1981","AC-3","720x576"
"Vad kvinnor vill ha (2000)","2000","AC-3","720x576"
"Valiant (2005)","2005","AC-3","720x576"
"Venom (2018)","2018","DTS","1920x1080"
"V?rlden r?cker inte till (1999)","1999","AC-3","720x576"
"Wall-E (2008)","2008","AAC","1920x1080"
"Winter Wonderland (2003)","2003","AC-3","720x576"
"Zuper Zebran (2005)","2005","AC-3","720x576"`;

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  const lines = csv.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;
    const row: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    row.push(current);
    rows.push(row.map(value => value.trim()));
  }

  return rows;
}

function parseTitle(title: string): { cleanTitle: string; year?: number } {
  const match = title.match(/\s*\((\d{4})(?:-\d{4})?\)\s*$/);
  if (!match) {
    return { cleanTitle: title.trim() };
  }

  const year = Number(match[1]);
  const cleanTitle = title.replace(match[0], '').trim();
  return { cleanTitle, year };
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

function createLookupKey(title: string, type: MediaType, year?: number): string {
  return `${normalizeTitle(title)}|${type}|${year ?? 'unknown'}`;
}

function normalizeResolution(resolution?: string): string | undefined {
  if (!resolution) return undefined;
  const trimmed = resolution.trim();
  if (trimmed === '720x576') return '720p';
  if (trimmed === '1920x1080') return '1080p';
  if (trimmed === '3840x2160') return '4K';
  return trimmed;
}

async function getOrCreateGemensamtLibrary(ownerId: string): Promise<Library> {
  const libraries = await libraryRepository.getByOwner(ownerId);
  const existing = libraries.find(
    library => library.name.trim().toLowerCase() === TARGET_LIBRARY_NAME.toLowerCase()
  );

  if (existing) {
    return existing;
  }

  return libraryRepository.create(ownerId, TARGET_LIBRARY_NAME, {
    description: 'Delat bibliotek',
    icon: '🤝',
    isShared: true,
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

export async function runOneTimeSeriesImport(ownerId: string): Promise<{ imported: number; skipped: boolean }> {
  if (!ENABLE_SERIES_IMPORT) {
    return { imported: 0, skipped: true };
  }

  const shouldUseTmdb = ENABLE_TMDB_LOOKUP && tmdbService.isAvailable();
  const library = await getOrCreateGemensamtLibrary(ownerId);
  const seriesImported = await importFromCsv({
    csv: SERIES_CSV,
    type: 'series',
    defaultFormat: 'Digital',
    ownerId,
    library,
    settingKey: SERIES_IMPORT_SETTING_KEY,
    useYearColumn: false,
    useTmdbLookup: shouldUseTmdb,
  });

  const movieImported = await importFromCsv({
    csv: MOVIES_CSV,
    type: 'movie',
    defaultFormat: 'Digital',
    ownerId,
    library,
    settingKey: MOVIES_IMPORT_SETTING_KEY,
    useYearColumn: true,
    useTmdbLookup: shouldUseTmdb,
  });

  if (shouldUseTmdb) {
    await enrichTmdbForLibrary({
      ownerId,
      libraryId: library.libraryId,
      settingKey: TMDB_ENRICH_SETTING_KEY,
      delayMs: 750,
    });
  }

  return {
    imported: seriesImported + movieImported,
    skipped: seriesImported === 0 && movieImported === 0 && !shouldUseTmdb,
  };
}

async function importFromCsv(options: {
  csv: string;
  type: MediaType;
  defaultFormat: MediaFormat;
  ownerId: string;
  library: Library;
  settingKey: string;
  useYearColumn: boolean;
  useTmdbLookup: boolean;
}): Promise<number> {
  const hasRun = await getSetting(options.settingKey);
  if (hasRun === 'done') {
    return 0;
  }

  const shouldUseTmdb = options.useTmdbLookup && tmdbService.isAvailable();
  const rows = parseCsvRows(options.csv);
  const dataRows = rows.slice(1);

  let imported = 0;

  for (const row of dataRows) {
    if (options.useYearColumn) {
      const [rawTitle, rawYear, sound, resolution] = row;
      if (!rawTitle) continue;

      const { cleanTitle, year } = parseTitle(rawTitle);
      const parsedYear = Number(rawYear);
      const resolvedYear = Number.isFinite(parsedYear) ? parsedYear : year;
      const tmdbId = shouldUseTmdb
        ? await lookupTmdbId(cleanTitle, options.type, resolvedYear)
        : undefined;
      await itemRepository.create(
        options.library.libraryId,
        options.ownerId,
        {
          type: options.type,
          title: cleanTitle,
          format: options.defaultFormat,
          year: resolvedYear,
          tmdbId: tmdbId ?? undefined,
          audioInfo: sound || undefined,
          videoInfo: normalizeResolution(resolution),
        },
        options.library.sharedLibraryId
      );
      imported += 1;
    } else {
      const [rawTitle, sound, resolution] = row;
      if (!rawTitle) continue;

      const { cleanTitle, year } = parseTitle(rawTitle);
      const tmdbId = shouldUseTmdb
        ? await lookupTmdbId(cleanTitle, options.type, year)
        : undefined;
      await itemRepository.create(
        options.library.libraryId,
        options.ownerId,
        {
          type: options.type,
          title: cleanTitle,
          format: options.defaultFormat,
          year,
          tmdbId: tmdbId ?? undefined,
          audioInfo: sound || undefined,
          videoInfo: normalizeResolution(resolution),
        },
        options.library.sharedLibraryId
      );
      imported += 1;
    }

    if (shouldUseTmdb) {
      await sleep(750);
    }
  }

  await setSetting(options.settingKey, 'done');
  return imported;
}

async function lookupTmdbId(title: string, type: MediaType, year?: number): Promise<number | null> {
  console.log(`[TMDB import] Searching: "${title}" (${type}${year ? `, ${year}` : ''})`);
  const results = await tmdbService.search(title, type, year);
  if (results.length === 0) {
    console.log(`[TMDB import] No match for: "${title}" (${type}${year ? `, ${year}` : ''})`);
    return null;
  }

  const match = results[0];
  console.log(`[TMDB import] Matched "${title}" -> TMDB ${match.id} (${match.title})`);
  await tmdbService.getDetails(match.id, type);
  return match.id;
}

async function enrichTmdbForLibrary(options: {
  ownerId: string;
  libraryId: string;
  settingKey: string;
  delayMs: number;
}): Promise<void> {
  const hasRun = await getSetting(options.settingKey);
  if (hasRun === 'done') {
    return;
  }

  const items = await itemRepository.getByLibrary(options.libraryId);
  const itemsByKey = new Map(
    items.map(item => [
      createLookupKey(item.title, item.type, item.year),
      item,
    ])
  );

  const allRows = [...parseCsvRows(SERIES_CSV), ...parseCsvRows(MOVIES_CSV)].slice(1);
  for (const row of allRows) {
    const [rawTitle, maybeYear] = row;
    if (!rawTitle) continue;

    const { cleanTitle, year: parsedYear } = parseTitle(rawTitle);
    const year = Number.isFinite(Number(maybeYear)) ? Number(maybeYear) : parsedYear;
    const type: MediaType = row.length === 4 ? 'movie' : 'series';
    const key = createLookupKey(cleanTitle, type, year);
    const existing = itemsByKey.get(key);
    if (!existing || existing.tmdbId) continue;

    const tmdbId = await lookupTmdbId(cleanTitle, type, year);
    if (!tmdbId) continue;

    await itemRepository.update(existing.itemId, { tmdbId });
    await sleep(options.delayMs);
  }

  await setSetting(options.settingKey, 'done');
}
