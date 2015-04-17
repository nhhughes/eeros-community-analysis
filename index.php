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
    var width = 921,
    height = 500;
    </script> 


    <script src="js/jquery.js"></script>
    <script src="./js/jquery-ui.min.js"></script>
    <script src="./js/d3.min.js"></script>
    <script src="./js/network.js"></script>
    <script src="./js/time_filter.js"></script>
    <script src="./js/bootstrap.js"></script>


    <link rel = "stylesheet" href="./css/bootstrap.css">
    <link rel = "stylesheet" href="./css/jquery-ui.min.css">
    <link rel = "stylesheet" href="./css/custom.css">

    <script> 
    $(function() {    
        $( "#slider" ).slider({
        slide: function(event, ui) {
            filter_time(ui.value);

        },
        max: width,
        animate: "slow"
    });
    });
    </script>

    <script>
        $(function() {
            $( "button" )
                .button()
                .click(function( event ) {
                    console.log("testing");
                    event.preventDefault();
                });
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
        stroke-width: 2px;
    }

</style>

<body>

<div class="container">
    <div class="row">
        <div class="network-display panel panel-primary">
            <div class ="panel-heading">
                <h1 class="text-center">Community Visualization</h1>
            </div>
            <div class ="panel-body">
                <svg  class="noselect"></svg>
                <div class="ui-grid-a">
                    <div class="btn-group" role="group" aria-label="...">
                        <button type="button" class="btn btn-default">Left</button>
                        <button type="button" class="btn btn-default">Middle</button>
                        <button type="button" class="btn btn-default">Right</button>
                    </div>

                    <div class="ui-block-a">
                        <div id="slider"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="row">
        <div class="network-health panel panel-primary">
            <div class = "panel-heading">
                <h1 class="text-center">Community Health Metrics</h1>
            </div>
            <div class="panel-body">
                <div id="dropdown"></div>
                <svg class="noselect"></svg>
            </div>
        </div>
    </div>
</div>


<script>
    make_graph();
//    var svg = d3.select("body").select(".network-display").select('svg')
//        .attr('width', width)
//        .attr('height', height);
//
//    function resize(e)  {
//
//        var container = $('#network-display');
//        width = container.width();
//        var height = container.height();
//
//
//        svg.attr('width', width);
//        svg.attr('height', height);
//        force_object.size([width, height]).resume();
//    }
//    window.on('resize', resize);
</script>
</body>

</html>
