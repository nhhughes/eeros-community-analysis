var filter_time = function(slider_value) {
	var time = start_time + (slider_value / width * time_range);
	good_edges = get_edges(time);
	
	var svg = d3.select("body").select(".network-display").select('svg');
    
	var nodes = svg.selectAll('.node');
	
	update_links(svg, good_edges);
	force_object.links(good_edges);

}