function showTopFiles() {
  d3.csv("blinkTopFiles.csv", function(error, data) {
    showData(data, "Blink");
  });
  d3.csv("webkitTopFiles.csv", function(error, data) {
    showData(data, "Webkit");
  });

  function showData(data, repo) {
    for (dat in data) {
      data[dat].name = data[dat].file;
      data[dat].value = data[dat].count;
      data[dat].size = data[dat].count;
    }
    data = {children: data};
    console.log(data)

    var diameter = 960,
        format = d3.format(",d"),
        color = d3.scale.category20c();

    var bubble = d3.layout.pack()
        .sort(null)
        .size([diameter, diameter])
        .padding(1.5);

    var svg = d3.select("#topFiles").append("svg")
        .attr("width", diameter)
        .attr("height", diameter)
        .attr("class", "bubble");

    var node = svg.selectAll(".node")
        .data(bubble.nodes(data)
        .filter(function(d) { return !d.children; }))
      .enter().append("g")
        .attr("class", "node")
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

    node.append("title")
        .text(function(d) { return d.file + ": " + format(d.value); });

    node.append("circle")
        .attr("r", function(d) { return d.r; })
        .style("fill", function(d) { return "rgba(0,0,0,0.4)"; });

    node.append("text")
        .attr("dy", ".3em")
        .style("text-anchor", "middle")
        .text(function(d) { return d.file.substring(0, d.r / 3); });
  }
}

document.addEventListener("DOMContentLoaded", showTopFiles);