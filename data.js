// Effektive Gesamtabgabenquote in Deutschland nach Einkommensgruppe, 1950-2025
// Werte in Prozent des Bruttoeinkommens (inkl. Steuern + Sozialabgaben, inkl. AG-Anteil).
//
// Keyframes: Jahre mit belegten oder rekonstruierten Werten.
// Zwischen den Keyframes wird linear interpoliert.
//
// Quellen: DIW Wochenbericht 51+52/2016 (Bach/Beznoska/Steiner),
//          DIW DP 767/2013 (Bach/Corneo/Steiner),
//          IW-Report 6/2020, RWI/FNS 2021, Destatis VGR.

const INCOME_GROUPS = [
  { key: "d1",    label: "Untere 10%",    x: 0,   note: "Geringste Einkommen" },
  { key: "p30",   label: "30. Perzentil", x: 1 },
  { key: "p50",   label: "Median",         x: 2 },
  { key: "p70",   label: "70. Perzentil", x: 3 },
  { key: "p90",   label: "90. Perzentil", x: 4 },
  { key: "top5",  label: "Top 5%",        x: 5 },
  { key: "top1",  label: "Top 1%",        x: 6 },
  { key: "top01", label: "Top 0,1%",      x: 7 },
  { key: "top400",label: "Reichste 400",  x: 8, note: "Top 0,001%" },
];

// Reihenfolge der Werte muss INCOME_GROUPS entsprechen
// "values" = effektive Gesamtabgabenquote in %
// "incomes" = grobe Nominalwerte des jährlichen Brutto-Einkommens pro Person in EUR
//            (DM vor 2002 mit 0,5113 €/DM umgerechnet; Reichste 400 auf Basis realisierter
//             Einkommen / Vermögensertrag grob geschätzt)
const KEYFRAMES = [
  { year: 1950, quality: "rekonstruiert",
    values:  [15,   18,    20,    22,    25,    28,    32,    35,     35],
    incomes: [400,  750,   1100,  1500,  2500,  3800,  10000, 40000,  500000] },
  { year: 1960, quality: "rekonstruiert",
    values:  [18,   22,    24,    26,    30,    33,    38,    42,     40],
    incomes: [1000, 2000,  3000,  4300,  7500,  11000, 30000, 150000, 2500000] },
  { year: 1970, quality: "rekonstruiert",
    values:  [22,   28,    30,    32,    36,    38,    42,    45,     42],
    incomes: [1800, 3500,  6000,  9000,  15000, 22000, 60000, 250000, 7500000] },
  { year: 1980, quality: "rekonstruiert",
    values:  [28,   33,    36,    38,    42,    43,    45,    46,     42],
    incomes: [4000, 9000,  14000, 21000, 35000, 50000, 125000,500000, 25000000] },
  { year: 1990, quality: "rekonstruiert",
    values:  [30,   34,    38,    42,    46,    46,    45,    45,     40],
    incomes: [7000, 16000, 24000, 35000, 60000, 87500, 200000,750000, 50000000] },
  { year: 2000, quality: "teilweise belegt",
    values:  [31,   36,    40,    45,    50,    48,    42,    38,     34],
    incomes: [10000,18000, 25000, 38000, 65000, 95000, 200000,800000, 80000000] },
  { year: 2010, quality: "teilweise belegt",
    values:  [30,   36,    40,    45,    50,    46,    38,    34,     30],
    incomes: [12000,22000, 30000, 45000, 75000, 110000,250000,1000000,150000000] },
  { year: 2015, quality: "belegt (DIW)",
    values:  [28.9, 36.2,  40.7,  47.0,  51.7,  47.0,  43.1,  42.9,   34.0],
    incomes: [14000,25000, 33000, 50000, 85000, 125000,280000,1200000,250000000] },
  { year: 2025, quality: "Fortschreibung",
    values:  [32,   34,    39,    42,    45,    42,    39,    37,     30],
    incomes: [18000,32000, 45000, 65000, 110000,160000,350000,1500000,500000000] },
];

