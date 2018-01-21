const httpRequest = require("http-request");
const cheerio = require("cheerio");
const TumblrMedia = require("./TumblrMedia.js");
const https = require("https");

async function getHTML(url) {
  return new Promise((resolve, reject) => {
    httpRequest.get(url, (err, res) => {
      if (err) return reject(err);
      const html = res.buffer.toString();
      resolve(html);
    });
  });
}

function getVideoUrlFromVideoSrc(videoSourcePage) {
  return new Promise((resolve, reject) => {
    https
      .get(videoSourcePage, response => {
        // redirect
        if (response["headers"]["location"])
          resolve(response["headers"]["location"]);
      })
      .on("error", reject);
  });
}

function getVideoSrcFromIframe(iframeUrl) {
  return new Promise(async (resolve, reject) => {
    try {
      let html = await getHTML(iframeUrl);
      let $ = cheerio.load(html);
      let $tag = $("video source");
      let videoSourcePage = $tag.attr("src");
      let videoUrl = await getVideoUrlFromVideoSrc(videoSourcePage);
      resolve(videoUrl);
    } catch (e) {
      resolve("");
    }
  });
}

class TumblrPage {
  constructor(tumblrSite, index) {
    this.url = "http://www." + tumblrSite + ".tumblr.com/page/" + index;
    this.site = tumblrSite;
    this.index = index;
  }
  get url() {
    return this._url;
  }
  set url(url) {
    this._url = url;
  }
  async getHTML() {
    if (this.html) {
      return Promise.resolve(this.html);
    } else {
      let html;
      while (!html) {
        try {
          html = await getHTML(this.url);
        } catch (e) {}
      }
      this.html = html;

      return Promise.resolve(html);
    }
  }
  async getImages() {
    const html = await this.getHTML();
    var $ = cheerio.load(html);
    var $images = $("img");
    var sources = [];
    $images.each((_, e) => {
      var src = $(e).attr("src");
      if (src.endsWith(".jpg") || src.endsWith(".gif")) {
        sources.push(new TumblrMedia(this.site, this.index, src));
      }
    });
    return Promise.resolve(sources);
  }
  async getVideos() {
    const html = await this.getHTML();
    var $ = cheerio.load(html);
    var $iframes = $("iframe");
    var videoPromises = [];
    $iframes.each((_, e) => {
      var src = $(e).attr("src");
      if (src && src.indexOf("video") > -1)
        videoPromises.push(getVideoSrcFromIframe(src));
    });
    return await Promise.all(videoPromises).then(sources => {
      return sources
        .filter(src => src != "")
        .map(src => new TumblrMedia(this.site, this.index, src));
    });
  }
}

module.exports = TumblrPage;
