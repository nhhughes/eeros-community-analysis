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
        .attr("x1", time_scale(slider_value)*barWidth + margin.left)
        .attr("x2", time_scale(slider_value)*barWidth + margin.left);

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

    var axis_object = d3.select('.y').call(yAxis).select('.label');

    axis_object.text(label);

    var bar = svg.selectAll(".data_point")
        .data(data);

    bar
        .transition()
        .duration(250)
        .attr("cy", function (d) {
            return y(d[1]);
        });

    var lines = svg.select(".connections").selectAll("line");
    lines.data(list)
        .transition()
        .duration(250)
        .attr("y1", function(d) {
            return y(data[d][1]);
        })
        .attr("y2", function(d) {
            return y(data[d+1][1]);
        });
}

var change_menu_items = function(new_menu_item) {
  //Do stuff involving swapping out the labels
    if (new_menu_item == current_health_metric) {
        return false;
    }

    var svg = d3.select("body").select(".network-health").select('svg');
    if (new_menu_item == "#option1") {
        update_health_chart(health, svg, "Estrada Index");
    }
    else if (new_menu_item == "#option2") {
        update_health_chart(closeness, svg, "Average Closeness");
    }
    else if (new_menu_item == "#option3") {
        update_health_chart(commits, svg, "Commits");
    }
    else if (new_menu_item == "#option4") {
        update_health_chart(actors, svg, "Contributors");
    }
    else {
        console.log("TBD");
    }
    return true;


};