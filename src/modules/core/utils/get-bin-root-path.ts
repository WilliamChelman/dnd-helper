import { join } from 'path';

export function getBinRootPath(): string {
  return join(__dirname, '../../../..');
}
