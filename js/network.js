var r = width / 50;

var start_time = -1;
var end_time = -1;
var time_range;

var stored_edge_data;
var stored_node_data;

var animationStep = 100;
var animation_delay = 100;

var force_layout;

function register_times(edge_data, node_data) {
    start_time = node_data[0].entrance;
    edge_data.forEach(function (d) {
        var end = d.end;
        if (end.length > 0) {
            if ((end_time < end[end.length-1] || end_time == -1) && end[end.length-1] != - 1) {
                end_time = end[end.length-1];
            }
        }

    });
    time_range = end_time - start_time;
}

function get_edges(time) {
    return stored_edge_data.filter(function (item) {
        for (var i = 0; i < item.start.length; i++) {
            if (item.start[i] <= time && time <= item.end[i]) {
                return true;
            }
        }
        return false;
    });
}

function get_nodes(time) {
    return stored_node_data.filter(function(d) {
        return d.entrance <= time;
    });
}


function process_nodes(svg, data, time) {

    var extremes = get_node_extremes(data, time);

    if (extremes[0] == extremes[1]) {
        extremes = [extremes[0] + 0.1, extremes[1]];
    }
    var color = d3.scale.linear()
        .domain(extremes)
        .range(["green", "white"]);

    var importances = get_node_importance(data, time);
    var labels = svg.select('#labels').selectAll('text')
        .data(data, function(d) {
            return d.name;
        });

    labels
        .exit()
        .remove();

    labels
        .enter()
        .append('text')
        .attr("x", function (d) {
            return 0
        })
        .attr("y", function (d) {
            return 20;
        })
        .attr("font-family", "sans-serif")
        .attr("class", "noselect")
        .attr("font-size", "20px")
        .attr("stroke", "black")
        .attr("stroke-width", "0.5")
        .attr("opacity", 0.)
        .attr("fill", "black")
        .text(function (d) {
            return d.name;
        });

    var nodes = svg.select('#nodes').selectAll('.node')
        .data(data, function(d) {
            return d.name;
        });

    nodes
        .selectAll('circle')
        .attr("fill", function(d) {var temp = color(importances[data.indexOf(d)]);
            return temp;});


    var enter_count = 0;

    var groups = nodes
        .enter().append('g')
        .attr('class', function(d) {
            enter_count++;
            return 'node';
        })
        .on('mouseover', function (d) {
            var node_selection = d3.select(this);
            var labels = d3.select("body").select(".network-display").select('svg').select('#labels').selectAll('text');
            var label = labels.filter(function (l) {return l.name == node_selection.data()[0].name;});
            label
                .transition()
                .delay(100)
                .attr('opacity', 1.);
        })
        .on('mouseout', function (d) {
            var node_selection = d3.select(this);
            var labels = d3.select("body").select(".network-display").select('svg').select('#labels').selectAll('text');
            var label = labels.filter(function (l) {return l.name == node_selection.data()[0].name;});
            label
                .transition()
                .delay(100)
                .attr('opacity', 0.);
        })
        .call(force_layout.drag());

    nodes
        .exit()
        .transition()
        .duration(animation_delay)
        .style("opacity", 0.)
        .remove();

    var count = data.length - enter_count;

    //Place for update methods
    groups.append('circle')
        .attr('cx', function (d) {
            return d.x;
        })
        .attr('cy', function (d) {
            return d.y;
        })
        .attr("fill", function(d) {return color(importances[data.indexOf(d)])})
        .attr("stroke", "black")
        .attr('r', r);

    groups
        .append('text')
        .attr('x', function (d) {
            return d.x;
        })
        .attr('y', function (d) {
            return d.y + 6;
        })
        .attr("font-family", "sans-serif")
        .attr("class", "name2")
        .attr("font-size", "12px")
        .attr("stroke", "black")
        .attr("stroke-width", "0.5")
        .attr("fill", "black")
        .attr("text-anchor", "middle")
        .text(function (d) {
            count++;
            return count;
        });

}

function process_links(svg, data, weights) {

    var edges = svg.select("#edges").selectAll('.link')
        .data(data, function (d) {
            return d.source.name + ":" + d.target.name;
        });

    edges
        .attr('stroke-width', function(d) {
            return weights[data.indexOf(d)];
        });

    edges
        .enter().append('line')
        .attr('class', 'link')
        .attr('weight', 1.0)
        .attr('x1', function (d) {
            return d.source.x;
        })
        .attr('y1', function (d) {
            return d.source.y;
        })
        .attr('x2', function (d) {
            return d.target.x;
        })
        .attr('y2', function (d) {
            return d.target.y;
        })
        .attr('stroke-width', function(d) {
            return weights[data.indexOf(d)];
        });

    edges
        .exit()
        .remove();
}

function start_force_layout() {
    var force_object = d3.layout.force()
        .size([width, height]);
    force_object.linkDistance(width / 10);

    force_object.charge(-300);
    force_object.gravity(0.05);
    return force_object;
}

function update_force_layout(svg, nodes, edges, force_object) {


    force_object.links(edges);
    force_object.nodes(nodes);

    var edges_selection = svg.selectAll(".link");
    var nodes_selection = svg.selectAll(".node");
    var circles = nodes_selection.selectAll("circle");

    var texts = nodes_selection.selectAll("text");

    force_object.on('tick', function () {

        edges_selection.transition().ease('linear').duration(animationStep)
            .attr('x1', function (d) {
                return d.source.x;
            })
            .attr('y1', function (d) {
                return d.source.y;
            })
            .attr('x2', function (d) {
                return d.target.x;
            })
            .attr('y2', function (d) {
                return d.target.y;
            });

        circles.transition().ease('linear').duration(animationStep)
            .attr('cx', function (d) {
                return d.x;
            })
            .attr('cy', function (d) {
                return d.y;
            });

        texts.transition().ease('linear').duration(animationStep)
            .attr('x', function (d) {
                return d.x;
            })
            .attr('y', function (d) {
                return d.y + 6;
            });

        force_object.stop();

        setTimeout(function () {force_object.start();}, animationStep);

    });

    force_object.start();

}


make_graph = function () {

    force_layout = start_force_layout();

    var json_data = JSON.parse(query_results);
    stored_node_data = json_data.nodes;
    stored_edge_data = json_data.links;

    stored_edge_data = fix_edges(stored_edge_data, stored_node_data);
    fix_nodes(stored_node_data);

    var svg = d3.select("body").select(".network-display").select('svg')
        .attr('width', width)
        .attr('height', height);

    svg.append('g')
        .attr('id', 'edges');

    svg.append('g')
        .attr('id', 'nodes');

    svg.append('g')
        .attr('id', 'labels');

    register_times(stored_edge_data, stored_node_data);

    var good_edges = get_edges(start_time);
    var good_nodes = get_nodes(start_time);
    var weights = scale_edges(stored_edge_data, start_time);
    process_links(svg, good_edges, weights);
    process_nodes(svg, good_nodes, start_time);

    update_force_layout(svg, good_nodes, good_edges, force_layout);

    var table = d3.select("body").select(".stats-table").select("#update");

    var age = "0 week(s)";
    var commit_data = commits.filter(function (d) {return d[0] == start_time})[0][1];
    var actor_data = actors.filter(function (d) {return d[0] == start_time})[0][1];
    var data = [age, commit_data, actor_data];

    table.selectAll("td")
        .data(data)
        .enter()
        .append("td")
        .text(function(d) {return d});



};