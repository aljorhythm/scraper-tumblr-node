const Downloader = require("./Downloader.js");
const PromiseQueue = require("promise-queue");
const url = require("url");
const path = require("path");
const fs = require("fs");

async function directoryExists(directory) {
  return new Promise((resolve, reject) => {
    fs.stat(directory, (err, stats) => {
      resolve(!err);
    });
  });
}

async function fileExists(filepath) {
  return new Promise((resolve, reject) => {
    fs.stat(filepath, (err, stats) => {
      resolve(!err);
    });
  });
}

async function mkdir(directory) {
  return new Promise((resolve, reject) => fs.mkdir(directory, resolve));
}

async function rename(from, to) {
  return new Promise((resolve, reject) => fs.rename(from, to, resolve));
}

class DownloadManager {
  constructor(concurrent) {
    this.queue = new PromiseQueue(concurrent, Infinity);
  }
  async addDownload(sourceUrl, directory, onStart) {
    let downloadEndResolve;
    const downloadEnd = new Promise(resolve => {
      downloadEndResolve = resolve;
    });
    this.queue.add(async () => {
      onStart(sourceUrl, directory);
      const parsedUrl = url.parse(sourceUrl);
      const filename = path.basename(parsedUrl.pathname);
      const filepath = directory + filename;
      const partFilepath = filepath + '.part';

      if (!await directoryExists(directory)) {
        await mkdir(directory);
      }
  
      if (await fileExists(filepath)) {
        return downloadEndResolve();
      }

      return Downloader.download(sourceUrl, partFilepath)
        .then(() => {
          rename(partFilepath, filepath);
        })
        .then(downloadEndResolve);
    });
    return downloadEnd;
  }
  isIdle() {
    return (
      this.queue.getQueueLength() == 0 && this.queue.getPendingLength() == 0
    );
  }
}

module.exports = DownloadManager;
