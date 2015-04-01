d3.json("data/graph.json", function (error, json) {
    if (error) return console.warn(error);
    var data = json;
    var width = 1200,
        height = 900;


    var nodes = data.nodes, links = data.links;

    nodes.forEach(function(n) {
        n.x = Math.floor((Math.random() * width) + 1);
        n.y = Math.floor((Math.random() * height +1));
    });

    var svg = d3.select('body').append('svg')
        .attr('width', width)
        .attr('height', height);

    var force = d3.layout.force()
        .size([width, height])
        .nodes(nodes)
        .links(links);

    force.linkDistance(width / 3);

    var link = svg.selectAll('.link')
        .data(links)
        .enter().append('line')
        .attr('class', 'link')
        .attr('x1', function (d) {
            return nodes[d.source].x;
        })
        .attr('y1', function (d) {
            return nodes[d.source].y;
        })
        .attr('x2', function (d) {
            return nodes[d.target].x;
        })
        .attr('y2', function (d) {
            return nodes[d.target].y;
        });

    var coordinates = [0, 0];
    var to_move;

    d3.select('body').on('mouseup', function() {
        to_move = undefined;
        force.start();
    });

    svg.on('mousemove', function() {
        coordinates = d3.mouse(this);
        if (to_move) {
            to_move.x = coordinates[0];
            to_move.y = coordinates[1];
            node.transition().ease('linear').duration(animationStep)
                .attr('cx', function (d) {
                    return d.x;
                })
                .attr('cy', function (d) {
                    return d.y;
                });
        }
    });


    var click = function(d) {
        d.x = coordinates[0];
        d.y = coordinates[1];
        to_move = d;
        force.stop();

    };

    var node = svg.selectAll('.node')
        .data(nodes)
        .enter().append('circle')
        .attr('class', 'node')
        .attr('r', width / 50)
        .attr('charge', -1000)
        .attr('cx', function (d) {
            return d.x;
        })
        .attr('cy', function (d) {
            return d.y;
        })
        .on("mousedown", click);

    var animating = true;




    var animationStep = 100;
    force.on('tick', function () {

        node.transition().ease('linear').duration(animationStep)
            .attr('cx', function (d) {
                return d.x;
            })
            .attr('cy', function (d) {
                return d.y;
            });

        link.transition().ease('linear').duration(animationStep)
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


});

