/**
 * Created by nathan on 4/17/15.
 */

var time_scale;
var barWidth;
var actors;
var commits;
var health;
var closeness;
var margin = {top: 20, right: 30, bottom: 30, left: 40};
var list;

function make_chart(data, svg) {

    var dates = data.map(function (d) {
        return d[0] / 86400;
    });

    var min_date = dates.reduce(function (a, b) {return a < b ? a : b});
    var max_date = dates.reduce(function (a, b) {return a > b ? a : b});
    max_date = max_date - min_date;

    time_scale = d3.scale.linear().range([1.5, data.length]);
    time_scale.domain([0, width]);


    var width_h = width - margin.left - margin.right;
    var height_h = height - margin.top - margin.bottom;

    svg
        .attr("width", width_h + margin.left + margin.right)
        .attr("height", height_h + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var lines = svg.append("g")
        .attr("class", "connections");

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

    var bar = svg.selectAll("circle")
        .data(data);

    bar
        .enter()
        .append("circle")

        .attr("class",  "data_point")
        .attr("cy", function (d) {
            return y(d[1]);
        })
        .attr("r", 3)
        .attr("cx", function (d) {
            return x((d[0]/86400) - min_date) + margin.left;
        });

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(" + margin.left + "," + height_h + ")")
        .call(xAxis)
        .append("text")
        .attr("y", -3)
        .attr("x", width_h)
        .style("text-anchor", "end")
        .text("Time (days)");


    svg.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(" + margin.left + ", 0)")
        .call(yAxis)
        .append("text")
        .attr("class", "label")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Estrada Index");

    svg.append("line")
        .attr("stroke", "red")
        .attr("class", "guide")
        .attr("stroke-width", 2)
        .attr("x1", 1.5 * barWidth + margin.left)
        .attr("x2", 1.5 * barWidth + margin.left)
        .attr("y1", 0)
        .attr("y2", height_h);

    var circles = svg.selectAll("circle")[0];
    circles =  circles.sort(function (a, b) {
        return a.cx.baseVal.value - b.cx.baseVal.value});

    list = [];
    for (var j = 0; j < circles.length-1; j++) {
        list.push(j);
    }

    lines.selectAll("line")
        .data(list)
        .enter()
        .append("line")
        .attr("x1", function(d) {
            return circles[d].cx.baseVal.value;
        })
        .attr("x2", function(d) {
            return circles[d+1].cx.baseVal.value;
        })
        .attr("y1", function(d) {
            return circles[d].cy.baseVal.value;
        })
        .attr("y2", function(d) {
            return circles[d+1].cy.baseVal.value;
        })
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1);

}

var health_chart = function() {
    var svg = d3.select("body").select(".network-health").select('svg');
    var json_graph = JSON.parse(query_results).graph;


    json_graph.forEach( function (d) {
        if (d[0] == "commits") {
            commits = d[1];
        }
        if (d[0] == "actors") {
            actors = d[1];
        }
        if (d[0] == "health") {
            health = d[1];
        }
        if (d[0] == "closeness") {
            closeness = d[1];
        }
    } );

    make_chart(health, svg);
};