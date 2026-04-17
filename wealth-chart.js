// Pictograph: Bevölkerungs-Grid (statisch) + animiertes Vermögensband.

(function () {
  const chartEl = document.getElementById("wealth-chart");
  const yearBig = document.getElementById("year-big");
  const annotationEl = document.getElementById("annotation");
  const playBtn = document.getElementById("play");
  const resetBtn = document.getElementById("reset");
  const speedSel = document.getElementById("speed");
  const scrubber = document.getElementById("scrubber");
  const qualityBadge = document.getElementById("quality-badge");

  // Layout
  const COLS = 50;
  const ROWS = 20;
  const TOTAL = COLS * ROWS;  // 1000 Personen-Slots
  const ICON_SIZE = 11;
  const ICON_GAP = 2;
  const CELL = ICON_SIZE + ICON_GAP;
  const GRID_W = COLS * CELL - ICON_GAP;
  const GRID_H = ROWS * CELL - ICON_GAP;

  const MARGIN = { top: 84, right: 28, bottom: 28, left: 28 };
  const GAP_BETWEEN_BLOCKS = 96; // Platz für Verbindungslinien + Überschriften
  const WEALTH_H = 72;

  const svgW = GRID_W + MARGIN.left + MARGIN.right;
  const svgH = MARGIN.top + 32 + GRID_H + GAP_BETWEEN_BLOCKS + WEALTH_H + 40 + MARGIN.bottom;

  // SVG Setup
  const svg = d3.select(chartEl)
    .append("svg")
    .attr("viewBox", `0 0 ${svgW} ${svgH}`)
    .attr("width", "100%")
    .style("display", "block")
    .style("max-width", svgW + "px")
    .style("margin", "0 auto");

  // Person-Symbol als Reusable definieren
  const defs = svg.append("defs");
  defs.append("symbol")
    .attr("id", "person-icon")
    .attr("viewBox", "0 0 10 12")
    .html('<circle cx="5" cy="2.5" r="2.2" /><path d="M5,5.3 C2.4,5.3 1,7.6 1,11.8 L9,11.8 C9,7.6 7.6,5.3 5,5.3 Z" />');

  // --- Beschriftungen ---
  svg.append("text")
    .attr("x", MARGIN.left)
    .attr("y", MARGIN.top + 12)
    .attr("class", "pict-heading")
    .text("Oben: 1000 Erwachsene in Deutschland, nach Vermögensschicht");

  const wealthHeadingY = MARGIN.top + 32 + GRID_H + GAP_BETWEEN_BLOCKS - 16;
  // Heading wird später gezeichnet (nach connect-Band), damit sie on-top sitzt.

  // --- Personen-Grid (statisch) ---
  const peopleG = svg.append("g")
    .attr("transform", `translate(${MARGIN.left},${MARGIN.top + 32})`);

  // Ordne jede Position einer Gruppe zu (in der Reihenfolge der WEALTH_GROUPS)
  const personGroupIndex = new Array(TOTAL);
  let acc = 0;
  WEALTH_GROUPS.forEach((g, gi) => {
    for (let i = 0; i < g.population; i++) {
      personGroupIndex[acc + i] = gi;
    }
    acc += g.population;
  });

  // Zeichne 1000 Personen, Zeile-für-Zeile (die "seltensten" Gruppen landen oben rechts -> auffällig)
  for (let idx = 0; idx < TOTAL; idx++) {
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    const gi = personGroupIndex[idx];
    const g = WEALTH_GROUPS[gi];
    peopleG.append("use")
      .attr("href", "#person-icon")
      .attr("x", col * CELL)
      .attr("y", row * CELL)
      .attr("width", ICON_SIZE)
      .attr("height", ICON_SIZE + 1)
      .attr("fill", g.color)
      .attr("class", "person-icon group-" + g.key);
  }

  // Überlagertes Ring/Highlight für die Top 0,1 %
  const top01Idx = WEALTH_GROUPS.slice(0, 4).reduce((s, g) => s + g.population, 0); // = 999
  const top01Col = top01Idx % COLS;
  const top01Row = Math.floor(top01Idx / COLS);
  peopleG.append("circle")
    .attr("cx", top01Col * CELL + ICON_SIZE / 2)
    .attr("cy", top01Row * CELL + (ICON_SIZE + 1) / 2)
    .attr("r", ICON_SIZE * 0.9)
    .attr("class", "top01-highlight");

  peopleG.append("text")
    .attr("x", top01Col * CELL - 8)
    .attr("y", top01Row * CELL + (ICON_SIZE + 1) / 2 + 4)
    .attr("class", "top01-callout")
    .attr("text-anchor", "end")
    .text("Top 0,1 %: 1 von 1000 \u2192");

  // --- Verbindungsband zwischen Gruppen-Ende oben und Band-Start unten ---
  const connectY1 = MARGIN.top + 32 + GRID_H + 4;
  const connectY2 = wealthHeadingY + 20;
  const connectG = svg.append("g").attr("class", "connect-band");

  // "Unten:"-Heading MIT dunklem Hintergrund, nach connectG damit es on-top liegt.
  const unterHeadingG = svg.append("g").attr("class", "unter-heading-group");
  unterHeadingG.append("rect")
    .attr("x", MARGIN.left - 4)
    .attr("y", wealthHeadingY - 14)
    .attr("width", svgW - MARGIN.left - MARGIN.right + 8)
    .attr("height", 20)
    .attr("fill", "#1a1f26");
  unterHeadingG.append("text")
    .attr("x", MARGIN.left)
    .attr("y", wealthHeadingY)
    .attr("class", "pict-heading")
    .text("Unten: Das gesamte Netto-Privatvermögen, aufgeteilt in 1000 gleiche Anteile");

  // Vermögensband unten
  const wealthY = wealthHeadingY + 20;
  const wealthG = svg.append("g")
    .attr("transform", `translate(${MARGIN.left},${wealthY})`);

  WEALTH_GROUPS.forEach((g) => {
    wealthG.append("rect")
      .attr("class", "wealth-segment wealth-" + g.key)
      .attr("y", 0)
      .attr("height", WEALTH_H)
      .attr("fill", g.color);
    wealthG.append("text")
      .attr("class", "wealth-segment-label label-" + g.key)
      .attr("y", WEALTH_H / 2 + 5)
      .attr("text-anchor", "middle");
    wealthG.append("text")
      .attr("class", "wealth-segment-sublabel sub-" + g.key)
      .attr("y", WEALTH_H / 2 + 22)
      .attr("text-anchor", "middle");
  });

  // Legend unter dem Vermögensband
  const legendY = wealthY + WEALTH_H + 22;
  const legendG = svg.append("g")
    .attr("transform", `translate(${MARGIN.left},${legendY})`);

  let legendX = 0;
  WEALTH_GROUPS.forEach((g) => {
    const item = legendG.append("g").attr("transform", `translate(${legendX},0)`);
    item.append("rect")
      .attr("width", 12).attr("height", 12)
      .attr("rx", 2)
      .attr("fill", g.color);
    const textNode = item.append("text")
      .attr("x", 18).attr("y", 10)
      .attr("class", "pict-legend-text")
      .text(g.label);
    legendX += textNode.node().getComputedTextLength() + 38;
  });

  // --- Render (nur Vermögensband, Zahlen, Annotation updaten) ---
  function render(year) {
    const shares = interpolateShares(year);
    const median = interpolateMedianWealth(year);

    // Positionen berechnen
    let x = 0;
    const positions = shares.map((s, i) => {
      const w = (s / 100) * GRID_W;
      const pos = { x, w };
      x += w;
      return pos;
    });

    WEALTH_GROUPS.forEach((g, i) => {
      const { x, w } = positions[i];
      wealthG.select(".wealth-" + g.key)
        .attr("x", x).attr("width", w);

      // %-Label in der Mitte, nur wenn genug Platz
      const pctLabel = wealthG.select(".label-" + g.key);
      const subLabel = wealthG.select(".sub-" + g.key);
      if (w > 32) {
        pctLabel.attr("x", x + w / 2).text(shares[i].toFixed(1).replace(".", ",") + " %");
        subLabel.attr("x", x + w / 2).text(g.short);
      } else {
        pctLabel.text("");
        subLabel.text("");
      }
    });

    // Verbindungslinien neu zeichnen
    connectG.selectAll("*").remove();
    let popX = 0;
    WEALTH_GROUPS.forEach((g, i) => {
      const popW = (g.population / TOTAL) * GRID_W;
      const popCx = popX + popW / 2;
      popX += popW;
      const wealthCx = positions[i].x + positions[i].w / 2;

      connectG.append("path")
        .attr("d", `M${MARGIN.left + popCx},${connectY1} C${MARGIN.left + popCx},${connectY1 + 30} ${MARGIN.left + wealthCx},${connectY2 - 30} ${MARGIN.left + wealthCx},${connectY2}`)
        .attr("fill", "none")
        .attr("stroke", g.color)
        .attr("stroke-width", 1)
        .attr("opacity", 0.35);
    });

    // Jahr-Anzeige, Median-Vermögen, Qualität
    const yearInt = Math.round(year);
    yearBig.textContent = yearInt;
    qualityBadge.textContent = "Datenqualität: " + qualityForWealthYear(year);

    // Annotation
    const ann = wealthAnnotationForYear(yearInt);
    if (ann && annotationEl.dataset.activeFrom !== String(ann.fromYear)) {
      annotationEl.dataset.activeFrom = String(ann.fromYear);
      annotationEl.style.opacity = "0";
      setTimeout(() => {
        annotationEl.innerHTML =
          `<div class="annotation-text">${ann.text}</div>` +
          `<div class="annotation-extra">Median-Nettovermögen pro Erwachsenem ${yearInt}: <strong>${formatWealthEUR(median)}</strong> (nominal, Gesch\u00e4tzung vor 2000).</div>`;
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
