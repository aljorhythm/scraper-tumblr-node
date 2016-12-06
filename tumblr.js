downloadTumblr = require('./index.js');

tumblrs = [
    '50thousand',
    'xx6emo6girl6xx'
]

return tumblrs.reduce(function (previous, tumblr) {
    return previous.then(function () {
        return downloadTumblr(tumblr, 2, 30);
    });
}, Promise.resolve());
