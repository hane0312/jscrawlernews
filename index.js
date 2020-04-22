const fs = require('fs');
const url = require('url');
const argv = require('yargs').argv; 
const parseUrl = require('./parseUrl'); 
const crawlSinglePage = require('./crawlSinglePage');
const fetchBannedUrls = require('./robots'); 


const urlPool = {}; 
let crawledUrls = []; 
let output = []; 
let bannedUrls = []; 

let batchSizeLimit; 
let batchSize = 0; 
let currentBatch = {}; 
let batchInProgress = false; 

let numberOfTries = 0;

function isUrlAllowed(hyperlink) {
  const urlPath = url.parse(hyperlink).pathname;
  for(let i = 0; i < bannedUrls.length; i++) {
    if(urlPath.startsWith(bannedUrls[i])){
      return false;
    }
  }
  return true;
}


function processUrlPool(urlPool) {
  let batchStatus = Object.keys(currentBatch).map(u => currentBatch[u]);
  if(batchStatus.indexOf(false) > -1 && numberOfTries < 5) { 
    batchInProgress = true;
    numberOfTries++;
    return;
  } else {
    numberOfTries = 0;
    clearUnreachableUrls(currentBatch);
    batchInProgress = false;
    batchSize = 0;
    currentBatch = {};
    batchStatus = [];
    fs.writeFile('output.json', JSON.stringify(output, null, 2), (err) => {
      if (err) throw err;
    });
  }

  for(uri in urlPool) {
    if(!urlPool[uri] && batchSize < batchSizeLimit) {

      currentBatch[uri] = false;
      batchSize++;
      batchInProgress = true;

      crawlSinglePage(uri)
        .then(singlePageData => {

          if(singlePageData) {
            urlPool[singlePageData.uri] = true;
            currentBatch[singlePageData.uri] = true;
          }

          const newHyperlinks = singlePageData.internalHyperlinks;
          for(let i = 0, len = newHyperlinks.length; i < len; i++) {
            if(!(newHyperlinks[i] in urlPool) && isUrlAllowed(newHyperlinks[i])) {
              if(!(newHyperlinks[i].slice(0, - 1) in urlPool)) { 
                urlPool[newHyperlinks[i]] = false;
              }
            }
          }
          if(!crawledUrls.includes(singlePageData.uri)) {
            crawledUrls.push(singlePageData.uri);
            output.push({
              uri: singlePageData.uri,
              assets: singlePageData.assets
            });
          }
        })
        .catch((error) => console.log(error));

    }

  }
}

function clearUnreachableUrls(currentBatch) {
  for(page in currentBatch) {
    if(!urlPool[page.uri]) {
      urlPool[page.uri] = true;
    }
  }
};


function checkCrawlingStatus() {
  const urlPoolStatus = Object.keys(urlPool).map(u => urlPool[u]); 
  const allUrlsProcessed = urlPoolStatus.indexOf(false) === -1 ? true : false; 
  if(!allUrlsProcessed) {
    processUrlPool(urlPool);
    setTimeout(checkCrawlingStatus, 5000);
  } else {
    fs.writeFile('output.json', JSON.stringify(output, null, 2), (err) => {
      if (err) throw err;
      console.log('Output output.json');
      process.exit();
    });
  }

  const urlsCrawled = output.length;
  console.log("Total pages \t", Object.keys(urlPool).length);
  console.log("Total crawled\t", urlsCrawled);
  console.log('=============================');

}

function init() {

  const startingPath = parseUrl(argv.domain);
  urlPool[startingPath] = false;

  batchSizeLimit = argv.batch || 5;

  fetchBannedUrls(startingPath)
    .then(data => {
      bannedUrls = data;
    })
    .catch(() => {
      bannedUrls = []
    })

  setTimeout(checkCrawlingStatus, 5000);
}

init();