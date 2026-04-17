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
  const BAR_SCALE = 3.75;   // 1 % = 3,75 px (Einzelbänder max ~137 px)
  const BAR_MAX = 270;      // reservierte Kanalbreite (deckt Summary bis ~70 %)
  const BAR_PAD = 12;       // Lücke Balken → Wert-Label
  const VALUE_W = 70;       // Platz für "33,8 %"
  const BAR_H = 20;

  // Zeilen pro Gruppe vorberechnen
  WEALTH_GROUPS.forEach((g) => { g.rows = Math.ceil(g.population / COLS); });

  // Summary-Band: Top 10 % (= t9 + t09 + t01 zusammen, 100 Personen)
  const SUMMARY = {
    key: "top10",
    label: "Top 10 % zusammen",
    population: 100,
    rows: Math.ceil(100 / COLS),
    memberIdx: [2, 3, 4],
  };
  SUMMARY.bandH = SUMMARY.rows * CELL - ICON_GAP;

  // Vertikale Position jedes Bandes
  const SUMMARY_GAP = 36; // größerer Abstand vor Summary-Band
  let yOff = 0;
  WEALTH_GROUPS.forEach((g, i) => {
    g.yBand = yOff;
    g.bandH = g.rows * CELL - ICON_GAP;
    yOff += g.bandH;
    if (i < WEALTH_GROUPS.length - 1) yOff += BAND_GAP;
  });
  const separatorY = yOff + SUMMARY_GAP / 2;
  yOff += SUMMARY_GAP;
  SUMMARY.yBand = yOff;
  yOff += SUMMARY.bandH;

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
  let summaryBar;
  let summaryVal;

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

  // --- Summary-Band: Top 10 % zusammen ---
  groupsG.append("line")
    .attr("x1", xLabelEnd + 10)
    .attr("x2", xBarStart + BAR_MAX + BAR_PAD + VALUE_W - 10)
    .attr("y1", separatorY)
    .attr("y2", separatorY)
    .attr("class", "summary-separator");

  const sG = groupsG.append("g").attr("transform", `translate(0, ${SUMMARY.yBand})`);
  const sCenter = SUMMARY.bandH / 2;

  sG.append("text")
    .attr("x", xLabelEnd)
    .attr("y", sCenter - 3)
    .attr("class", "group-label summary-label")
    .attr("text-anchor", "end")
    .text(SUMMARY.label);
  sG.append("text")
    .attr("x", xLabelEnd)
    .attr("y", sCenter + 15)
    .attr("class", "group-count")
    .attr("text-anchor", "end")
    .text("100 Personen (10 %)");

  const memberColors = SUMMARY.memberIdx.flatMap(idx =>
    Array(WEALTH_GROUPS[idx].population).fill(WEALTH_GROUPS[idx].color)
  );
  memberColors.forEach((color, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    sG.append("use")
      .attr("href", "#person-icon")
      .attr("x", xGrid + col * CELL)
      .attr("y", row * CELL)
      .attr("width", ICON_SIZE)
      .attr("height", ICON_SIZE + 1)
      .attr("fill", color)
      .attr("class", "person-icon person-icon-summary");
  });

  const gradId = "summary-bar-gradient";
  const grad = defs.append("linearGradient")
    .attr("id", gradId)
    .attr("x1", "0%").attr("x2", "100%")
    .attr("y1", "0%").attr("y2", "0%");
  grad.append("stop").attr("offset", "0%").attr("stop-color", WEALTH_GROUPS[2].color);
  grad.append("stop").attr("offset", "70%").attr("stop-color", WEALTH_GROUPS[3].color);
  grad.append("stop").attr("offset", "100%").attr("stop-color", WEALTH_GROUPS[4].color);

  summaryBar = sG.append("rect")
    .attr("x", xBarStart)
    .attr("y", sCenter - BAR_H / 2)
    .attr("height", BAR_H)
    .attr("rx", 2)
    .attr("fill", `url(#${gradId})`)
    .attr("class", "wealth-bar wealth-bar-summary");

  summaryVal = sG.append("text")
    .attr("y", sCenter + 5)
    .attr("class", "wealth-bar-value summary-value");

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

    const sumShare = shares[2] + shares[3] + shares[4];
    const sumW = Math.max(2, sumShare * BAR_SCALE);
    summaryBar.attr("width", sumW);
    summaryVal
      .attr("x", xBarStart + sumW + BAR_PAD)
      .text(sumShare.toFixed(1).replace(".", ",") + " %");

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
