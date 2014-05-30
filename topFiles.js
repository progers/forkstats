function showTopFiles() {
  d3.csv("data/blinkTopFiles.csv", function(error, data) {
    showData(data, "Blink");
  });
  d3.csv("data/webkitTopFiles.csv", function(error, data) {
    showData(data, "Webkit");
  });

  function createHierarchy(data) {
    var numNodes = 20;
    hierarchy = {name: "root"};
    for (dat in data) {
      if (dat > numNodes) break;
      var path = data[dat].path;
      var file = data[dat].file;
      var count = data[dat].count;
      var pathComponents = path.split('/');
      pathComponents.push(file);

      var current = hierarchy;
      for (component in pathComponents) {
        var dir = pathComponents[component];
        if (!current.children)
          current.children = [];
        var child = undefined;
        for (c in current.children) {
          if (current.children[c].name == dir) {
            child = current.children[c];
            break;
          }
        }
        if (!child) {
          child = {name: dir};
          current.children.push(child);
        }
        current = child;
      }
      current.size = parseInt(count);
    }

    return hierarchy;
  }

  function showData(data, repo) {
    root = createHierarchy(data);

    var margin = {top: 0, right: 10, bottom: 25, left: 10},
        width = 445 - margin.left - margin.right,
        height = 300 - margin.top - margin.bottom;

    // Colors from https://github.com/mbostock/d3/blob/master/lib/colorbrewer/colorbrewer.js
    var color = (repo == "Blink" ? d3.scale.ordinal().range(["#f7fbff","#deebf7","#c6dbef","#9ecae1","#6baed6","#4292c6","#2171b5"]) : d3.scale.ordinal().range(["#fff5eb","#fee6ce","#fdd0a2","#fdae6b","#fd8d3c","#f16913","#d94801"]));

    var treemap = d3.layout.treemap()
        .size([width, height])
        .sticky(true)
        .value(function(d) { return d.size; });

    var div = d3.select("#topFiles").append("div")
        .style("position", "relative")
        .style("width", (width + margin.left + margin.right) + "px")
        .style("height", (height + margin.top + margin.bottom) + "px")
        .style("top", margin.top + "px");
    div[0][0].setAttribute('id', repo);
    d3.select("#topFiles").style("height", height + "px");

    var node = div.datum(root).selectAll(".node")
        .data(treemap.nodes)
      .enter().append("div")
        .attr("class", "topFilesNode")
        .call(position)
        .style("background", function(d) { return d.children ? color(d.name) : null; })
        .html(function(d) { return d.children ? null : d.name + "<br>(" + d.size + ")"; })
        .attr("title", function(d) { return d.children ? null : d.name; });

    div.append("div")
        .attr("class", "topFilesTitle")
        .style("left", 0 + "px")
        .style("width", width + "px")
        .style("top", height + "px")
        .text("Top " + repo + " core changes since fork (count in parenthesis)");
  }

  function position() {
    this.style("left", function(d) { return d.x + "px"; })
        .style("top", function(d) { return d.y + "px"; })
        .style("width", function(d) { return Math.max(0, d.dx - 1) + "px"; })
        .style("height", function(d) { return Math.max(0, d.dy - 1) + "px"; });
  }
}

document.addEventListener("DOMContentLoaded", showTopFiles);