function showCommitsByOrganization() {
  var blinkData = undefined;
  var webkitData = undefined;
  var organizations = [];
  // Make the vis cleaner by stripping out smaller contributors.
  var minimumContributions = 45;

  d3.csv("data/blinkCommitsByOrganization.csv", function(error, data) {
    blinkData = data;
    updateCommitsByOrganization();
  });
  d3.csv("data/webkitCommitsByOrganization.csv", function(error, data) {
    webkitData = data;
    updateCommitsByOrganization();
  });

  function updateCommitsByOrganization() {
    if (!blinkData || !webkitData)
      return;

    blinkData.forEach(function(d) {
      if (!organizations[d.Organization])
        organizations[d.Organization] = {blinkCommits: 0, webkitCommits: 0};
      organizations[d.Organization].blinkCommits = parseInt(d.commits);
    });
    webkitData.forEach(function(d) {
      if (!organizations[d.Organization])
        organizations[d.Organization] = {blinkCommits: 0, webkitCommits: 0};
      organizations[d.Organization].webkitCommits = parseInt(d.commits);
    });

    var data = [];
    var i = 0;
    for (organization in organizations) {
      var blinkCommits = organizations[organization].blinkCommits;
      var webkitCommits = organizations[organization].webkitCommits;
      if (blinkCommits + webkitCommits > minimumContributions) {
        data[i] = {Blink: blinkCommits, Webkit: webkitCommits, Organization: organization};
        i = i + 1;
      }
    }
    // Gives a decent looking sort with Google on the left and Apple on the right.
    data.sort(function(a, b) { return (a.Webkit + 2*b.Blink) - (b.Webkit + 2*a.Blink);});

  var margin = {top: 20, right: 50, bottom: 30, left: 50},
      width = 960 - margin.left - margin.right,
      height = 350 - margin.top - margin.bottom;

    var x0 = d3.scale.ordinal()
        .rangeRoundBands([0, width], .3);

    var x1 = d3.scale.ordinal();

    var y = d3.scale.sqrt()
        .range([height, 0]);

    var color = d3.scale.ordinal()
        .range(["#1f77b4", "#ff7f0e", "#9467bd"]);

    var xAxis = d3.svg.axis()
        .scale(x0)
        .orient("bottom")
        .tickSize(0);

    var yAxis = d3.svg.axis()
        .scale(y)
        .ticks(9)
        .orient("left")
        .tickFormat(d3.format(".2s"));

    var svg = d3.select("#commitsByOrganization").append("svg")
      .attr("viewBox", "0 0 " + (width + margin.left + margin.right) + " " + (height + margin.top + margin.bottom))
      .attr("preserveAspectRatio", "xMidYMid")
      .attr("width", "100%")
      .attr("height", "350px")
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var organizationNames = d3.keys(data[0]).filter(function(key) { return key !== "Organization"; });

    data.forEach(function(d) {
      d.ages = organizationNames.map(function(name) { return {name: name, value: +d[name]}; });
    });
    x0.domain(data.map(function(d) { return d.Organization; }));
    x1.domain(organizationNames).rangeRoundBands([0, x0.rangeBand()]);
    y.domain([0, d3.max(data, function(d) { return d3.max(d.ages, function(d) { return d.value; }); })]);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Core commits since fork");

    var organization = svg.selectAll(".organization")
        .data(data)
      .enter().append("g")
        .attr("class", "g")
        .attr("transform", function(d) { return "translate(" + x0(d.Organization) + ",0)"; });

    organization.selectAll("rect")
        .data(function(d) { return d.ages; })
      .enter().append("rect")
        .attr("width", x1.rangeBand())
        .attr("x", function(d) { return x1(d.name); })
        .attr("y", function(d) { return y(d.value); })
        .attr("height", function(d) { return height - y(d.value); })
        .style("fill", function(d) { return color(d.name); });

    organization.selectAll("text")
        .data(function(d) { return d.ages; })
      .enter().append("text")
        .attr("x", function(d) { return x1(d.name) + x1.rangeBand() / 2; })
        .attr("y", function(d) { return y(d.value)-1; })
        .attr("class", "commitsByOrganizationText")
        .text(function(d) { return d.value > 0 ? d3.format(".2s")(d.value) : ""; });

    var legend = svg.selectAll(".legend")
        .data(organizationNames.slice().reverse())
      .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

    legend.append("rect")
        .attr("x", width - 21)
        .attr("width", 21)
        .attr("height", 18)
        .style("fill", color);

    legend.append("text")
        .attr("x", width - 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(function(d) { return d; });
  }
}

document.addEventListener("DOMContentLoaded", showCommitsByOrganization);