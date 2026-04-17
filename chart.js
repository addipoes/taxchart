// Animierter Steuerkurven-Chart: D3-basiert, interpoliert zwischen Keyframes.

(function () {
  const chartEl = document.getElementById("chart");
  const yearBig = document.getElementById("year-big");
  const annotationEl = document.getElementById("annotation");
  const playBtn = document.getElementById("play");
  const resetBtn = document.getElementById("reset");
  const speedSel = document.getElementById("speed");
  const scrubber = document.getElementById("scrubber");

  const margin = { top: 24, right: 32, bottom: 128, left: 64 };

  let width = 0, height = 0;
  let svg, gMain, xScale, yScale, xAxisG, yAxisG, gridG, curvePath, pointsG, labelsG, incomeG, qualityBadge;

  const MAX_Y = 70; // Prozent

  // --- Setup ---

  function setup() {
    chartEl.innerHTML = "";
    const rect = chartEl.getBoundingClientRect();
    width = rect.width;
    height = rect.height;

    svg = d3.select(chartEl)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    gMain = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    xScale = d3.scalePoint()
      .domain(INCOME_GROUPS.map(g => g.label))
      .range([0, innerW])
      .padding(0.2);

    yScale = d3.scaleLinear()
      .domain([0, MAX_Y])
      .range([innerH, 0]);

    // Gitter
    gridG = gMain.append("g").attr("class", "grid");
    gridG.call(
      d3.axisLeft(yScale)
        .tickValues(d3.range(0, MAX_Y + 1, 10))
        .tickSize(-innerW)
        .tickFormat("")
    );

    // Achsen
    xAxisG = gMain.append("g")
      .attr("class", "axis x-axis")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale));

    xAxisG.selectAll("text")
      .attr("transform", "translate(-6,6) rotate(-22)")
      .style("text-anchor", "end");

    yAxisG = gMain.append("g")
      .attr("class", "axis y-axis")
      .call(d3.axisLeft(yScale).tickValues(d3.range(0, MAX_Y + 1, 10)).tickFormat(d => d + "%"));

    // Achsen-Labels
    gMain.append("text")
      .attr("class", "axis-label")
      .attr("x", innerW / 2)
      .attr("y", innerH + 108)
      .attr("text-anchor", "middle")
      .text("Einkommensgruppe (Brutto-Jahreseinkommen) \u2192");

    // Einkommens-Labels unter der X-Achse (nominal, Brutto pro Person)
    incomeG = gMain.append("g")
      .attr("class", "income-labels")
      .attr("transform", `translate(0,${innerH + 74})`);

    incomeG.selectAll("text")
      .data(INCOME_GROUPS)
      .enter()
      .append("text")
      .attr("class", "income-label")
      .attr("x", g => xScale(g.label))
      .attr("y", 0)
      .attr("text-anchor", "middle");

    gMain.append("text")
      .attr("class", "axis-label")
      .attr("transform", `translate(-48,${innerH / 2}) rotate(-90)`)
      .attr("text-anchor", "middle")
      .text("Effektive Gesamtabgabenquote");

    // Kurve
    curvePath = gMain.append("path")
      .attr("class", "curve");

    // Punkte + Labels
    pointsG = gMain.append("g").attr("class", "points");
    labelsG = gMain.append("g").attr("class", "point-labels");

    // Qualitäts-Badge (Element existiert bereits im HTML)
    qualityBadge = d3.select("#quality-badge");
  }

  // --- Zeichnen ---

  const lineGen = d3.line()
    .curve(d3.curveCatmullRom.alpha(0.5))
    .x((_, i) => xScale(INCOME_GROUPS[i].label))
    .y(d => yScale(d));

  function render(year) {
    const values = interpolateValues(year);
    const incomes = interpolateIncomes(year);

    curvePath.attr("d", lineGen(values));

    const points = pointsG.selectAll("circle").data(values);
    points.enter()
      .append("circle")
      .attr("class", "point")
      .attr("r", 5)
      .merge(points)
      .attr("cx", (_, i) => xScale(INCOME_GROUPS[i].label))
      .attr("cy", d => yScale(d));
    points.exit().remove();

    const labels = labelsG.selectAll("text").data(values);
    labels.enter()
      .append("text")
      .attr("class", "point-label")
      .merge(labels)
      .attr("x", (_, i) => xScale(INCOME_GROUPS[i].label))
      .attr("y", d => yScale(d) - 12)
      .text(d => d.toFixed(0) + "%");
    labels.exit().remove();

    // Einkommens-Labels aktualisieren
    incomeG.selectAll("text")
      .data(incomes)
      .text(d => formatIncome(d));

    // Jahr-Anzeige
    const yearInt = Math.round(year);
    yearBig.textContent = yearInt;

    // Datenqualität
    const q = qualityForYear(year);
    qualityBadge.text("Datenqualit\u00e4t: " + q);
    curvePath.classed("estimated", q === "rekonstruiert" || q === "Fortschreibung");

    // Annotation
    const ann = annotationForYear(yearInt);
    if (ann) {
      if (annotationEl.dataset.activeFrom !== String(ann.fromYear)) {
        annotationEl.dataset.activeFrom = String(ann.fromYear);
        annotationEl.style.opacity = "0";
        setTimeout(() => {
          annotationEl.innerHTML = `<div class="annotation-text">${ann.text}</div>`;
          annotationEl.style.opacity = "1";
        }, 160);
      }
    }

    // Scrubber
    const frac = (year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN);
    if (!scrubbing) scrubber.value = String(frac);
  }

  // --- Animation ---

  let rafId = null;
  let startTs = 0;
  let startYear = YEAR_MIN;
  let playing = false;
  let scrubbing = false;
  let currentYear = YEAR_MIN;

  function durationMs() {
    // Skalenwert aus Dropdown: Sekunden pro Jahrhundert-Fraktion
    const base = parseFloat(speedSel.value); // 15/30/60
    // Gesamtdauer in ms: base * (YEAR_MAX-YEAR_MIN) / 1 -> z.B. 30ms/Jahr
    return base * (YEAR_MAX - YEAR_MIN);
  }

  function tick(ts) {
    if (!playing) return;
    if (!startTs) startTs = ts;
    const elapsed = ts - startTs;
    const dur = durationMs();
    const t = Math.min(1, elapsed / dur);
    const year = startYear + t * (YEAR_MAX - startYear);
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
      // Pause
      playing = false;
      playBtn.textContent = "Weiter";
      cancelAnimationFrame(rafId);
      return;
    }
    if (currentYear >= YEAR_MAX - 0.5) {
      // Neustart
      currentYear = YEAR_MIN;
    }
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
    currentYear = YEAR_MIN;
    playBtn.textContent = "Start";
    playBtn.classList.add("primary");
    scrubber.value = "0";
    render(YEAR_MIN);
  }

  // --- Events ---

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
    const frac = parseFloat(scrubber.value);
    currentYear = YEAR_MIN + frac * (YEAR_MAX - YEAR_MIN);
    render(currentYear);
  });

  scrubber.addEventListener("change", () => {
    scrubbing = false;
  });

  window.addEventListener("resize", () => {
    setup();
    render(currentYear);
  });

  // --- Init ---
  setup();
  render(YEAR_MIN);
})();
