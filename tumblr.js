downloadTumblr = require('./index.js');

tumblrs = [
    '50thousand',
    'xx6emo6girl6xx'
    // insert more here
]

startPage = 3
endPage = 4

return tumblrs.reduce(function (previous, tumblr) {
    return previous.then(function () {
        return downloadTumblr(tumblr, startPage, endPage);
    });
}, Promise.resolve());
