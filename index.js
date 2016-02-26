var searchapi = require('thepiratebay');
var util = require('util')
var OS = require('opensubtitles-api');
var http = require('http');
var fs = require('fs');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var shutdown_handler = require('shutdown-handler');
var path=require('path');

var PREFERRED_QUALITY = ['1080p', '720p'];
var MIN_SEEDERS = 5;
var MIN_LEECHERS = 20;
var DEFAULT_PATH = require('os').tmpdir()
var LOCAL_PEERFLIX_PATH = path.join(__dirname,"node_modules","peerflix","app.js");
// Subtitles not yet implemented
var OPENSUBTITLES_USER_AGENT = 'OSTestUserAgent'
var OPENSUBTITLES_USERNAME = null
var OPENSUBTITLES_PASSWORD = null
var SUBTITLES_LANGUAGE = 'eng'


function getSearchResponse(showName) {
    searchapi.search(showName, {
        category: '0',	//ANY
        page: '0',
        orderBy: '5'	//SIZE
    }, filterResults);
};

function filterResults(err, data) {
    if (err) {
        return console.log(err);
    }

    //data=convertResponseToList(response);
    var searchTermMatchConfirmer = keyWordCheckerFactory(searchterm);
    var relevant_results = data.filter(searchTermMatchConfirmer);

    active_torrents = relevant_results.filter(function(choice) {
        return (parseInt(choice['seeders']) > MIN_SEEDERS || parseInt(choice['leechers']) > MIN_LEECHERS);
    });

    if (active_torrents.length == 0) {
        return console.log("No match found");
    }

    for (var i = 0; i < PREFERRED_QUALITY.length; i++) {
        var PREFERRED_QUALITYChecker = keyWordCheckerFactory(PREFERRED_QUALITY[i]);
        var top_choices = active_torrents.filter(PREFERRED_QUALITYChecker);
        if (top_choices.length > 0) {
            for (var choice in top_choices) {
                //there's some activity
                streamTorrent(top_choices[0]);
                return;
            }
        }
    }

    //If no top choices, stream the first active torrent
    streamTorrent(active_torrents[0]);
}

function streamTorrent(listing) {
    console.log("Streaming " + listing['name']);

    function puts(error, stdout, stderr) {
        console.log(stdout);
    }
    //var child = exec('peerflix --vlc ' + '"'+ listing['magnetLink']+ '"', puts);
    var child=exec("node '"+LOCAL_PEERFLIX_PATH+"'"+' --vlc ' + '"'+ listing['magnetLink']+ '"', puts);
    shutdown_handler.on('exit', function() {
        if (child) {
            child.kill();
        }
    });
}

function getSubtitles(name) {
    var downloadSubtitles = function(url, dest, cb) {
        var file = fs.createWriteStream(dest);
        var request = http.get(url, function(response) {
            console.log(response.headers);
            response.pipe(file);
            file.on('finish', function() {
                file.close(cb); // close() is async, call cb after close completes.
            });
        }).on('error', function(err) { // Handle errors
            fs.unlink(dest); // Delete the file async. (But we don't check the result)
            if (cb) cb(err.message);
        });
    };

    var opts = {
        useragent: OPENSUBTITLES_USER_AGENT,
        username: OPENSUBTITLES_USERNAME,
        password: OPENSUBTITLES_PASSWORD,
        ssl: true
    };

    var OpenSubtitles = new OS(opts);
    OpenSubtitles.search({
        sublanguageid: SUBTITLES_LANGUAGE, // Can be an array.join, 'all', or be omitted. 
        query: name, // The video file name. Better if extension 
    }).then(function(subtitles) {
        // an array of objects, no duplicates (ordered by 
        // matching + uploader, with total downloads as fallback) 
        if (subtitles.length > 0) {
            // 	downloadSubtitle(subtitles[][SUBTITLES_LANGUAGE.substring(0,2)][])
        }
    });
}

function keyWordCheckerFactory(searchterm) {
    keywords = searchterm.toLowerCase().split(" ");
    return function(listing) {
        // if any of the keywords not found, return false.
        try {
            var title = listing['name'].toLowerCase();
            return !(keywords.some(function(v) {
                return title.indexOf(v) === -1;
            }));
        } catch (err) {
            return false;
        }
    };
}

function getSearchTerm() {
    var args = process.argv;
    if (args.length < 3) {
        return console.log("You did not specify a movie or TV show title");
    }
    //No quotes, just type full name of movie/tv show
    return args.slice(2).join(" ").trim();
}

function init() {
    searchterm = getSearchTerm();
    getSearchResponse(searchterm);
}

init();