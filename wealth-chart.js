// Pictograph: pro Vermögensgruppe eine horizontale Bande aus Person-Icons
// plus ein Balken rechts, dessen Länge den Anteil am Gesamtvermögen zeigt.

(function () {
  const chartEl = document.getElementById("wealth-chart");
  const yearBig = document.getElementById("year-big");
  const annotationEl = document.getElementById("annotation");
  const playBtn = document.getElementById("play");
  const resetBtn = document.getElementById("reset");
  const speedSel = document.getElementById("speed");
  const scrubber = document.getElementById("scrubber");
  const qualityBadge = document.getElementById("quality-badge");

  // Layout-Konstanten
  const COLS = 50;
  const ICON_SIZE = 11;
  const ICON_GAP = 2;
  const CELL = ICON_SIZE + ICON_GAP;
  const BAND_GAP = 22;

  const LABEL_W = 130;      // linke Spalte (Gruppenname + Anzahl)
  const GRID_GAP = 24;      // Lücke zwischen Label und Icons
  const BAR_GAP = 28;       // Lücke zwischen Icons und Balken
  const BAR_MAX = 150;      // max Balkenbreite in px
  const BAR_SCALE = BAR_MAX / 40; // 40 % = volle Breite (max gemessen ~36,5 %)
  const BAR_PAD = 12;       // Lücke Balken → Wert-Label
  const VALUE_W = 70;       // Platz für "33,8 %"
  const BAR_H = 20;

  // Zeilen pro Gruppe vorberechnen
  WEALTH_GROUPS.forEach((g) => { g.rows = Math.ceil(g.population / COLS); });

  // Vertikale Position jedes Bandes
  let yOff = 0;
  WEALTH_GROUPS.forEach((g, i) => {
    g.yBand = yOff;
    g.bandH = g.rows * CELL - ICON_GAP;
    yOff += g.bandH;
    if (i < WEALTH_GROUPS.length - 1) yOff += BAND_GAP;
  });
  const gridH = yOff;
  const gridW = COLS * CELL - ICON_GAP;

  const MARGIN = { top: 56, right: 28, bottom: 28, left: 28 };
  const svgW = MARGIN.left + LABEL_W + GRID_GAP + gridW + BAR_GAP + BAR_MAX + BAR_PAD + VALUE_W + MARGIN.right;
  const svgH = MARGIN.top + 28 + gridH + 24 + MARGIN.bottom;

  // SVG Setup
  const svg = d3.select(chartEl)
    .append("svg")
    .attr("viewBox", `0 0 ${svgW} ${svgH}`)
    .attr("width", "100%")
    .style("display", "block")
    .style("max-width", svgW + "px")
    .style("margin", "0 auto");

  const defs = svg.append("defs");
  defs.append("symbol")
    .attr("id", "person-icon")
    .attr("viewBox", "0 0 10 12")
    .html('<circle cx="5" cy="2.5" r="2.2" /><path d="M5,5.3 C2.4,5.3 1,7.6 1,11.8 L9,11.8 C9,7.6 7.6,5.3 5,5.3 Z" />');

  // Absolute Spalten-X-Positionen
  const xLabelEnd = MARGIN.left + LABEL_W;
  const xGrid = xLabelEnd + GRID_GAP;
  const xBarStart = xGrid + gridW + BAR_GAP;
  const yStart = MARGIN.top + 28;

  // Überschrift über den Icons (die Balken-Spalte spricht durch die %-Werte für sich).
  svg.append("text")
    .attr("x", xGrid)
    .attr("y", MARGIN.top + 12)
    .attr("class", "pict-heading")
    .text("1000 Erwachsene ⟶ Anteil der Schicht am Gesamtvermögen");

  // Gruppen-Layer
  const groupsG = svg.append("g").attr("transform", `translate(0, ${yStart})`);

  const bars = [];
  const barValues = [];

  WEALTH_GROUPS.forEach((g) => {
    const gG = groupsG.append("g").attr("transform", `translate(0, ${g.yBand})`);
    const center = g.bandH / 2;

    // Linke Spalte: Gruppenname (Zeile 1) + Anzahl (Zeile 2)
    // bei sehr kleinen Bändern (t09, t01) nur eine Zeile inline.
    if (g.bandH >= 20) {
      gG.append("text")
        .attr("x", xLabelEnd)
        .attr("y", center - 3)
        .attr("class", "group-label")
        .attr("text-anchor", "end")
        .text(g.label);
      gG.append("text")
        .attr("x", xLabelEnd)
        .attr("y", center + 15)
        .attr("class", "group-count")
        .attr("text-anchor", "end")
        .text(g.population === 1 ? "1 Person" : g.population.toLocaleString("de-DE") + " Personen");
    } else {
      gG.append("text")
        .attr("x", xLabelEnd)
        .attr("y", center + 4)
        .attr("class", "group-label")
        .attr("text-anchor", "end")
        .text(g.label + " (" + (g.population === 1 ? "1 Person" : g.population + " Personen") + ")");
    }

    // Icons
    for (let i = 0; i < g.population; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      gG.append("use")
        .attr("href", "#person-icon")
        .attr("x", xGrid + col * CELL)
        .attr("y", row * CELL)
        .attr("width", ICON_SIZE)
        .attr("height", ICON_SIZE + 1)
        .attr("fill", g.color)
        .attr("class", "person-icon group-" + g.key);
    }

    // Top 0,1 %: Highlight + Callout
    if (g.key === "t01") {
      gG.append("circle")
        .attr("cx", xGrid + ICON_SIZE / 2)
        .attr("cy", (ICON_SIZE + 1) / 2)
        .attr("r", ICON_SIZE * 0.9)
        .attr("class", "top01-highlight");
      gG.append("text")
        .attr("x", xGrid + ICON_SIZE + 10)
        .attr("y", (ICON_SIZE + 1) / 2 + 4)
        .attr("class", "top01-callout")
        .text("\u2190 diese 1 Person besitzt mehr als die unteren 500 zusammen");
    }

    // Balken rechts
    const bar = gG.append("rect")
      .attr("x", xBarStart)
      .attr("y", center - BAR_H / 2)
      .attr("height", BAR_H)
      .attr("rx", 2)
      .attr("fill", g.color)
      .attr("class", "wealth-bar wealth-bar-" + g.key);
    bars.push(bar);

    // Wert rechts neben dem Balken
    const val = gG.append("text")
      .attr("y", center + 5)
      .attr("class", "wealth-bar-value");
    barValues.push(val);
  });

  // --- Render ---
  function render(year) {
    const shares = interpolateShares(year);
    const median = interpolateMedianWealth(year);

    WEALTH_GROUPS.forEach((g, i) => {
      const w = Math.max(2, shares[i] * BAR_SCALE);
      bars[i].attr("width", w);
      barValues[i]
        .attr("x", xBarStart + w + BAR_PAD)
        .text(shares[i].toFixed(1).replace(".", ",") + " %");
    });

    const yearInt = Math.round(year);
    yearBig.textContent = yearInt;
    qualityBadge.textContent = "Datenqualität: " + qualityForWealthYear(year);

    const ann = wealthAnnotationForYear(yearInt);
    if (ann && annotationEl.dataset.activeFrom !== String(ann.fromYear)) {
      annotationEl.dataset.activeFrom = String(ann.fromYear);
      annotationEl.style.opacity = "0";
      setTimeout(() => {
        annotationEl.innerHTML =
          `<div class="annotation-text">${ann.text}</div>` +
          `<div class="annotation-extra">Median-Nettovermögen pro Erwachsenem ${yearInt}: <strong>${formatWealthEUR(median)}</strong> (nominal, Schätzung vor 2000).</div>`;
        annotationEl.style.opacity = "1";
      }, 160);
    }

    if (!scrubbing) {
      const frac = (year - WEALTH_YEAR_MIN) / (WEALTH_YEAR_MAX - WEALTH_YEAR_MIN);
      scrubber.value = String(frac);
    }
  }

  // --- Animation Engine ---
  let rafId = null;
  let startTs = 0;
  let startYear = WEALTH_YEAR_MIN;
  let playing = false;
  let scrubbing = false;
  let currentYear = WEALTH_YEAR_MIN;

  function durationMs() {
    return parseFloat(speedSel.value) * (WEALTH_YEAR_MAX - WEALTH_YEAR_MIN);
  }

  function tick(ts) {
    if (!playing) return;
    if (!startTs) startTs = ts;
    const elapsed = ts - startTs;
    const t = Math.min(1, elapsed / durationMs());
    const year = startYear + t * (WEALTH_YEAR_MAX - startYear);
    currentYear = year;
    render(year);
    if (t < 1) {
      rafId = requestAnimationFrame(tick);
    } else {
      playing = false;
      playBtn.textContent = "Erneut abspielen";
      playBtn.classList.add("primary");
    }
  }

  function play() {
    if (playing) {
      playing = false;
      playBtn.textContent = "Weiter";
      cancelAnimationFrame(rafId);
      return;
    }
    if (currentYear >= WEALTH_YEAR_MAX - 0.5) currentYear = WEALTH_YEAR_MIN;
    startYear = currentYear;
    startTs = 0;
    playing = true;
    playBtn.textContent = "Pause";
    playBtn.classList.remove("primary");
    rafId = requestAnimationFrame(tick);
  }

  function reset() {
    playing = false;
    scrubbing = false;
    cancelAnimationFrame(rafId);
    currentYear = WEALTH_YEAR_MIN;
    playBtn.textContent = "Start";
    playBtn.classList.add("primary");
    scrubber.value = "0";
    render(WEALTH_YEAR_MIN);
  }

  playBtn.addEventListener("click", play);
  resetBtn.addEventListener("click", reset);

  speedSel.addEventListener("change", () => {
    if (playing) {
      cancelAnimationFrame(rafId);
      startYear = currentYear;
      startTs = 0;
      rafId = requestAnimationFrame(tick);
    }
  });

  scrubber.addEventListener("input", () => {
    scrubbing = true;
    if (playing) {
      playing = false;
      cancelAnimationFrame(rafId);
      playBtn.textContent = "Weiter";
      playBtn.classList.remove("primary");
    }
    currentYear = WEALTH_YEAR_MIN + parseFloat(scrubber.value) * (WEALTH_YEAR_MAX - WEALTH_YEAR_MIN);
    render(currentYear);
  });
  scrubber.addEventListener("change", () => { scrubbing = false; });

  // Init
  render(WEALTH_YEAR_MIN);
})();
