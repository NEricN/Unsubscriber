var request = require('request');
var fs = require('fs');
var async = require('async');

var args = process.argv.slice(2);
var token = args[0];
var max = args[1]||1;
var pageToken = args[2];
var currentCount = parseInt(args[3]||'0');

var _getMessages = function(opts, cb) {
    request.get(
        {
            url: "https://www.googleapis.com/gmail/v1/users/me/messages"+ (opts.pageToken ? "?pageToken=" + opts.pageToken : ""),
            headers: {Authorization: "Bearer "+opts.token, "Content-type": "application/json"},
        }, function(error, response, body) {
            if(error||body.error) {
                console.log("Error getting email: "+error||body.error||JSON.stringify(body));
            }
            if(cb)
                cb(body);
        }
    )
}

var _getMessage = function(opts, cb) {
    request.get(
        {
            url: "https://www.googleapis.com/gmail/v1/users/me/messages/"+ opts.id,
            headers: {Authorization: "Bearer "+opts.token, "Content-type": "application/json"},
        }, function(error, response, body) {
            if(error||body.error) {
                console.log("Error getting email: "+error||body.error||JSON.stringify(body));
            }
            if(cb)
                cb(body);
        }
    )
}

var _getHeader = function(msgData, header) {
    if(msgData.payload.headers) {
        var value = msgData.payload.headers.filter(function(x) { return x.name.toLowerCase() === header; })[0];
        return value ? value.value : "";
    }
    return "";
}

var gatherData = function(pageTokenLocal, max, count) {
    _getMessages({pageToken: pageTokenLocal, token: token}, function(data) {
        var responseData = JSON.parse(data);
        pageToken = responseData.nextPageToken;
        max--;
        count += parseInt(responseData.resultSizeEstimate);

        async.map(responseData.messages, function(message, callback) {
            _getMessage({id: message.id, token: token}, function(messageData) {
                var msgData = JSON.parse(messageData);
                var html;
                try {
                    html = (new Buffer(msgData.payload.parts.filter(function(data) {
                        return data.mimeType.toLowerCase() === "text/html";
                    })[0].body.data, 'base64')).toString();
                } catch(e) {
                    callback(null, "");
                    return;
                }
                var subject = "\"" + _getHeader(msgData, "subject").toLowerCase().replace("\"", "") + "\"";
                var from = "\"" + _getHeader(msgData, "from").toLowerCase().replace("\"", "") + "\"";

                var unsub = html.match(/<\s*a[^>]+href=[\"\']([^\"\']+)[^>]+>Unsubscribe<\/a>/i);
                if(unsub && unsub.length > 0) {
                    callback(null, [from,subject,unsub[1]].join(','));
                } else {
                    callback(null, "");
                }
            })
        }, function(err, results) {
            if(err) {
                console.log(err);
            } else {

                fs.appendFile('gmailScraped.csv', "\n" + results.filter(function(data) { return data; }).join("\n"), function (err) {
                    if(err) {
                        console.log(err);
                    }

                    console.log(pageToken + " :: " + max + " :: " + count||0);

                    if(max > 0 && pageToken) {
                        gatherData(pageToken, max, count);
                    }
                });
            }
        });
    })
}

gatherData(pageToken, max, currentCount);