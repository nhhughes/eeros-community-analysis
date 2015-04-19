var coordinates = [0, 0];
var to_move;
var r = width / 50;
var animationStep = 100;
var force_object;
var start_time = -1;
var end_time = -1;
var time_range;
var stored_edge_data;
var stored_node_data;


function register_times(edge_data) {
    edge_data.forEach(function (d) {

        var start = d.start;
        if (start.length > 0) {

            if ((start_time > start[0] || start_time == -1) && start[0] != -1) {
                start_time = start[0]
            }
        }
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

    data.forEach(function(d) {
        d.x = Math.floor((Math.random() * width) + 1);
        d.y = Math.floor((Math.random() * height) + 1);
    });

    return svg.selectAll('.node')
        .data(data, function(d) {
            return d.name;
        })
        .enter().append('g')
        .attr('class', 'node')
        .attr('cx', function (d) {
            return d.x;
        })
        .attr('cy', function (d) {
            return d.y;
        })
        .call(force_object.drag());

}

function update_nodes(svg, data) {
    var nodes = svg.selectAll('.node')
        .data(data, function(d) {
            return d.name;
        });

    nodes
        .exit()
        .select('circle')
        .attr('opacity', 0.);

    nodes
        .exit()
        .on('mouseover', function(d) {})
        .on('mouseout', function(d) {});


    nodes.exit()
        .select('text.name2')
        .attr('opacity', 0.);


    nodes
        .select('circle')
        .attr('opacity', 1.);

    nodes
        .on('mouseover', function (d) {
            var nodeSelection = d3.select(this).style({opacity: '0.8'});
            nodeSelection.select("text.name").style({opacity: '1.0'});
        })
        .on('mouseout', function (d) {
            var nodeSelection = d3.select(this).style({opacity: '1.0'});
            nodeSelection.select("text.name").style({opacity: '0.0'});
        });

    nodes
        .select('text.name2')
        .attr('opacity', 1.);

}


function update_links(svg, data, weights) {
    var edges = svg.selectAll('.link')
        .data(data, function (d) {
            return d.source.name + ":" + d.target.name;
        });


    edges
        .enter().append('line')
        .attr('class', 'link')
        .attr('weight', 1.0)
        .attr('x1', function (d) {
            return d.source.cx;
        })

        .attr('y1', function (d) {
            return d.source.cy;
        })
        .attr('x2', function (d) {
            return d.target.cx;
        })
        .attr('y2', function (d) {
            return d.target.cy;
        })
        .attr('opacity', 1.);

    edges
         .exit()
         .attr('opacity', 0.);

    edges
        .attr('opacity', 1.)
        .attr('stroke-width', function(d) {
            return weights[stored_edge_data.indexOf(d)];
        });
}


function process_links(svg, data) {

    var edges = svg.selectAll('.link')
        .data(data, function (d) {
            return d.source.name + ":" + d.target.name;
        });
       
    edges 
        .enter().append('line')
        .attr('class', 'link')
        .attr('weight', 1.0)
        .attr('x1', function (d) {
            return d.source.cx;
        })
        .attr('y1', function (d) {
            return d.source.cy;
        })
        .attr('x2', function (d) {
            return d.target.cx;
        })
        .attr('y2', function (d) {
            return d.target.cy;
        })
        .attr('opacity', 0.);
}

function draw_nodes(nodes) {
     nodes.append('circle')
        .attr('cx', function (d) {
            return d.x;
        })
        .attr('cy', function (d) {
            return d.y;
        })
        .attr("fill", "red")
        .attr('r', r)
        .attr('opacity', 0.);

    nodes.append('text')
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

}

function setup_mouse_handlers(svg) {

    svg.on('mousescroll', function () {
    });

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

function scale_edges(svg, data_links, time) {
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

function start_animation(svg, data_node, data_links) {

    force_object.links(data_links);
    force_object.nodes(data_node);
    force_object.linkDistance(width / 10);

    force_object.charge(-300);
    force_object.gravity(0.05);


    update_tick(svg, force_object, data_links, data_node);

    force_object.start();
    return svg;
}

function update_tick(svg, force, data_links, data_node) {


    var animating = true;

    var edges = svg.selectAll(".link").data(data_links);
    var nodes = svg.selectAll(".node").data(data_node);
    var circles = nodes.selectAll("circle");
    var texts = nodes.selectAll("text.name");
    var texts2 = nodes.selectAll("text.name2");

    force.on('tick', function () {
        nodes.transition().ease('linear').duration(animationStep)
            .attr('cx', function (d) {
                return d.x;
            })
            .attr('cy', function (d) {
                return d.y;
            });

        edges.transition().ease('linear').duration(animationStep)
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
                return d.x + r;
            })
            .attr('y', function (d) {
                return d.y + r;
            });

        texts2.transition().ease('linear').duration(animationStep)
            .attr('x', function (d) {
                return d.x;
            })
            .attr('y', function (d) {
                return d.y + 6;
            });


        force.stop();

        if (animating) {
            setTimeout(
                function () {
                    force.start();
                },
                animationStep
            );
        }

    });

}

function fix_edges(edge_data, nodes) {
       edge_data.forEach(function (d) {
           d.source = nodes[d.source];
           d.target = nodes[d.target];
           d.weights = d.weight;
       });
        edge_data.filter(function(d) {
            return d.source.name != d.target.name;
        });
        return edge_data;
}

function fix_nodes(node_data) {
    var temp = node_data.sort(function (a, b) {
        return a.entrance - b.entrance});
}

function add_node_labels(svg, data) {
    var count = 0;

    svg.selectAll("g")
        .data(data, function(d) {
            return d.name;
        })
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
        .attr("opacity", 0.)
        .attr("fill", "black")
        .attr("text-anchor", "middle")
        .text(function (d) {
            count++;
            return count;
        });

}

make_graph = function () {

    force_object = d3.layout.force()
        .size([width, height]);

    var json_data = JSON.parse(query_results);
    var node_data = json_data.nodes;
    var edge_data = json_data.links;

    stored_edge_data = edge_data;
    stored_node_data = node_data;

    fix_nodes(node_data);
    edge_data = fix_edges(edge_data, node_data);

    var good_edges = get_edges(start_time);
    var good_nodes = get_nodes(start_time);

    var svg = d3.select("body").select(".network-display").select('svg')
        .attr('width', width)
        .attr('height', height);


    process_links(svg, edge_data);
    var nodes = process_nodes(svg, node_data);

    register_times(edge_data);
    draw_nodes(nodes);
    add_node_labels(svg, node_data);

    setup_mouse_handlers(svg);

    var weights = scale_edges(svg, stored_edge_data, start_time);

    update_nodes(svg, good_nodes);
    update_links(svg, good_edges, weights);

    start_animation(svg, good_nodes, good_edges);

};