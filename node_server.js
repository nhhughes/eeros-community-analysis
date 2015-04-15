/**
 * Created by nathan on 4/14/15.
 */

var express = require('express');
var app = express();

var path    = require("path");
var fs=require("fs");

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname+'/index.html'));
});

app.get('/js/network.js', function (req, res) {
    res.sendFile(path.join(__dirname+'/js/network.js'));
});

app.get('/css/bootstrap.min.css', function (req, res) {
    res.sendFile(path.join(__dirname+'/css/bootstrap.min.css'));
});

app.get('/js/d3.min.js', function (req, res) {
    res.sendFile(path.join(__dirname+'/js/d3.min.js'));
});

app.get('/data/graph.json', function (req, res) {
    res.sendFile(path.join(__dirname+'/data/graph.json'));
});

app.get('/js/jquery.js', function (req, res) {
    res.sendFile(path.join(__dirname+'/js/jquery-1.11.2.min.js'));
});

app.get('/data', function (req, res) {
    cypher(query,params,function(err, data) {
        res.send(JSON.stringify(data))
    });
});

function cypher(query,params,cb) {
    r.post({uri:txUrl,
            json:{statements:[{statement:query,parameters:params}]},
            headers: {Authorization: auth}
        },
        function(err,res) { cb(err,res.body)})
}

var r=require("request");

var username = 'neo4j';
var password = 'eeros';
var auth = 'Basic ' + new Buffer(username + ':' + password).toString('base64');

var txUrl = "http://localhost:7474/db/data/transaction/commit";

var query="MATCH (s:`eeros-framework:actor`)-[r]-(t) RETURN s, r, t";
var params={limit: 10};

var server = app.listen(8080, function () {

    var host = server.address().address;
    var port = server.address().port;

    console.log('Example app listening at http://%s:%s', host, port);

});