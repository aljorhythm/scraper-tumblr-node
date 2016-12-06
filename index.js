cheerio = require('cheerio')
httpRequest = require('http-request')
url = require('url')
path = require('path')
https = require('https')
fs = require('fs')

function printErr(errType){
    return function(err){
        console.log(errType, 'error' , err);
    }
}

function print(p){
    console.log('print', p);
}

function getTumblrURL(tumblr, page){
    var url = "http://www." + tumblr + ".tumblr.com/page/" + page;
    console.log(url);
    return Promise.resolve(url);
}

function getHTML(url){
    console.log('get html', url);
    return new Promise(function(resolve, reject){
        httpRequest.get(url, function (err, res) {
        	if (err) return reject(err);
            var html = res.buffer.toString();
        	resolve(html);
        });
    });
}

function getMediaSources(pageHTML){
    return new Promise(function(resolve, reject){
        var $ = cheerio.load(pageHTML);
        // images
        var $images = $('img');
        var sources = [];
        $images.each(function(_, e){
            var src = $(e).attr('src');
            if(src.endsWith('.jpg')){
                sources.push(src);
            }
        });
        // videos
        var $iframes = $('iframe');
        var videoPromises = [];
        $iframes.each(function(_, e){
            var src = $(e).attr('src');
            if(src && src.indexOf('video') > -1)
                videoPromises.push(getVideoSrcFromIframe(src));
        })
        Promise.all(videoPromises)
            .then(function(videoSources){
                    resolve(sources.concat(videoSources));
                })
            .catch(reject);
    });
}

function getVideoSrcFromIframe(iframeUrl){
    return new Promise(function(resolve, reject){
        getHTML(iframeUrl).then(function(html){
            var $ = cheerio.load(html);
            var $tag = $("video source");
            var videoSourcePage = $tag.attr('src');
            https.get(videoSourcePage, function(response) {
                // redirect
                if(response['headers']['location'])
                    resolve(response['headers']['location']);
            }).on('error', reject);
        }, reject);
    });
}

function downloadSources(sources){
    return Promise.all(sources.map(function(sourceUrl){
            var parsedUrl = url.parse(sourceUrl);
            var filename = "downloads/" + path.basename(parsedUrl.path);

            // save the response to file with a progress callback
            return new Promise(function(resolve, reject){
                if(parsedUrl.protocol == "https:"){
                    var file = fs.createWriteStream(filename);
                    var options = {
                        rejectUnauthorized : false,
                        hostname: parsedUrl.hostname,
                        port: 443,
                        path: parsedUrl.path,
                        method: 'GET'
                    };
                    https.get(options, function(response) {
                        response.pipe(file);
                        file
                            .on('finish', function() {
                                console.log('done ', filename);
                                file.close(function(){resolve(sourceUrl);});
                            })
                            .on('error', reject);
                    }).on('error', reject);
                }else{
                    httpRequest.get({
                    	url: sourceUrl
                    }, filename, function (err, res) {
                    	if (err) return reject(err);
                        console.log('done', filename);
                        resolve(sourceUrl);
                    });
                }
            });
        })
    );
}

function downloadTumblrPage(tumblr, i){
    return getTumblrURL(tumblr, i)
        .then(getHTML, printErr('getTumblrURL'))
        .then(getMediaSources, printErr('getHTML'))
        .then(downloadSources, printErr('getMediaSources'))
        .then(function(res){console.log('finished');console.log(res)},  printErr('downloadSources'))
}

function downloadTumblr(tumblr, from, to){
    var tumblrPages = [];
    for(i = 1; i <= to; i++){
        tumblrPages.push(i)
    }
    return tumblrPages.reduce(function (previous, tumblrPage) {
        return previous.then(function () {
            return downloadTumblrPage(tumblr, tumblrPage);
        });
    }, Promise.resolve());
}

module.exports = downloadTumblr
