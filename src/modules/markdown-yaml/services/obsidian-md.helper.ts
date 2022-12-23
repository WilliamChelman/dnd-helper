import { Injectable } from 'injection-js';
import { Entity, KeyValue } from '../../core';

@Injectable()
export class ObsidianMdHelper {
  getInfoBox({ properties, entity, imgAlt, imgSrc, imgSize }: GetInfoBoxOptions): string {
    properties = [...properties, { key: 'Data Source', value: { label: entity.dataSource, href: entity.uri } }];
    const statsMd = properties.length
      ? properties
          .map(({ key, value }) => `> | ${key} |  ${typeof value === 'string' ? value : `[${value.label}](${value.href})`} |`)
          .join('\n')
      : null;
    const imageSize = imgSize ? `h${imgSize}` : '';

    return `
      > [!infobox]
      > # ${entity.name}
      > ![${imgAlt}|cover ${imageSize}](${imgSrc})
      ${
        statsMd
          ? `
      > ###### Properties
      > | Name |  Value |
      > | ---- | ---- |
      ${statsMd}
      `
          : ''
      }
      `.replace(/^\s+/gm, '');
  }
}

export interface GetInfoBoxOptions {
  entity: Entity;
  properties: KeyValue<Link | string>[];
  imgSrc?: string;
  imgAlt?: string;
  imgSize?: string | null;
}

export interface Link {
  label: string;
  href: string;
}
