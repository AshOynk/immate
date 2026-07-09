/*
 * Deterministic generator for an illustrative UK MPs' business-costs dataset.
 *
 * The figures are SYNTHETIC but modelled on the real structure and typical
 * ranges of IPSA's published "MPs' staffing and business costs" data
 * (staffing dominates; accommodation is often £0 for London-area members;
 * travel varies widely by geography). Party seat counts mirror the 2024
 * General Election result so the by-party averages behave realistically.
 *
 * Real figures can be loaded at runtime via the site's CSV import (official
 * IPSA "individual business costs" export). This generator only seeds the
 * out-of-the-box demo so the app is useful with zero setup.
 *
 * Output: assets/data.js  ->  window.EXPENSES_DATA = { ... }
 */
import { writeFileSync } from 'node:fs';

// --- deterministic PRNG (mulberry32) so builds are reproducible ---------
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20240704);
const rand = (min, max) => min + (max - min) * rnd();
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const round = (n) => Math.round(n);

// --- parties: brand colour + seat share (2024 GE-ish) -------------------
const PARTIES = [
  { name: 'Labour',            short: 'Lab', colour: '#d4122a', seats: 180, region: 'GB' },
  { name: 'Conservative',      short: 'Con', colour: '#0a3b7c', seats: 90,  region: 'GB' },
  { name: 'Liberal Democrats', short: 'LD',  colour: '#e88b1a', seats: 52,  region: 'GB' },
  { name: 'Scottish National Party', short: 'SNP', colour: '#f4c300', seats: 18, region: 'Scotland' },
  { name: 'Reform UK',         short: 'Ref', colour: '#12b6cf', seats: 12,  region: 'GB' },
  { name: 'Green',             short: 'Grn', colour: '#5fae2f', seats: 8,   region: 'GB' },
  { name: 'Plaid Cymru',       short: 'PC',  colour: '#118a7e', seats: 6,   region: 'Wales' },
  { name: 'Democratic Unionist', short: 'DUP', colour: '#8c1b2f', seats: 5, region: 'N. Ireland' },
  { name: 'Independent',       short: 'Ind', colour: '#6b6a66', seats: 5,   region: 'GB' },
];

// --- name + place pools (generic; individuals are synthetic) ------------
const FIRST = ['James','Sarah','David','Emma','Michael','Rachel','Thomas','Priya','Andrew','Fatima','John','Claire','Robert','Aisha','Daniel','Laura','Mark','Hannah','Paul','Sofia','Peter','Grace','Stephen','Amara','Richard','Beth','Simon','Nadia','Alan','Ruth','George','Olivia','Ian','Chloe','Kevin','Meera','Neil','Zara','Colin','Helen','Gareth','Isla','Raj','Yasmin','Owen','Bethan','Callum','Niamh','Seamus','Eilidh'];
const LAST = ['Whitfield','Osei','Mbeki','Harrington','Blackwood','Nasser','Fairweather','Kaur','Donnelly','Ashworth','Pemberton','Okafor','Sinclair','Rahman','Bletchley','Marsden','Cadwallader','Fitzgerald','Holloway','Ravensdale','Thornbury','Adeyemi','MacLeod','Underhill','Pennington','Griffiths','Somerville','Beaumont','Crawford','Nkemdirim','Ellery','Broadhurst','Winterbourne','Latham','Ferndale','Quigley','Kowalski','Ambrose','Redfern','Hollis','Tregear','Aberdeen','Silvermoor','Chowdhury','Lockhart','Merriweather','Dunbar','Pryce','Alvarez','Featherstone'];
const PLACES = ['Ashfield','Barrowdale','Brighton East','Cambridge West','Carlisle','Chesterford','Colwyn','Dartmoor','Eastleigh','Falkirk','Fenwick','Glenmore','Harewood','Hartlepool','Holbeck','Ilkeston','Kelvingrove','Kingsmere','Langdale','Ludlow','Marchwood','Merthyr','Newquay','Oakhampton','Penrith','Redbridge','Rossendale','Selby','Skelton','Southwark','Stirling','Tamworth','Thanet','Tredegar','Uxbridge','Wakefield','Walsall','Wenlock','Whitby','Yarmouth','Aberfeldy','Blackthorn','Coombe Valley','Dunholme','Ferrybank','Greystone','Highbourne','Inglewood','Kestrelton','Larkfield'];
const REGIONS = ['London','South East','South West','East of England','West Midlands','East Midlands','Yorkshire & Humber','North West','North East','Wales','Scotland','N. Ireland'];
const ROLES = ['Backbencher','Backbencher','Backbencher','Backbencher','Select Committee Chair','Shadow Minister','Minister','Whip'];

