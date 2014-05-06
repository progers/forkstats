function showCommitsByMonth() {
  var margin = {top: 20, right: 100, bottom: 20, left: 60},
      width = 960 - margin.left - margin.right,
      height = 200 - margin.top - margin.bottom;
  var parseDate = d3.time.format("%Y%m%d").parse;
  var forkDate = parseDate("20130403");

  var x = d3.time.scale()
      .range([0, width]);
  var y = d3.scale.linear()
      .range([height, 0]);

  var color = d3.scale.category10();

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom");
  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left");

  var line = d3.svg.line()
      .x(function(d) { return x(d.date); })
      .y(function(d) { return y(d.commitCount); });

  var svg = d3.select("#commitsByMonthAppleGoogle").append("svg")
      .attr("viewBox", "0 0 " + (width + margin.left + margin.right) + " " + (height + margin.top + margin.bottom))
      .attr("preserveAspectRatio", "xMidYMid")
      .attr("width", "100%")
      .attr("height", "200px")
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  d3.csv("data/commitsByMonthAppleGoogle.csv", function(error, data) {
    color.domain(d3.keys(data[0]).filter(function(key) { return key !== "date"; }));

    data.forEach(function(d) {
      d.date = parseDate(d.date);
    });

    var commitsData = color.domain().map(function(name) {
      return {
        name: name,
        values: data.map(function(d) {
          return {date: d.date, commitCount: +d[name], orgName: name};
        })
      };
    });

    x.domain(d3.extent(data, function(d) { return d.date; }));
    y.domain([
      0,
      d3.max(commitsData, function(c) { return d3.max(c.values, function(v) { return v.commitCount; }); })
    ]);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("line")
        .attr("class", "forkline")
        .attr("x1", x(forkDate))
        .attr("x2", x(forkDate))
        .attr("y1", "-10")
        .attr("y2", height);

    var commits = svg.selectAll(".commits")
        .data(commitsData)
      .enter().append("g")
        .attr("class", "commits");

    commits.append("path")
        .attr("class", "line")
        .attr("d", function(d) { return line(d.values); })
        .style("stroke-dasharray", "2")
        .style("stroke", function(d) { return color(d.name); });

    commits.append("text")
        .datum(function(d) { return {name: d.name, value: d.values[d.values.length - 1]}; })
        .attr("transform", function(d) { return "translate(" + x(d.value.date) + "," + y(d.value.commitCount) + ")"; })
        .attr("x", 3)
        .attr("dy", ".35em")
        .text(function(d) { return d.name; });

    var markers = svg.selectAll(".markers")
        .data(commitsData)
      .enter().append("g")
        .attr("class", "commits");

    markers.selectAll(".circles")
        .data(function(d) { return d.values; })
      .enter().append("circle")
        .attr("class", "line")
        .attr("cx", function(d) { return x(d.date); })
        .attr("cy", function(d) { return y(d.commitCount); })
        .attr("r", 3)
        .style("fill", function(d) { return color(d.orgName); })
        .style("stroke", "transparent");

    var yAxisText = svg.append("g")
        .attr("class", "y axis")
        .call(yAxis);
    yAxisText.append("text")
        .attr("class", "textBackground")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Core commits by month");
    yAxisText.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Core commits by month");
  });
}

document.addEventListener("DOMContentLoaded", showCommitsByMonth);