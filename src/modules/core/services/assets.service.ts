import fs from 'fs';
import path from 'path';

export class AssetsService {
  readJson(partialPath: string): {} {
    const fullPath = path.join(__dirname, '../../../../assets/', partialPath);

    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  }
}
