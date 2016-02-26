var request=require('request');
var BASE_URL='https://torrentproject.se';

//This file belongs to the kickass-torrent API. 
//Took it out because it works here as well.
/**
 * {String|Object} query string or options f.x {}
 * avaliable options are any url options that kickass.to accepts
 * f.x. {field:'seeders', order:'desc', q: 'test',page: 2}
 * http://kickass.to/json.php?q=test&field=seeders&order=desc&page=2
 */
module.exports=function(options, callback){
    var url=(options.url || BASE_URL) + '/';

    options.url = null;
    options.out="json";
    options.filter=9000;    //9000= all results
    var params = {
        qs: options,
        url: url
    };

    request(params, function(err, response, raw){
        if(err) { console.log("Bad request");
            return callback(err, null); }

        try {
        var data = JSON.parse(raw);
        } catch(err) {
            console.log(raw);
        return callback(err, null);
        }

        callback(null, data);
    });
}