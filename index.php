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
    <link rel = "stylesheet" href="./css/charts.css">

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
                    $("button.dropdown-toggle").attr("disabled", "disabled");
                    $("button.play").attr("disabled", "disabled");
                    $("button.pause").removeAttr("disabled");
                    playing=true;
                    id = setInterval(
                        function () {
                            var slider_instance = $('#slider');
                            if (slider_instance.slider('value') >= width) {
                                $("button.pause").attr("disabled", "disabled");
                                $("button.dropdown-toggle").removeAttr("disabled");
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
                    $("button.dropdown-toggle").removeAttr("disabled");
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
                    filter_time(0);
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
                    filter_time(0);
                })
        });


    </script>

    <script>
        var eeros_results = <?php
            $result = file_get_contents("./data/eeros-framework:actors");
            echo(json_encode($result));
        ?>;
        var ros_results = <?php
            $result = file_get_contents("./data/ros:actors");
            echo(json_encode($result));
        ?>;
        var wpi_suite_results = <?php
            $result = file_get_contents("./data/wpi-suite:actors");
            echo(json_encode($result));
        ?>;

        var query_results = eeros_results;
    </script>


</head>

<body>
    <div class="container">
        <div class="row">
            <div class="col-md-6">
                <div class="network-display panel panel-primary">
                    <div class ="panel-heading">
                        <h1 class="text-center">Community Visualization</h1>
                    </div>
                    <div class ="panel-body">
                        <div class="btn-group">
                            <button type="button" class="btn btn-primary dropdown-toggle" data-toggle="dropdown" aria-expanded="false">
                                Repository<span class="caret"></span>
                            </button>
                            <ul class="dropdown-menu" role="menu">
                                <li><a href="javascript:change_repository(1)">eeros-framework</a></li>
                                <li><a href="javascript:change_repository(2)">ros</a></li>
                                <li><a href="javascript:change_repository(3)">wpi-suite</a></li>
                            </ul>
                        </div>
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
                    <div class="panel-body bottom-margin">
                        <svg class="noselect chart"></svg>
                        <div class="btn-group">
                            <button type = "button" id="option1" class="btn btn-primary">
                                Estrada Index
                            </button>
                            <button type = "button" id="option2" class="btn btn-primary">
                                Average Closeness
                            </button>
                            <button type = "button" id="option3" class="btn btn-primary">
                                Commits
                            </button>
                            <button type = "button" id="option4" class="btn btn-primary">
                                Contributors
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="row">
            <div class="col-md-12">
                <div class="panel panel-primary">
                    <div class="panel-heading">
                        <h1 class="text-center repo_update_name">Statistics for eeros-framework</h1>
                    </div>
                    <table class="table stats-table">
                        <tr>
                            <th></th>
                            <th>Age</th>
                            <th>Number of Commits</th>
                            <th>Number of Contributors</th>
                        </tr>
                        <tr id="update">
                            <th>Visualization</th>
                        </tr>
                        <tr>
                            <th><?php echo "As of " . date('D, d M Y'); ?></th>
                            <td id="total_age"></td>
                            <td id="total_commits"></td>
                            <td id="total_contributors"></td>
                        </tr>
                    </table>
                </div>
            </div>
        </div>
    </div>

<script>

    health_chart();
    make_graph();

    current_health_metric = '#option1';

    $('#option1').button('toggle').on('click', function () {
        var changed = change_menu_items('#option1');
        if (changed) {
            $(current_health_metric).button('toggle');
            current_health_metric = '#option1';
            $(current_health_metric).button('toggle');
        }
    });
    $("#option2").on('click', function () {
        var changed = change_menu_items('#option2');
        if (changed) {
            $(current_health_metric).button('toggle');
            current_health_metric = '#option2';
            $(current_health_metric).button('toggle');
        }
    });
    $("#option3").on('click', function () {
        var changed = change_menu_items('#option3');
        if (changed) {
            $(current_health_metric).button('toggle');
            current_health_metric = '#option3';
            $(current_health_metric).button('toggle');
        }
    });
    $("#option4").on('click', function () {
        var changed = change_menu_items('#option4');
        if (changed) {
            $(current_health_metric).button('toggle');
            current_health_metric = '#option4';
            $(current_health_metric).button('toggle');
        }
    });

    d3.select("body").select("#total_age").text(Math.floor((end_time-start_time)/604800) + " week(s)");
    d3.select("body").select("#total_contributors").text(stored_node_data.length);
    d3.select("body").select("#total_commits").text(commits.length);

</script>
</body>

</html>
