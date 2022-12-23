import { Injectable } from 'injection-js';
import sanitizeFilename from 'sanitize-filename';

@Injectable()
export class UrlHelper {
  sanitizeFilename(fileName: string): string {
    return this.unescapeHtml(sanitizeFilename(fileName, { replacement: ' ' }))
      .replace(/[\s]{2,}/g, ' ')
      .trim();
  }

  unescapeHtml(text: string): string {
    return text
      .replace(/(&nbsp;)/g, ' ')
      .replace(/(&amp;)/g, '&')
      .trim();
  }
}
