import { Injectable } from 'injection-js';
import ufo from 'ufo';

@Injectable()
export class DdbLinkHelper {
  getAbsoluteUrl(url: string, currentPageUrl: string): string {
    if (url.startsWith('//www')) url = `https:${url}`;
    if (!url.startsWith('http')) {
      if (url.startsWith('./')) {
        url = url.split('/').slice(1).join('/');
        currentPageUrl = currentPageUrl.split('/').slice(0, -1).join('/');
        url = ufo.resolveURL(currentPageUrl, url);
      } else if (url.startsWith('#')) {
        url = ufo.resolveURL(currentPageUrl, url);
      } else {
        if (!url.startsWith('/')) url = `/${url}`;
        url = ufo.stringifyParsedURL({ ...ufo.parseURL(currentPageUrl), pathname: url });
      }
    }
    url = ufo.cleanDoubleSlashes(this.compendiumRewrite(url).replace(/\/$/, '').replace(/\/#/, '#'));
    const parsed = ufo.parseURL(url);
    url = ufo.stringifyParsedURL({ ...parsed, pathname: parsed.pathname.toLowerCase() });
    if (url.startsWith('http:')) url = url.replace('http:', 'https:');
    return url;
  }

  replaceHost(url: string, newHost: string) {
    const parsedReplacement = ufo.parseURL(newHost);
    return ufo.stringifyParsedURL({ ...ufo.parseURL(url), host: parsedReplacement.host, protocol: parsedReplacement.protocol });
  }

  private compendiumRewrite(url: string): string {
    return url.replace('/compendium/rules', '/sources').replace('/compendium/adventures', '/sources');
  }
}
