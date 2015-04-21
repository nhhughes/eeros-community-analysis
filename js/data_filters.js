/**
 * Created by nathan on 4/20/15.
 */

function fix_edges(edge_data, nodes) {

    edge_data.forEach(function (d) {
        d.source = nodes[d.source];
        d.target = nodes[d.target];
    });
    return edge_data;

}

function fix_nodes(node_data) {
    node_data.forEach(function(d) {
        d.x = Math.floor((Math.random() * (width - 2*r)) + 1 + r);
        d.y = Math.floor((Math.random() * (height - 2*r)) + 1 + r);
    });

    node_data.sort(function (a, b) {
        return a.entrance - b.entrance});
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
        .range([1,3.]);
    var good_links = get_edges(time);

    weight_scale.domain(get_extremes(good_links, time));

    var weights = get_weights(data_links, good_links, time);
    weights = weights.map(function (d) {
        return weight_scale(d);
    });
    return weights;
}

function get_node_extremes(filtered_nodes, time) {
    var max_weight = -1;
    var min_weight = -1;

    filtered_nodes.forEach(function (d) {

        var actual_times = Object.keys(d.importance);

        var actual_time = actual_times.reduce(function (prev, curr) {
            return (Math.abs(parseInt(curr) - time) < Math.abs(parseInt(prev) - time) ? curr: prev);
        });

        if (d.importance[actual_time] > max_weight || max_weight == -1) {
            max_weight = d.importance[actual_time]
        }
        if (d.importance[actual_time] < min_weight || min_weight == -1) {
            min_weight = d.importance[actual_time]
        }
    });
    return [max_weight, min_weight]
}

function get_node_importance(filtered_nodes, time) {
    return filtered_nodes.map(function (d) {
        var actual_times = Object.keys(d.importance);
        var actual_time = actual_times.reduce(function (prev, curr) {
            return (Math.abs(parseInt(curr) - time) < Math.abs(parseInt(prev) - time) ? curr: prev);
        });
        return d.importance[actual_time];

    })
}