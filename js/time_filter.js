var filter_time = function(slider_value) {
    var time = start_time + (slider_value / width * time_range);

    var good_edges = get_edges(time);
    var good_nodes = get_nodes(time);

    var svg = d3.select("body").select(".network-display").select('svg');

    var weights = scale_edges(stored_edge_data, time);

    process_nodes(svg, good_nodes, time);
    process_links(svg, good_edges, weights);

    update_force_layout(svg, good_nodes, good_edges, force_layout);

    var line = d3.select("body").select(".network-health").select("svg").select(".guide");

    line
        .attr("x1", time_scale(slider_value)*barWidth)
        .attr("x2", time_scale(slider_value)*barWidth);

    var actual_time = commits.reduce(function(a, b) {
       return (Math.abs(parseInt(a) - time) < Math.abs(parseInt(b) - time) ? a: b);
    })[0];

    var commit_data = commits.filter(function (d) {return d[0] == actual_time})[0][1];
    var actor_data = actors.filter(function (d) {return d[0] == actual_time})[0][1];
    var data = [(Math.floor((time - start_time)/604800)).toString() + " week(s)", commit_data, actor_data];

    var table = d3.select("body").select(".stats-table").select("#update");

    table.selectAll("td")
        .data(data)
        .text(function(d) {return d});

};

var current_health_metric = "Estrada Index";

function update_health_chart(data, svg, label) {
    var margin = {top: 20, right: 30, bottom: 30, left: 40};

    var height_h = height - margin.top - margin.bottom;

    var y = d3.scale.linear()
        .range([height_h, 10]);

    y.domain([0, d3.max(data, function (d) {
        return d[1];
    })]);

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    var bar = svg.selectAll(".data_point")
        .data(data)
        .selectAll("circle");

    bar
        .transition()
        .duration(250)
        .attr("cy", function (d) {
            return y(d[1]);
        });

    var lines = svg.select(".connections").selectAll("line")[0];

    console.log(lines.length);
    console.log(data.length);
    for (var i = 1; i < data.length; i ++) {
        var y1 = data[i][1];
        var y2 = data[i-1][1];
        //console.log(lines[i-1]);
    }





}

var change_menu_items = function(new_menu_item) {
  //Do stuff involving swapping out the labels

    current_health_metric = new_menu_item;

    var svg = d3.select("body").select(".network-health").select('svg');
    if (new_menu_item == "Estrada Index") {
        update_health_chart(health, svg, new_menu_item);
    }
    else if (new_menu_item == "Commits") {
        update_health_chart(commits, svg, new_menu_item);
    }
    else if (new_menu_item == "Contributors") {
        update_health_chart(actors, svg, new_menu_item);
    }
    else {
        console.log("TBD");
    }



};