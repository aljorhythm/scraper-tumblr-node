const _ = require("lodash");
const jsonfile = require("jsonfile");
const rangeParser = require("parse-numeric-range");
const PromiseQueue = require("promise-queue");

const TumblrSite = require("./TumblrSite.js");
const Downloader = require("./Downloader.js");
const DownloadManager = require("./DownloadManager.js");

async function getVideosAndImages(tumblrSite, pageIndex) {
  return new Promise(async (resolve, reject) => {
    const page = tumblrSite.getPage(pageIndex);
    console.log("Site:", page.site, "Page: ", page.index, "URL:", page.url);
    const images = await page.getImages();
    const videos = await page.getVideos();
    resolve(images.concat(videos));
  });
}

async function asyncGetAndDownload(options = {}) {
  const { concurrent = 2, sites, download } = options;
  const mediaScrapers = _.flatten(
    sites.map(site => {
      const tumblrSite = new TumblrSite(site.name);
      const pageIndexes = rangeParser.parse(site.pages);
      return pageIndexes.map(pageIndex => {
        return function scraper() {
          return getVideosAndImages(tumblrSite, pageIndex).then(medias =>
            download(medias)
          );
        };
      });
    })
  );

  const returnPromise = new Promise((resolve, reject) => {
    const queue = new PromiseQueue(concurrent, Infinity);

    var allMedias = [];
    mediaScrapers.forEach(scraper =>
      queue.add(scraper).then(medias => {
        allMedias = allMedias.concat(medias);
        if (queue.getQueueLength() == 0 && queue.getPendingLength() == 0) {
          resolve(allMedias);
        }
      })
    );
  });

  return returnPromise;
}

async function getMedia(options = {}) {
  const { concurrent = 2, sites } = options;
  const mediaScrapers = _.flatten(
    sites.map(site => {
      const tumblrSite = new TumblrSite(site.name);
      const pageIndexes = rangeParser.parse(site.pages);
      return pageIndexes.map(pageIndex => {
        return function scraper() {
          return getVideosAndImages(tumblrSite, pageIndex);
        };
      });
    })
  );

  const returnPromise = new Promise((resolve, reject) => {
    const queue = new PromiseQueue(concurrent, Infinity);

    var allMedias = [];
    mediaScrapers.forEach(scraper =>
      queue.add(scraper).then(medias => {
        allMedias = allMedias.concat(medias);
        if (queue.getQueueLength() == 0 && queue.getPendingLength() == 0) {
          resolve(allMedias);
        }
      })
    );
  });

  return returnPromise;
}

async function downloadMedia(media) {
  const sourceUrl = media.url;
  const directory = "downloads/" + media.site + "/";
  return Downloader.download(sourceUrl, directory);
}

async function downloadMedias(options) {
  const { medias, concurrent = 4 } = options;
  console.log("download medias", medias, concurrent);
  const downloaders = medias.map((media, i, t) => {
    return function downloader() {
      console.log(
        "Downloading",
        i + " / " + t.length,
        media.site + " " + media.page + " " + media.url
      );
      return downloadMedia(media)
        .then(url =>
          console.log(
            "Completed",
            i + " / " + t.length,
            media.site + " " + media.page + " " + media.url
          )
        )
        .catch(err => {
          console.log(
            "Error",
            i + " / " + t.length,
            media.site + " " + media.page + " " + media.url
          );
          console.log(err);
        });
    };
  });

  console.log(concurrent);
  const queue = new PromiseQueue(concurrent, Infinity);

  const returnPromise = new Promise((resolve, reject) => {
    downloaders.forEach(downloader =>
      queue.add(downloader).then(() => {
        if (queue.getQueueLength() == 0 && queue.getPendingLength() == 0) {
          resolve();
        }
      })
    );
  });
  return returnPromise;
}

async function main() {
  const sitesFile = "sites.json";

  const sites = jsonfile.readFileSync(sitesFile);
  const medias = await getMedia({
    concurrent: 10,
    sites: sites
  });

  return downloadMedias({ medias, concurrent: 5 });
}

async function main2() {
  const downloadManager = new DownloadManager(7);
  const sitesFile = "sites.json";
  const sites = jsonfile.readFileSync(sitesFile);

  let endResolve;

  await asyncGetAndDownload({
    concurrent: 10,
    sites: sites,
    download: medias =>
      medias.forEach(media => {
        let sourceUrl = media.url;
        let directory = "downloads/" + media.site + "/";
        console.log("Add to queue", sourceUrl, directory);
        downloadManager
          .addDownload(sourceUrl, directory, (sourceUrl,directory) => {
            console.log("Downloading", sourceUrl, directory);
          })
          .then(d => {
            console.log("Downloaded", sourceUrl, directory);
            if (endResolve && downloadManager.isIdle()) {
              endResolve();
            }
          });
      })
  });

  const endPromise = new Promise((resolve, reject) => {
    endResolve = resolve;
  });

  return endPromise;
}

// main().then(()=>console.log('end'));
main2().then(() => console.log("end"));
