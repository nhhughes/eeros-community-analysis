/**
 * Created by nathan on 4/17/15.
 */

var time_scale;
var barWidth;

function make_chart(data, svg) {

    var dates = data.map(function (d) {
        return d[0] / 86400;
    });

    var min_date = dates.reduce(function (a, b) {return a < b ? a : b});
    var max_date = dates.reduce(function (a, b) {return a > b ? a : b});
    max_date = max_date - min_date;

    time_scale = d3.scale.linear().range([1.5, data.length]);
    time_scale.domain([0, width]);

    var margin = {top: 20, right: 30, bottom: 30, left: 40};
    var width_h = width - margin.left - margin.right;
    var height_h = height - margin.top - margin.bottom;

    svg
        .attr("width", width_h + margin.left + margin.right)
        .attr("height", height_h + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var x = d3.scale.linear()
        .range([0, width_h])
        .domain([0, max_date]);

    var y = d3.scale.linear()
        .range([height_h, 10]);

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    y.domain([0, d3.max(data, function (d) {
        return d[1];
    })]);

    barWidth = width_h / data.length;

    var bar = svg.selectAll("g")
        .data(data)
        .enter().append("g");

    bar.append("circle")
        .attr("cy", function (d) {
            return y(d[1]);
        })
        .attr("r", 3)
        .attr("cx", function (d) {
            return x((d[0]/86400) - min_date);
        });
    //
    //bar.append("text")
    //    .attr("x", barWidth / 2)
    //    .attr("y", function (d) {
    //        return y(d) -10;
    //    })
    //    .attr("dy", ".75em")
    //    .attr("opacity", 0.)
    //    .text(function (d) {
    //        return Math.round(d);
    //    });

    //var lines = svg.selectAll("g").append("g");
    //
    //var circles = svg.selectAll("circle")[0];
    //circles =  circles.sort(function (a, b) {
    //    return a.cx - b.bx});
    //for (var i = 1; i < circles.length; i ++) {
    //    var x1 = circles[i].cx.baseVal.value;
    //    var y1 = circles[i].cy.baseVal.value;
    //    var x2 = circles[i-1].cx.baseVal.value;
    //    var y2 = circles[i-1].cy.baseVal.value;
    //    lines.append("line")
    //        .attr("x1", x1)
    //        .attr("x2", x2)
    //        .attr("y1", y1)
    //        .attr("y2", y2)
    //
    //}
    //


    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height_h + ")")
        .call(xAxis)
        .append("text")
        .attr("y", -3)
        .attr("x", width_h)
        .style("text-anchor", "end")
        .text("Time (days)");


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
        .attr("y2", height_h);

}

var health_chart = function() {
    var svg = d3.select("body").select(".network-health").select('svg');
    var health = JSON.parse(query_results).graph[0][1];

    make_chart(health, svg);
};