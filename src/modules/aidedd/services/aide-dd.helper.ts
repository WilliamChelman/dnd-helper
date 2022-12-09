import { Injectable } from 'injection-js';
import { NewPageServiceOptions } from '../../core';

@Injectable()
export class AideDdHelper {
  getPageOptions(): NewPageServiceOptions {
    return {
      cleaner(html) {
        html.querySelectorAll('head,script,style,iframe,noscript').forEach(e => e.remove());
        html.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'));
      },
    };
  }
}
