var filter_time = function(slider_value) {

    force_object.stop();
    var time = start_time + (slider_value / width * time_range);
	var good_edges = get_edges(time);
	var good_nodes = get_nodes(time);

    console.log(good_nodes.filter(function(d) {
        return isNaN(d.x) || isNaN(d.y);
    }));

	var svg = d3.select("body").select(".network-display").select('svg');
    
    var weights = scale_edges(svg, stored_edge_data, time);

	update_nodes(svg, good_nodes);
    update_links(svg, good_edges, weights);

	force_object.nodes(good_nodes);
    force_object.links(good_edges);


    update_tick(svg, force_object, good_edges, good_nodes);
    force_object.resume();
};