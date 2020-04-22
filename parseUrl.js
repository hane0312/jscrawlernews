
const url = require('url');

function parseUrl(userInput) {

  let urlObject = url.parse(userInput);
  if(urlObject.protocol == null) {
    userInput = `https://${userInput}`;
  }
  urlObject = url.parse(userInput);

  const domainToCrawl = url.format({
    protocol: urlObject.protocol,
    hostname: urlObject.hostname,
    pathname: urlObject.pathname
  });

  return domainToCrawl;

}

module.exports = parseUrl;