function regionFor(party) {
  if (party.region === 'Scotland') return 'Scotland';
  if (party.region === 'Wales') return 'Wales';
  if (party.region === 'N. Ireland') return 'N. Ireland';
  return pick(REGIONS.filter((r) => !['Scotland','Wales','N. Ireland'].includes(r)));
}

// London-area members claim little/no accommodation; distant members claim more travel.
function accommodationBase(region) {
  if (region === 'London') return rand(0, 900);
  if (['South East','East of England'].includes(region)) return rand(0, 8000);
  return rand(14000, 24000);
}
function travelBase(region) {
  if (region === 'London') return rand(1200, 6000);
  if (['Scotland','N. Ireland'].includes(region)) return rand(14000, 38000);
  if (['North West','North East','Wales','Yorkshire & Humber'].includes(region)) return rand(8000, 24000);
  return rand(3000, 14000);
}

const usedNames = new Set();
function uniqueName() {
  let n; do { n = `${pick(FIRST)} ${pick(LAST)}`; } while (usedNames.has(n));
  usedNames.add(n); return n;
}
const usedPlaces = new Set();
function uniquePlace() {
  let p, i = 0;
  do { p = pick(PLACES); if (usedPlaces.has(p)) p = `${p} ${['North','South','Central','& District'][i % 4]}`; i++; }
  while (usedPlaces.has(p) && i < 8);
  usedPlaces.add(p); return p;
}

const mps = [];
let id = 0;
for (const party of PARTIES) {
  for (let i = 0; i < party.seats; i++) {
    const region = regionFor(party);
    const role = pick(ROLES);
    // Staffing is the dominant budget; ministers/chairs skew slightly higher.
    const roleBoost = role === 'Minister' ? 1.06 : role === 'Select Committee Chair' ? 1.04 : 1;
    const staffing = rand(148000, 232000) * roleBoost;
    const office = rand(11000, 31000);
    const accommodation = accommodationBase(region);
    const travel = travelBase(region);
    const other = rand(0, 9000);
    mps.push({
      id: id++,
      name: uniqueName(),
      party: party.name,
      constituency: uniquePlace(),
      region,
      role,
      staffing: round(staffing),
      office: round(office),
      accommodation: round(accommodation),
      travel: round(travel),
      other: round(other),
    });
  }
}

const CATEGORIES = [
  { key: 'staffing', label: 'Staffing' },
  { key: 'office', label: 'Office Costs' },
  { key: 'accommodation', label: 'Accommodation' },
  { key: 'travel', label: 'Travel & Subsistence' },
  { key: 'other', label: 'Other' },
];

const partyMeta = {};
for (const p of PARTIES) partyMeta[p.name] = { colour: p.colour, short: p.short };

const out = {
  meta: {
    title: 'UK MPs’ Business Costs & Expenses',
    period: '2023–24 financial year',
    source: 'ILLUSTRATIVE / SYNTHETIC data modelled on IPSA’s published structure. Import the official IPSA CSV to view real figures.',
    generated: '2024-07-04',
    currency: 'GBP',
    categories: CATEGORIES,
    parties: partyMeta,
  },
  mps,
};

writeFileSync(
  new URL('./assets/data.js', import.meta.url),
  '/* AUTO-GENERATED by build-data.mjs — synthetic illustrative dataset. */\n' +
  'window.EXPENSES_DATA = ' + JSON.stringify(out) + ';\n'
);

const total = mps.reduce((s, m) => s + m.staffing + m.office + m.accommodation + m.travel + m.other, 0);
console.log(`Generated ${mps.length} MPs across ${PARTIES.length} parties. Total spend £${(total/1e6).toFixed(1)}m. avg £${Math.round(total/mps.length).toLocaleString()}`);
