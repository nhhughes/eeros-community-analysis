<?php 
function echoActiveClassIfRequestMatches($requestUri)
{
    $current_file_name = basename($_SERVER['REQUEST_URI'], ".php");
    if ($current_file_name == $requestUri)
        echo 'class="active"';
}

function echoActiveClassIfRequestMatchesDropdown($requestUri)
{
    $current_file_name = basename($_SERVER['REQUEST_URI'], ".php");
    if ($current_file_name == $requestUri)
        echo 'active';
}
?>

<div class="navbar-background"></div>

<nav class="navbar navbar-inverse navbar-static-top">
    <div data-spy="affix" data-offset-top="46">
        <div class="navbar-header image">
            <button type="button" class="navbar-toggle collapsed" data-toggle="collapse" data-target="#navbar"
                    aria-expanded="false" aria-controls="navbar">
                <span class="sr-only">Toggle navigation</span>
                <span class="icon-bar"></span>
                <span class="icon-bar"></span>
                <span class="icon-bar"></span>
            </button>
        </div>
        <div id="navbar" class="navbar-collapse collapse">
            <ul class="nav navbar-nav navbar-right links">
            </ul>
        </div>
    </div>
</nav>

<div class="nav-hr"></div>
