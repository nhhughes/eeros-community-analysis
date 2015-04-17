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
    var width = 960,
    height = 500;
    </script> 


    <script src="js/jquery.js"></script>
    <script src="./js/jquery-ui.min.js"></script>
    <script src="./js/d3.min.js"></script>
    <script src="./js/network.js"></script>
    <script src="./js/time_filter.js"></script>
    
    
    <link rel = "stylesheet" href="./css/jquery-ui.min.css">
    
    <script> 
    $(function() {    
        $( "#slider" ).slider({
        slide: function(event, ui) {
            filter_time(ui.value);
        },
        max: width
    });
    });
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
<?php
// $result = json_encode(file_get_contents("./data/eeros-framework:actors"));
// echo($result);
//?>

<script>
var query_results = <?php

$result = file_get_contents("./data/eeros-framework:actors");
echo(json_encode($result));
//$ch = curl_init("http://fourbanger.wpi.edu/~nhhughes:7474/db/data/transaction/commit");
////$ch = curl_init("http://localhost:7474/db/data/transaction/commit");
//$query = ['statements' => [['statement' => 'MATCH (s:`eeros-framework:actor`)-[r]-(t) RETURN s, r, t']]];
//
//curl_setopt($ch,CURLOPT_POST, true);
//curl_setopt($ch,CURLOPT_POSTFIELDS, json_encode($query));
//curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
//curl_setopt($ch, CURLOPT_USERPWD, "neo4j:eeros");
//curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type:
//application/json'));
//
//$result = curl_exec($ch);
//curl_close($ch);



?>;

</script>

<div class="network-display">
    <svg class="noselect"></svg>
    <div id="slider"></div>
</div>
<div class="network-health">
    <svg></svg>
</div>

<script>
    make_graph();
</script>
</body>

</html>
