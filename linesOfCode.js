// Combine the c-like languages and remove Assembly, Perl, and Python (lol "languages")
function cleanupLanguages(data) {
  var cLanguages = ["C/C++ Header", "Objective C", "Objective C++", "C", "C++"];
  for (commit in data) {
    for (language in data[commit]) {
      if (language == "date")
        continue;
      data[commit][language] = parseInt(data[commit][language]);
    }
    var cCount = 0;
    for (language in cLanguages) {
      cCount += data[commit][cLanguages[language]];
      delete data[commit][cLanguages[language]];
    }
    data[commit]["C/C++"] = cCount;
    delete data[commit]["Assembly"];
    delete data[commit]["Perl"];
    delete data[commit]["Python"];
    delete data[commit]["IDL"];
    delete data[commit]["Javascript"];
    delete data[commit]["Comments"];
  }
  return data;
}

function showLinesOfCode() {
  var blinkData = undefined;
  var webkitData = undefined;  

  var margin = {top: 20, right: 50, bottom: 20, left: 50},
      width = 960 - margin.left - margin.right,
      height = 350 - margin.top - margin.bottom;
  var parseDate = d3.time.format("%Y%m%d").parse;
  var forkDate = parseDate("20130403");

  var x = d3.time.scale()
      .range([0, width]);

  var y = d3.scale.linear()
      .range([height, 0]);

  var blinkColor = d3.scale.ordinal()
    .range(["#1f77b4", "#2ca02c", "#9467bd"]);
  var webkitColor = d3.scale.ordinal()
    .range(["#ff7f0e", "#d62728", "#e377c2"]);

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom");

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left");

  var line = d3.svg.line()
      .x(function(d) { return x(d.date); })
      .y(function(d) { return y(d.loc); });

  var svg = d3.select("#linesOfCode").append("svg")
      .attr("viewBox", "0 0 " + (width + margin.left + margin.right) + " " + (height + margin.top + margin.bottom))
      .attr("preserveAspectRatio", "xMidYMid")
      .attr("width", "100%")
      .attr("height", "350px")
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  d3.csv("data/blinkLinesOfCode.csv", function(error, data) {
    blinkData = cleanupLanguages(data);
    updateLinesOfCode();
  });

  d3.csv("data/webkitLinesOfCode.csv", function(error, data) {
    webkitData = cleanupLanguages(data);
    updateLinesOfCode();
  });

  function updateLinesOfCode() {
    if (!blinkData || !webkitData)
      return;

    blinkColor.domain(d3.keys(blinkData[0]).filter(function(key) { return key !== "date"; }));
    webkitColor.domain(d3.keys(webkitData[0]).filter(function(key) { return key !== "date"; }));

    blinkData.forEach(function(d) {
      d.date = parseDate(d.date);
    });
    webkitData.forEach(function(d) {
      d.date = parseDate(d.date);
    });

    var blinkLanguages = blinkColor.domain().map(function(name) {
      return {
        name: name,
        values: blinkData.map(function(d) {
          return {date: d.date, loc: +d[name]};
        })
      };
    });
    var webkitLanguages = webkitColor.domain().map(function(name) {
      return {
        name: name,
        values: webkitData.map(function(d) {
          return {date: d.date, loc: +d[name]};
        })
      };
    });

    x.domain(d3.extent(blinkData, function(d) { return d.date; }));

    y.domain([
      0,
      1.1 * d3.max(blinkLanguages, function(c) { return d3.max(c.values, function(v) { return v.loc; }); })
    ]);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("line")
        .attr("class", "forkline")
        .attr("x1", x(forkDate))
        .attr("x2", x(forkDate))
        .attr("y1", "0")
        .attr("y2", height);

    var blinkLanguage = svg.selectAll(".blinkLanguage")
        .data(blinkLanguages)
      .enter().append("g")
        .attr("class", "blinkLanguage");

    blinkLanguage.append("path")
        .attr("class", "line")
        .attr("d", function(d) { return line(d.values); })
        .style("stroke", function(d) { return blinkColor(d.name); });

    blinkLanguage.append("text")
        .datum(function(d) { return {name: "Blink " + d.name, value: d.values[d.values.length - 1]}; })
        .attr("transform", function(d) { return "translate(" + x(d.value.date) + "," + y(d.value.loc) + ")"; })
        .attr("x", 3)
        .attr("dy", ".35em")
        .text(function(d) { return d.name; });

    var webkitLanguage = svg.selectAll(".webkitLanguage")
        .data(webkitLanguages)
      .enter().append("g")
        .attr("class", "webkitLanguage");

    webkitLanguage.append("path")
        .attr("class", "line")
        .attr("d", function(d) { return line(d.values); })
        .style("stroke", function(d) { return webkitColor(d.name); });

    webkitLanguage.append("text")
        .datum(function(d) { return {name: "Webkit " + d.name, value: d.values[d.values.length - 1]}; })
        .attr("transform", function(d) { return "translate(" + x(d.value.date) + "," + y(d.value.loc) + ")"; })
        .attr("x", 3)
        .attr("dy", ".35em")
        .text(function(d) { return d.name; });

    var yAxisText = svg.append("g")
        .attr("class", "y axis")
        .call(yAxis);
    yAxisText.append("text")
        .attr("class", "textBackground")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Core lines of code")
    yAxisText.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Core lines of code");
  }
}

document.addEventListener("DOMContentLoaded", showLinesOfCode);