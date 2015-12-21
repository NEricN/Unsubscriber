var request = require('request');
var fs = require('fs');
var async = require('async');

var _getMessages = function(opts, cb) {
    request.get(
        {
            url: "https://www.googleapis.com/gmail/v1/users/me/messages"+ (opts.pageToken ? "?pageToken=" + opts.pageToken : ""),
            headers: {Authorization: "Bearer "+opts.token, "Content-type": "application/json"},
        }, function(error, response, body) {
            if(error||body.error) {
                console.log("Error getting email: "+error||body.error||JSON.stringify(body));
            }
            else if(cb)
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
            else if(cb)
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

var _getDomain = function(url) {
    var domain;
    if (url.indexOf("://") > -1) {
        domain = url.split('/')[2];
    }
    else {
        domain = url.split('/')[0];
    }
    domain = domain.split(':')[0];
    return domain;
}

var gatherData = function(token, pageTokenLocal, max, count, cb) {
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
                var subject = _getHeader(msgData, "subject").toLowerCase().replace(/\"/g, "").trim();
                var from = _getHeader(msgData, "from").toLowerCase().replace(/\"/g, "").trim();

                var unsub = html.match(/<\s*a[^>]+href=[\"\']([^\"\']+)[^>]+>Unsubscribe<\/a>/i);
                if(unsub && unsub.length > 0) {
                    callback(null, {from: from, subject: subject, unsubLink: unsub[1], domain: _getDomain(unsub[1])});
                } else {
                    callback(null, null);
                }
            })
        }, function(err, results) {
            if(err) {
                console.log(err);
            } else {
                cb(results.filter(function(data) { return data; }), function(err, finalCb) {
                    if(max > 0 && pageToken) {
                        gatherData(token, pageToken, max, count, cb);
                    } else {
                        finalCb();
                    }
                });
            }
        });
    })
}

var scrapeAllEmails = function(key, cb) {
    gatherData(key, null, Infinity, 0, cb);
}

module.exports.scrapeAllEmails = scrapeAllEmails;
