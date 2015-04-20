var filter_time = function(slider_value) {
    var time = start_time + (slider_value / width * time_range);

    var good_edges = get_edges(time);
    var good_nodes = get_nodes(time);


    console.log(time);


    var svg = d3.select("body").select(".network-display").select('svg');

    var weights = scale_edges(svg, stored_edge_data, time);

    process_nodes(svg, good_nodes, time);
    process_links(svg, good_edges, weights);

    update_force_layout(svg, good_nodes, good_edges, force_layout);

    var line = d3.select("body").select(".network-health").select("svg").select(".guide");

    //line
    //    .attr("x1", time_scale(slider_value)*barWidth)
    //    .attr("x2", time_scale(slider_value)*barWidth);

};