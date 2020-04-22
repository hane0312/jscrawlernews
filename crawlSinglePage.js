const rp = require('request-promise');
const cheerio = require('cheerio');
const url = require('url');


function extractInternalHyperlinks(linksCollection, baseUrl) {
  let internalHyperlinks = [];
  const hostname = url.parse(baseUrl).hostname;
  let filteredLinksCollection = linksCollection.filter(linkObject => {
    if(baseUrl && linkObject.attribs.href) {
      const linkPath = url.resolve(baseUrl, linkObject.attribs.href);
      const linkDomain = url.parse(linkPath).hostname;
      const protocol = url.parse(linkPath).protocol;
      const pathname = url.parse(linkPath).pathname;
      const validProtocol = (protocol === 'https:' || protocol === 'http:') ? true : false; 
      const notAnImage = !(/\.(gif|jpe?g|tiff|png|pdf)$/i).test(pathname); 
      return (linkDomain === hostname) && validProtocol && notAnImage;
    }
  });
  internalHyperlinks = filteredLinksCollection.map(linkObject => {
    const fullPath = url.resolve(baseUrl, linkObject.attribs.href);
    const urlObject = url.parse(fullPath);
    return url.format({
        protocol: urlObject.protocol,
        hostname: urlObject.hostname,
        pathname: urlObject.pathname
      });
  });
  return internalHyperlinks;
}


function extractAssetUrls(elementsCollection, assets, baseUrl) {
  elementsCollection.map(elem => {
    if(elem.attribs.src || elem.attribs.href) {
      const assetLocation = elem.attribs.src || elem.attribs.href;
      const fullPath = url.resolve(baseUrl, assetLocation); 
      assets.push(fullPath);
    }
  });
}

function crawlSinglePage(pageUrl) {

  const urlObject = url.parse(pageUrl);
  const baseUrl = url.format({
    protocol: urlObject.protocol,
    hostname: urlObject.hostname
  });

  let assets = [];

  const options = {
    uri:  pageUrl,
    simple: false,
    resolveWithFullResponse: true,
    gzip: true
  };

  return rp(options)
    .then(response => {

      const isHTML = response.headers['content-type'].includes('text/html'); 
      const is200 = (response.statusCode === 200); 

      if(response && isHTML && is200) {

        const $ = cheerio.load(response.body);

        // from parsed html stired in $
        const imageSrc = Array.from($('img'));
        const styleLinks = Array.from($('link')).filter(link => link.attribs.rel === 'stylesheet');
        const scriptSrc = Array.from($('script'));


        const staticAssetCollection = imageSrc.concat(styleLinks, scriptSrc);

        extractAssetUrls(staticAssetCollection, assets, baseUrl);
        const hyperlinks = Array.from($('a'));

        return {
          uri: pageUrl,
          assets: assets,
          internalHyperlinks: extractInternalHyperlinks(hyperlinks, baseUrl) // external links iig filterden
        };
      }
      return {
        uri: pageUrl,
        assets: [],
        internalHyperlinks: []
      };
    })
    .catch(err => {
      // links array hoosnooron b utsaan
      // console.log(err);
      return {
        uri: pageUrl,
        assets: [],
        internalHyperlinks: []
      };
    });

}

module.exports = crawlSinglePage;