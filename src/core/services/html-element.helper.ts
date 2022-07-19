import { Injectable } from "injection-js";
import { HTMLElement } from "node-html-parser";

@Injectable()
export class HtmlElementHelper {
  getCleanedInnerText(el: HTMLElement, selector: string): string {
    const target = el.querySelector(selector);
    return target.innerText.replace(/\s+/g, " ").trim();
  }
}
