// Verteilung des Netto-Privatvermögens in Deutschland, 1950-2025
//
// "shares" = Anteil am Gesamt-Nettovermögen in % (5 Gruppen, Summe 100 %)
// "medianWealth" = ungefähres Median-Nettovermögen pro Erwachsenem in EUR
//                  (Nominalwerte, DM vor 2002 zu 0,5113 €/DM umgerechnet)
//
// Quellen: WID.world DE Wealth Tables, Bach/Thiemann/Zucco 2018 ("Missing Rich"),
//          Grabka/Westermeier DIW 2019/2023, Bartels/Schularick 2019, Bundesbank PHF.

const WEALTH_GROUPS = [
  { key: "b50",   label: "Untere 50 %",    population: 500, color: "#4ade80", short: "untere H\u00e4lfte" },
  { key: "m40",   label: "Mittlere 40 %",  population: 400, color: "#60a5fa", short: "Mittelschicht" },
  { key: "t9",    label: "N\u00e4chste 9 %",     population: 90,  color: "#fbbf24", short: "Obere Mittel" },
  { key: "t09",   label: "Top 0,9 %",      population: 9,   color: "#f07078", short: "Verm\u00f6gende" },
  { key: "t01",   label: "Top 0,1 %",      population: 1,   color: "#e63946", short: "Super-Reiche" },
];

// Reihenfolge: [b50, m40, t9, t09, t01]
const WEALTH_KEYFRAMES = [
  { year: 1950, quality: "rekonstruiert",     shares: [3.0, 30.0, 32.0, 18.0, 17.0], medianWealth: 600 },
  { year: 1960, quality: "rekonstruiert",     shares: [3.5, 32.5, 31.0, 17.0, 16.0], medianWealth: 2500 },
  { year: 1970, quality: "rekonstruiert",     shares: [4.0, 34.0, 30.0, 16.0, 16.0], medianWealth: 8000 },
  { year: 1980, quality: "interpoliert",      shares: [4.0, 35.0, 30.0, 15.0, 16.0], medianWealth: 22000 },
  { year: 1990, quality: "belegt (DIW/SOEP)", shares: [3.5, 36.5, 31.0, 15.0, 14.0], medianWealth: 40000 },
  { year: 2000, quality: "belegt (DIW/SOEP)", shares: [2.5, 35.5, 32.0, 16.0, 14.0], medianWealth: 50000 },
  { year: 2010, quality: "belegt (DIW/BuBa)", shares: [1.5, 33.5, 32.0, 18.0, 15.0], medianWealth: 52000 },
  { year: 2015, quality: "belegt (DIW/BuBa)", shares: [1.3, 31.7, 32.0, 18.0, 17.0], medianWealth: 65000 },
  { year: 2020, quality: "belegt (DIW/BuBa)", shares: [1.2, 32.8, 31.0, 18.0, 17.0], medianWealth: 80000 },
  { year: 2025, quality: "Fortschreibung",    shares: [1.2, 33.8, 31.0, 18.0, 16.0], medianWealth: 100000 },
];

const WEALTH_ANNOTATIONS = [
  {
    fromYear: 1950, toYear: 1959,
    text: "<strong>Nachkriegszeit.</strong> Kapitalsubstanz durch Krieg und W\u00e4hrungsreform stark dezimiert, aber die Eigentumsverh\u00e4ltnisse gruppieren sich schnell wieder: Top 10 % halten ~60 % des Verm\u00f6gens, die untere H\u00e4lfte nur ~3 %."
  },
  {
    fromYear: 1960, toYear: 1969,
    text: "<strong>Wirtschaftswunder.</strong> Massenwohlstand w\u00e4chst, doch Unternehmensverm\u00f6gen und Immobilien bleiben stark konzentriert. Die untere H\u00e4lfte profitiert kaum beim Netto-Verm\u00f6gen."
  },
  {
    fromYear: 1970, toYear: 1989,
    text: "<strong>Sozialstaats-Ausbau.</strong> Lohnzuw\u00e4chse, Wohneigentumsf\u00f6rderung und Einkommensangleichung lassen die Mittelschicht im Verm\u00f6gensanteil leicht wachsen. Top 0,1 % gibt etwas ab."
  },
  {
    fromYear: 1990, toYear: 1999,
    text: "<strong>Wiedervereinigung.</strong> DDR-Verm\u00f6gen in der Privatisierung verteilt sich ungleich. West-Verm\u00f6gen dominiert das neue Gesamtdeutschland; Ungleichheit steigt wieder."
  },
  {
    fromYear: 2000, toYear: 2009,
    text: "<strong>Kapitalmarkt-Boom &amp; Steuerreform.</strong> Sinkender Spitzensteuersatz, Halbeink\u00fcnfteverfahren, Aktien- und Immobilienpreise steigen. Top 0,1 % legt deutlich zu; Mittelschicht verliert Anteil."
  },
  {
    fromYear: 2010, toYear: 2019,
    text: "<strong>Nullzins-\u00c4ra.</strong> Wer Aktien und Immobilien hat, wird reicher; Sparer verlieren real. Die obere H\u00e4lfte der Skala zieht davon &ndash; der deutsche Gini-Koeffizient f\u00fcr Verm\u00f6gen z\u00e4hlt zu den h\u00f6chsten Europas."
  },
  {
    fromYear: 2020, toYear: 2025,
    text: "<strong>Inflation &amp; Sachwert-Boom.</strong> Corona, Energiekrise, hohe Inflation: Geldverm\u00f6gen verliert real. Sachwertbesitzer (oben) halten ihre Position, Sparer (unten) verlieren."
  },
];

