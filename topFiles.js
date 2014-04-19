function showTopFiles() {
  d3.csv("data/blinkTopFiles.csv", function(error, data) {
    showData(data, "Blink");
  });
  d3.csv("data/webkitTopFiles.csv", function(error, data) {
    showData(data, "Webkit");
  });

  function createHierarchy(data) {
    hierarchy = {name: "root"};
    for (dat in data) {
      if (dat > 25) break;
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

    var margin = {top: 10, right: 10, bottom: 10, left: 10},
        width = 400 - margin.left - margin.right,
        height = 300 - margin.top - margin.bottom;

    var color = d3.scale.category20c();

    var treemap = d3.layout.treemap()
        .size([width, height])
        .sticky(true)
        .value(function(d) { return d.size; });

    var div = d3.select("#topFiles").append("div")
        .style("position", "relative")
        .style("width", (width + margin.left + margin.right) + "px")
        .style("height", (height + margin.top + margin.bottom) + "px")
        .style("left", margin.left + "px")
        .style("top", margin.top + "px");

    var node = div.datum(root).selectAll(".node")
        .data(treemap.nodes)
      .enter().append("div")
        .attr("class", "topFilesNode")
        .call(position)
        .style("background", function(d) { return d.children ? color(d.name) : null; })
        .text(function(d) { return d.children ? null : d.name; })
        .attr("title", function(d) { return d.children ? null : d.name; });

    div.append("div")
        .attr("class", "topFilesTitle")
        .style("left", 0 + "px")
        .style("width", width + "px")
        .style("top", height + "px")
        .text("Top changed files for " + repo);
  }

  function position() {
    this.style("left", function(d) { return d.x + "px"; })
        .style("top", function(d) { return d.y + "px"; })
        .style("width", function(d) { return Math.max(0, d.dx - 1) + "px"; })
        .style("height", function(d) { return Math.max(0, d.dy - 1) + "px"; });
  }
}

document.addEventListener("DOMContentLoaded", showTopFiles);