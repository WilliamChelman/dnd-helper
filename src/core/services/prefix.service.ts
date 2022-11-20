import { Injectable } from "injection-js";

@Injectable()
export class PrefixService {
  private prefixes = {
    ddb: "https://www.dndbeyond.com/",
    aidedd: "https://www.aidedd.org/",
    "5e-drs": "https://5e-drs.fr/",
  };

  compactUri(uri: string): string {
    for (const [prefix, value] of Object.entries(this.prefixes).sort(([, v1], [, v2]) => v2.length - v1.length)) {
      if (uri.startsWith(value)) return uri.replace(value, "/");
    }

    return uri;
  }

  toFileName(uri: string): string {
    return this.compactUri(uri);
  }

  private getFullPrefix(prefix: string): string {
    return prefix.endsWith("/") ? prefix : prefix + "/";
  }
}
