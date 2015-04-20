<!DOCTYPE html>
<html lang="en">
<head>

    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <meta name="description" content="EEROS">
    <meta name="author" content="The EEROS Team">

    <title>Analysis Tool</title>

    <script>
        var playing = false;
        var width = 700,
        height = 500;
    </script> 


    <script src="js/jquery.js"></script>
    <script src="./js/jquery-ui.min.js"></script>
    <script src="./js/d3.min.js"></script>
    <script src="./js/data_filters.js"></script>
    <script src="./js/network.js"></script>
    <script src="./js/time_filter.js"></script>
    <script src="./js/bootstrap.js"></script>
    <script src="./js/health_chart.js"></script>

    <link rel = "stylesheet" href="./css/bootstrap.css">
    <link rel = "stylesheet" href="./css/jquery-ui.min.css">

    <script>
        var id;
    $(function() {    
        $( "#slider" ).slider({
        slide: function(event, ui) {
            filter_time(ui.value);
            if (ui.value > 1) {
                $("button.restart").removeAttr('disabled');
            }
            else {
                $("button.restart").attr("disabled", "disabled");
            }
            if (ui.value == width && !playing) {
                $("button.play").attr('disabled', 'disabled');
            }
            if (ui.value != width && !playing) {
                $('button.play').removeAttr('disabled');
            }
        },
        change: function(event, ui) {
            if (ui.value > 1) {
                $("button.restart").removeAttr('disabled');
            }
            else {
                $("button.restart").attr("disabled", "disabled");
            }
            if (ui.value == width && !playing) {
                $("button.play").attr('disabled', 'disabled');
            }
            if (ui.value != width && !playing) {
                $('button.play').removeAttr('disabled');
            }
        },
        max: width,
        animate: "fast",
        range: "min"
    });
    });
    </script>

    <script>

        $(function() {
            $( "button.play" )
                .button()
                .click(function( event ) { //TODO disable clicking and sliding while playing
                    $("button.play").attr("disabled", "disabled");
                    $("button.pause").removeAttr("disabled");
                    playing=true;
                    id = setInterval(
                        function () {
                            var slider_instance = $('#slider');
                            if (slider_instance.slider('value') >= width) {
                                $("button.pause").attr("disabled", "disabled");
                                clearInterval(id);
                                playing=false;
                            }
                            else {
                                slider_instance.slider('value', slider_instance.slider('value')+1);
                            }
                            filter_time(slider_instance.slider('value'));
                        }, 25);
                    event.preventDefault();
                });
        });
        $(function() {
            $( "button.pause" )
                .button()
                .click(function( event) {
                    playing=false;
                    $("button.pause").attr("disabled", "disabled");
                    $("button.play").removeAttr("disabled");
                    clearInterval(id);
                })
        });
        $(function() {
            $( "button.restart" )
                .button()
                .click(function( event) {
                    playing=false;
                    $("button.pause").attr("disabled", "disabled");
                    $("button.play").removeAttr("disabled");
                    clearInterval(id);
                    $('#slider').slider('value', 0);
                })
        });
    </script>

    <script>
        var query_results = <?php
            $result = file_get_contents("./data/eeros-framework:actors");
            echo(json_encode($result));
        ?>;
    </script>


</head>

<style>

    .axis text {
        font: 10px sans-serif;
    }

    .axis path,
    .axis line {
        fill: none;
        stroke: #000;
        shape-rendering: crispEdges;
    }

    .noselect {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
}

    .node {
        fill: #ccc;
        stroke: #fff;
        stroke-width: 2px;
    }

    .link {
        stroke: #777;
    }

    .chart circle {
        fill: steelblue;
    }

    .chart rect {
        fill: steelblue;
    }

    .chart text {
        fill: black;
        font: 10px sans-serif;
        text-anchor: middle;
    }

    table {
        margin-left: auto;
        margin-right: auto;
    }

    td {
        padding: 15px;
    }


</style>

<body>
    <div class="container">
        <div class="row">
            <div class="col-md-6">
                <div class="network-display panel panel-primary">
                    <div class ="panel-heading">
                        <h1 class="text-center">Community Visualization</h1>
                    </div>
                    <div class ="panel-body">
                        <svg  class="noselect"></svg>
                        <div class="ui-grid-a">
                            <div class="btn-group" role="group" aria-label="...">
                                <button type="button" class="btn btn-primary play">
                                    <span class="glyphicon glyphicon-play" aria-hidden="true"></span>
                                </button>
                                <button type="button" class="btn btn-primary pause" disabled>
                                    <span class="glyphicon glyphicon-pause" aria-hidden="true"></span>
                                </button>
                                <button type="button" class="btn btn-primary restart" disabled>
                                    <span class="glyphicon glyphicon-refresh" aria-hidden="true"></span>
                                </button>
                            </div>

                            <div class="ui-block-a">
                                <div id="slider"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="network-health panel panel-primary">
                    <div class = "panel-heading">
                        <h1 class="text-center">Community Health Metrics</h1>
                    </div>
                    <div class="panel-body">
                        <div class="btn-group">
                            <button type="button" class="btn btn-primary dropdown-toggle" data-toggle="dropdown" aria-expanded="false">
                                Metric <span class="caret"></span>
                            </button>
                            <ul class="dropdown-menu" role="menu">
                                <li><a href="#">Estrada Index</a></li>
                            </ul>
                        </div>
                        <br>
                        <br>
                        <svg class="noselect chart"></svg>

                    </div>
                </div>
            </div>
        </div>
        <div class="row">
            <div class="col-md-12">
                <div class="panel panel-primary">
                    <div class="panel-heading">
                        <h1 class="text-center">Statistics</h1>
                    </div>
                    <div class="panel-body">
                        <p>Testing!</p>
                    </div>
                </div>
            </div>
        </div>
    </div>



<script>
    make_graph();
    health_chart();
</script>
</body>

</html>