const ANNOTATIONS = [
  {
    fromYear: 1950,
    toYear: 1969,
    text: "<strong>Nachkriegsjahre &amp; Wirtschaftswunder.</strong> Hoher Spitzensteuersatz (80%, ab 1958: 53%), aber Sozialversicherung noch schlank. Gesamtbelastung niedriger als heute &ndash; besonders im Mittelbau."
  },
  {
    fromYear: 1970,
    toYear: 1989,
    text: "<strong>Ausbau des Sozialstaats.</strong> Rentenreform, Arbeitslosenversicherung, steigende Beiträge. Die Gesamtabgabenquote klettert von ~36% auf ~41% des BIP. Mittelstand tr&auml;gt mehr."
  },
  {
    fromYear: 1990,
    toYear: 1999,
    text: "<strong>Wiedervereinigung &amp; Solidarit&auml;tszuschlag.</strong> Zusatzbelastung f&uuml;r alle. Spitzensatz noch 53%. Top-Einkommen tragen eine der h&ouml;chsten effektiven Lasten der Nachkriegszeit."
  },
  {
    fromYear: 2000,
    toYear: 2009,
    text: "<strong>Eichel-Reform 2001&ndash;2005.</strong> Spitzensatz 53% &rarr; 42%, Halbeink&uuml;nfteverfahren, Unternehmensteuerreform. Die effektive Last der Top 0,1% sinkt deutlich &ndash; die Kurve knickt rechts ab."
  },
  {
    fromYear: 2010,
    toYear: 2019,
    text: "<strong>Progressions-Plateau.</strong> Das 9. Dezil tr&auml;gt die h&ouml;chste Last (~52%). Die Reichsten dar&uuml;ber zahlen effektiv weniger &ndash; der deutsche &bdquo;Reich-Effekt&ldquo; ist belegt (DIW 2016)."
  },
  {
    fromYear: 2020,
    toYear: 2025,
    text: "<strong>Aktuell.</strong> Teilabschaffung Soli (2021), h&ouml;here Grundfreibetr&auml;ge, gestiegene Sozialbeitr&auml;ge. Mittelstand bei ~42&ndash;45%, Super-Reiche bei ~30% &ndash; die Progressionskurve kippt am rechten Rand."
  },
];

// --- Interpolations-Helfer ------------------------------------------------

function interpolateValues(year) {
  // Clamp
  const yMin = KEYFRAMES[0].year;
  const yMax = KEYFRAMES[KEYFRAMES.length - 1].year;
  if (year <= yMin) return KEYFRAMES[0].values.slice();
  if (year >= yMax) return KEYFRAMES[KEYFRAMES.length - 1].values.slice();

  let i = 0;
  while (KEYFRAMES[i + 1].year < year) i++;
  const a = KEYFRAMES[i];
  const b = KEYFRAMES[i + 1];
  const t = (year - a.year) / (b.year - a.year);
  return a.values.map((v, idx) => v + (b.values[idx] - v) * t);
}

function interpolateIncomes(year) {
  const yMin = KEYFRAMES[0].year;
  const yMax = KEYFRAMES[KEYFRAMES.length - 1].year;
  if (year <= yMin) return KEYFRAMES[0].incomes.slice();
  if (year >= yMax) return KEYFRAMES[KEYFRAMES.length - 1].incomes.slice();
  let i = 0;
  while (KEYFRAMES[i + 1].year < year) i++;
  const a = KEYFRAMES[i];
  const b = KEYFRAMES[i + 1];
  const t = (year - a.year) / (b.year - a.year);
  // Logarithmisch interpolieren (Einkommen wachsen geometrisch durch Inflation + Wachstum)
  return a.incomes.map((v, idx) => {
    const w = b.incomes[idx];
    return Math.exp(Math.log(v) + (Math.log(w) - Math.log(v)) * t);
  });
}

function formatIncome(eur) {
  if (eur >= 1e9) return (eur / 1e9).toLocaleString("de-DE", { maximumFractionDigits: 1 }) + " Mrd \u20AC";
  if (eur >= 1e6) {
    const v = eur / 1e6;
    return v.toLocaleString("de-DE", { maximumFractionDigits: v < 10 ? 1 : 0 }) + " Mio \u20AC";
  }
  if (eur >= 10000) return Math.round(eur / 1000) + " Tsd \u20AC";
  if (eur >= 1000) {
    const v = eur / 1000;
    return v.toLocaleString("de-DE", { maximumFractionDigits: 1 }) + " Tsd \u20AC";
  }
  return Math.round(eur) + " \u20AC";
}

function qualityForYear(year) {
  const yMin = KEYFRAMES[0].year;
  const yMax = KEYFRAMES[KEYFRAMES.length - 1].year;
  if (year <= yMin) return KEYFRAMES[0].quality;
  if (year >= yMax) return KEYFRAMES[KEYFRAMES.length - 1].quality;
  let i = 0;
  while (KEYFRAMES[i + 1].year < year) i++;
  return KEYFRAMES[i].quality;
}

function annotationForYear(year) {
  return ANNOTATIONS.find(a => year >= a.fromYear && year <= a.toYear);
}

const YEAR_MIN = KEYFRAMES[0].year;
const YEAR_MAX = KEYFRAMES[KEYFRAMES.length - 1].year;
