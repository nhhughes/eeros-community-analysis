var seen = {};
var coordinates = [0, 0];
var to_move;
var r = width / 50;
var animationStep = 100;
var force_object;
var start_time = -1;
var end_time = -1;
var time_range;
var stored_edge_data;

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


function filter_nodes(a) {

    var count = 0;
    return a.filter(function (item) {
        if (seen.hasOwnProperty(item.name)) {
            return false;
        }
        else {
            seen[item.name] = count;
            count++;
            return true;
        }
    });

}

function get_graph_data(json_data) {

    var node_data = JSON.parse(json_data).results[0].data;
    var nodes = node_data.map(function (curr, index, array) {
        return {"name": curr.row[0].name};
    });
    nodes = filter_nodes(nodes);

    var edges = node_data.map(function (curr, index, array) {
        return {"source": seen[curr.row[0].name], "target": seen[curr.row[2].name], "starts": curr.row[1].start, "ends": curr.row[1].ends};
    });
    return [nodes, edges];



}

function process_nodes(svg, data) {

    data.forEach(function (n) {
        n.x = Math.floor((Math.random() * width) + 1);
        n.y = Math.floor((Math.random() * height) + 1);
    });

    var click = function (d) {
        d.x = coordinates[0];
        d.y = coordinates[1];
        to_move = d;
    };

    var nodes = svg.selectAll('.node')
        .data(data)
        .enter().append('g')
        .attr('class', 'node')
        .attr('cx', function (d) {
            return d.x;
        })
        .attr('cy', function (d) {
            return d.y;
        })
        .on("mousedown", click);

    svg.on('mousescroll', function () {
    });

    d3.select('body').on('mouseup', function () {
        to_move = undefined;
    });

    svg.on('mousemove', function () {
        coordinates = d3.mouse(this);
        if (to_move) {
            to_move.x = coordinates[0];
            to_move.y = coordinates[1];
            nodes.transition().ease('linear').duration(animationStep)
                .attr('cx', function (d) {
                    return d.x;
                })
                .attr('cy', function (d) {
                    return d.y;
                });
        }
    });

    return nodes;

}

function update_links(svg, data) {
    // console.log(svg.selectAll('.link'));
    var edges = svg.selectAll('.link')
        .data(data, function (d) {
            return d.source.name + ":" + d.target.name;
        });


    edges
        .enter().append('line')
        .attr('class', 'link')
        .attr('weight', 1.0)
        .attr('x1', function (d) {
            //console.log(d);
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
         .attr('opacity', 1.);
         // .attr('x1', function (d) {
         //     return d.source.x;
         // })
         // .attr('y1', function (d) {
         //     return d.source.y;
         // })
         // .attr('x2', function (d) {
         //     return d.target.x;
         // })
         // .attr('y2', function (d) {
         //     return d.target.y;
         // });
}


function process_links(svg, data, nodes) {
    //console.log(data);
    //console.log(nodes);
    var edges = svg.selectAll('.link')
        .data(data, function (d) {
            return d.source.name + ":" + d.target.name;
        });
       
    edges 
        .enter().append('line')
        .attr('class', 'link')
        .attr('weight', 1.0)
        .attr('x1', function (d) {
            //console.log(d);
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
     var circles = nodes.append('circle')
        .attr('cx', function (d) {
            return d.x;
        })
        .attr('cy', function (d) {
            return d.y;
        })
        .attr("fill", "red")
        .attr('r', r);

    var texts = nodes.append('text')
        .attr("x", function (d) {
            return d.x + r;
        })
        .attr("y", function (d) {
            return d.y + r;
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
}

function setup_mouse_handlers(svg) {

    svg.selectAll('.node')
        .on('mouseover', function (d) {
            var nodeSelection = d3.select(this).style({opacity: '0.8'});
            nodeSelection.select("text").style({opacity: '1.0'});
        })
        .on('mouseout', function (d) {
            var nodeSelection = d3.select(this).style({opacity: '1.0'});
            nodeSelection.select("text").style({opacity: '0.0'});
        });

}

function start_animation(svg, data_node, data_links) {
    var animating = true;

    var force = d3.layout.force()
        .size([width, height]);

    var edges = svg.selectAll("line");
    var nodes = svg.selectAll("node");
    var circles = svg.selectAll("circle");
    var texts = svg.selectAll("text");


    force.nodes(data_node);
    force.links(data_links);
    force.linkDistance(width / 10);

    force.charge(-300);
    force.gravity(0.05);


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

    force.start();
    return force;
}

function fix_edges(edge_data, nodes) {
       edge_data.forEach(function (d) {
           d.source = nodes[d.source];
           d.target = nodes[d.target];
       });
        return edge_data;
}

make_graph = function () {

    var json_data = JSON.parse(query_results);
    var node_data = json_data.nodes;
    var edge_data = json_data.links;

    edge_data = fix_edges(edge_data, node_data);
    var svg = d3.select("body").select(".network-display").select('svg')
        .attr('width', width)
        .attr('height', height);

    process_links(svg, edge_data, node_data);
    var nodes = process_nodes(svg, node_data);

    stored_edge_data = edge_data;
    register_times(edge_data);
    draw_nodes(nodes);
    setup_mouse_handlers(svg);
    var good_edges = get_edges(start_time);
    force_object = start_animation(svg, node_data, good_edges);

};