import { Injectable } from 'injection-js';
import sanitizeFilename from 'sanitize-filename';

@Injectable()
export class UrlHelper {
  sanitizeFilename(fileName: string): string {
    return sanitizeFilename(fileName, { replacement: ' ' })
      .replace(/[\s]{2,}/g, ' ')
      .trim();
  }
}
