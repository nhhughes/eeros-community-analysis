/**
 * Created by nathan on 4/17/15.
 */

var time_scale;
var barWidth;

function make_chart(data, svg) {


    time_scale = d3.scale.linear().range([1.5, data.length + 1.5]);
    time_scale.domain([0, width]);

    var margin = {top: 20, right: 30, bottom: 30, left: 40};
    width = width - margin.left - margin.right;
    height = height - margin.top - margin.bottom;

    svg
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var x = d3.scale.ordinal()
        .rangeRoundBands([0, width], .1);

    var y = d3.scale.linear()
        .range([height, 0]);

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    y.domain([0, d3.max(data, function (d) {
        return 10 + d;
    })]);

    barWidth = width / data.length;

    var bar = svg.selectAll("g")
        .data(data)
        .enter().append("g")
        .attr("transform", function (d, i) {
            return "translate(" + i * barWidth + ",0)";
        });

    bar.append("circle")
        .attr("cy", function (d) {
            return y(d);
        })
        .attr("r", 3)
        .attr("cx", barWidth / 2);

    bar.append("text")
        .attr("x", barWidth / 2)
        .attr("y", function (d) {
            return y(d) -10;
        })
        .attr("dy", ".75em")
        .attr("opacity", 0.)
        .text(function (d) {
            return Math.round(d);
        });

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
        .append("text")
        .attr("y", 15)
        .attr("x", 40)
        .style("text-anchor", "end")
        .text("Time");


    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Estrada Index");

    svg.append("line")
        .attr("stroke", "red")
        .attr("class", "guide")
        .attr("stroke-width", 2)
        .attr("x1", 1.5 * barWidth)
        .attr("x2", 1.5 * barWidth)
        .attr("y1", 0)
        .attr("y2", 500-margin.bottom - margin.top);

}

var health_chart = function() {
    var svg = d3.select("body").select(".network-health").select('svg');
    var health = JSON.parse(query_results).graph[0][1];

    make_chart(health, svg);
};