// --- Interpolation ---------------------------------------------------------

function interpolateShares(year) {
  const yMin = WEALTH_KEYFRAMES[0].year;
  const yMax = WEALTH_KEYFRAMES[WEALTH_KEYFRAMES.length - 1].year;
  if (year <= yMin) return WEALTH_KEYFRAMES[0].shares.slice();
  if (year >= yMax) return WEALTH_KEYFRAMES[WEALTH_KEYFRAMES.length - 1].shares.slice();
  let i = 0;
  while (WEALTH_KEYFRAMES[i + 1].year < year) i++;
  const a = WEALTH_KEYFRAMES[i];
  const b = WEALTH_KEYFRAMES[i + 1];
  const t = (year - a.year) / (b.year - a.year);
  return a.shares.map((v, idx) => v + (b.shares[idx] - v) * t);
}

function interpolateMedianWealth(year) {
  const yMin = WEALTH_KEYFRAMES[0].year;
  const yMax = WEALTH_KEYFRAMES[WEALTH_KEYFRAMES.length - 1].year;
  if (year <= yMin) return WEALTH_KEYFRAMES[0].medianWealth;
  if (year >= yMax) return WEALTH_KEYFRAMES[WEALTH_KEYFRAMES.length - 1].medianWealth;
  let i = 0;
  while (WEALTH_KEYFRAMES[i + 1].year < year) i++;
  const a = WEALTH_KEYFRAMES[i];
  const b = WEALTH_KEYFRAMES[i + 1];
  const t = (year - a.year) / (b.year - a.year);
  return Math.exp(Math.log(a.medianWealth) + (Math.log(b.medianWealth) - Math.log(a.medianWealth)) * t);
}

function qualityForWealthYear(year) {
  const yMin = WEALTH_KEYFRAMES[0].year;
  const yMax = WEALTH_KEYFRAMES[WEALTH_KEYFRAMES.length - 1].year;
  if (year <= yMin) return WEALTH_KEYFRAMES[0].quality;
  if (year >= yMax) return WEALTH_KEYFRAMES[WEALTH_KEYFRAMES.length - 1].quality;
  let i = 0;
  while (WEALTH_KEYFRAMES[i + 1].year < year) i++;
  return WEALTH_KEYFRAMES[i].quality;
}

function wealthAnnotationForYear(year) {
  return WEALTH_ANNOTATIONS.find(a => year >= a.fromYear && year <= a.toYear);
}

function formatWealthEUR(eur) {
  if (eur >= 1e9) return (eur / 1e9).toLocaleString("de-DE", { maximumFractionDigits: 1 }) + " Mrd \u20AC";
  if (eur >= 1e6) {
    const v = eur / 1e6;
    return v.toLocaleString("de-DE", { maximumFractionDigits: v < 10 ? 1 : 0 }) + " Mio \u20AC";
  }
  if (eur >= 10000) return Math.round(eur / 1000).toLocaleString("de-DE") + " Tsd \u20AC";
  if (eur >= 1000) return (eur / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 }) + " Tsd \u20AC";
  return Math.round(eur).toLocaleString("de-DE") + " \u20AC";
}

const WEALTH_YEAR_MIN = WEALTH_KEYFRAMES[0].year;
const WEALTH_YEAR_MAX = WEALTH_KEYFRAMES[WEALTH_KEYFRAMES.length - 1].year;
