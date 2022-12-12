import { Injectable } from 'injection-js';
import { HTMLElement } from 'node-html-parser';

@Injectable()
export class HtmlElementHelper {
  getCleanedInnerText(el: HTMLElement, selector: string): string {
    const target = el.querySelector(selector);
    return this.getCleanedText(target?.innerText) ?? '';
  }

  getAllCleanedInnerText(el: HTMLElement, selector: string): string[] {
    return el.querySelectorAll(selector).map(e => this.getCleanedText(e.innerText) ?? '');
  }

  getCleanedText<T extends string | undefined>(text: T): T extends string ? string : undefined {
    return text?.replace(/\s+/g, ' ').trim() as T extends string ? string : undefined;
  }
}
