import { Injectable } from 'injection-js';
import { KeyValue } from '../../core';

@Injectable()
export class ObsidianMdHelper {
  getInfoBox({ properties, name, imgAlt, imgSrc, imgSize }: GetInfoBoxOptions): string {
    const statsMd = properties.map(({ key, value }) => `> | ${key} |  ${value} |`).join('\n');
    const imageSize = imgSize ? `h${imgSize}` : '';
    return `
      > [!infobox]
      > # ${name}
      > ![${imgAlt}|cover ${imageSize}](${imgSrc})
      > ###### Properties
      > | Name |  Value |
      > | ---- | ---- |
      ${statsMd}`.replace(/^\s+/gm, '');
  }
}

export interface GetInfoBoxOptions {
  name: string;
  properties: KeyValue[];
  imgSrc?: string;
  imgAlt?: string;
  imgSize?: string | null;
}
