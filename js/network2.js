var r = width / 50;

var start_time = -1;
var end_time = -1;
var time_range;

var stored_edge_data;
var stored_node_data;

var count = 0;

function register_times(edge_data, node_data) {
    start_time = node_data[0].entrance;
    edge_data.forEach(function (d) {
        var end = d.ends;
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
            if (item.start[i] <= time && time <= item.ends[i]) {
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


function process_nodes(svg, data) {

    var nodes = svg.select('#nodes').selectAll('.node')
        .data(data, function(d) {
            return d.name;
        });

    var groups = nodes
        .enter().append('g')
        .attr('class', 'node')
        .on('mouseover', function (d) {
            var nodeSelection = d3.select(this).style({opacity: '0.8'});
            nodeSelection.select("text.name").style({opacity: '1.0'});
        })
        .on('mouseout', function (d) {
            var nodeSelection = d3.select(this).style({opacity: '1.0'});
            nodeSelection.select("text.name").style({opacity: '0.0'});
        });

    nodes
        .exit()
        .transition()
        .duration(250)
        .style("opacity", 0.)
        .remove();

    count = count == 0 ? 0 : nodes[0].length;


    //Place for update methods
    groups.append('circle')
        .attr('cx', function (d) {
            return d.x;
        })
        .attr('cy', function (d) {
            return d.y;
        })
        .attr("fill", "red")
        .attr('r', r);

    groups.append('text')
        .attr("x", function (d) {
            return d.x + r;
        })
        .attr("y", function (d) {
            return d.y + r;
        })
        .attr("font-family", "sans-serif")
        .attr("class", "noselect name")
        .attr("font-size", "20px")
        .attr("stroke", "black")
        .attr("stroke-width", "0.5")
        .attr("opacity", 0.)
        .attr("fill", "black")
        .text(function (d) {
            return d.name;
        });

    groups
        .append('text')
        .attr('x', function (d) {
            return d.x;
        })
        .attr('y', function (d) {
            return d.y + 6;
        })
        .attr("font-family", "sans-serif")
        .attr("class", "noselect name2")
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
            return weights[stored_edge_data.indexOf(d)];
        });

    edges
        .exit()
        .transition()
        .delay(250)
        .style('opacity', 0)
        .remove();
}


function get_extremes(filtered_data_links, time) {
    var max_weight = -1;
    var min_weight = -1;

    filtered_data_links.forEach(function (d) {
        var actual_times = Object.keys(d.weights);

        var actual_time = actual_times.reduce(function (prev, curr) {
            return (Math.abs(curr - time) < Math.abs(curr - time) ? curr: prev);
        });

        if (d.weights[actual_time] > max_weight || max_weight == -1) {
            max_weight = d.weights[actual_time]
        }
        if (d.weights[actual_time] < min_weight || min_weight == -1) {
            min_weight = d.weights[actual_time]
        }
    });
    return [max_weight, min_weight]
}

function get_weights(data_links, good_links, time) {

    return data_links.map(function (d) {
        if (good_links.indexOf(d) > 0) {
            var actual_times = Object.keys(d.weights);

            var actual_time = actual_times.reduce(function (prev, curr) {
                return (Math.abs(curr - time) < Math.abs(curr - time) ? curr: prev);
            });
            return d.weights[actual_time];
        }
        else {
            return 0.;
        }
    })
}

function scale_edges(data_links, time) {
    var weight_scale = d3.scale.linear()
        .range([0.1,5.]);
    var good_links = get_edges(time);

    weight_scale.domain(get_extremes(good_links, time));

    var weights = get_weights(data_links, good_links, time);
    weights = weights.map(function (d) {
        return weight_scale(d);
    });
    return weights;
}

function fix_edges(edge_data, nodes) {
    edge_data.forEach(function (d) {
        d.source = nodes[d.source];
        d.target = nodes[d.target];
        d.weights = d.weight;
    });
    return edge_data.filter(function(d) {
        return d.source.name != d.target.name;
    });

}

function fix_nodes(node_data) {
    node_data.forEach(function(d) {
        d.x = Math.floor((Math.random() * (width - 2*r)) + 1 + r);
        d.y = Math.floor((Math.random() * (height - 2*r)) + 1 + r);
    });

    node_data.sort(function (a, b) {
        return a.entrance - b.entrance});
}

make_graph = function () {

    var json_data = JSON.parse(query_results);
    stored_node_data = json_data.nodes;
    stored_edge_data = json_data.links;


    fix_nodes(stored_node_data);
    stored_edge_data = fix_edges(stored_edge_data, stored_node_data);

    var svg = d3.select("body").select(".network-display").select('svg')
        .attr('width', width)
        .attr('height', height);


    svg.append('g')
        .attr('id', 'edges');

    svg.append('g')
        .attr('id', 'nodes');

    register_times(stored_edge_data, stored_node_data);

    var good_edges = get_edges(start_time);
    var good_nodes = get_nodes(start_time);

    var weights = scale_edges(stored_edge_data, start_time);
    process_links(svg, good_edges, weights);
    process_nodes(svg, good_nodes);

};