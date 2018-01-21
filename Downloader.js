const url = require("url");
const path = require("path");
const fs = require("fs");
const https = require("https");
const httpRequest = require("http-request");

module.exports = {
  download: async function(sourceUrl, filepath) {
    const parsedUrl = url.parse(sourceUrl);

    return new Promise(function(resolve, reject) {
      if (parsedUrl.protocol == "https:") {
        var file = fs.createWriteStream(filepath);
        https
          .get(
            {
              rejectUnauthorized: false,
              hostname: parsedUrl.hostname,
              port: 443,
              path: parsedUrl.path,
              method: "GET"
            },
            response => {
              response.pipe(file);
              file
                .on("finish", function() {
                  file.close(function() {
                    resolve({ sourceUrl, filepath });
                  });
                })
                .on("error", reject);
            }
          )
          .on("error", reject);
      } else {
        httpRequest.get(
          {
            url: sourceUrl
          },
          filepath,
          (err, res) => {
            if (err) return reject(err);
            resolve({ sourceUrl, filepath });
          }
        );
      }
    });
  }
};
