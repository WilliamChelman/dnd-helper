import { ucFirst } from "../utils";

export class LabelsHelper {
  getSchool(schoolRaw: string | undefined): string | undefined {
    switch (schoolRaw?.toLowerCase()) {
      case "abjuration":
        return "Abjuration";
      case "invocation":
        return "Conjuration";
      case "nécromancie":
        return "Necromancy";
      case "enchantement":
        return "Enchantment";
      case "évocation":
        return "Evocation";
      case "divination":
        return "Divination";
      case "illusion":
        return "Illusion";
      case "transmutation":
        return "Transmutation";
      case undefined:
      case null:
        return undefined;
      default:
        return ucFirst(schoolRaw as string);
    }
  }

  getClass(classRaw: string | undefined): string | undefined {
    switch (classRaw) {
      case "Druide":
        return "Druid";
      case "Ensorceleur":
      case "Ensorceleur/Sorcelame":
        return "Sorcerer";
      case "Magicien":
        return "Wizard";
      case "Rôdeur":
        return "Ranger";
      case "Clerc":
        return "Cleric";
      case "Paladin":
        return "Paladin";
      case "Barde":
        return "Bard";
      case "Occultiste":
      case "Sorcier":
        return "Warlock";
      default:
        return classRaw;
    }
  }

  getLevel(levelRaw: string | number | undefined): string | undefined {
    switch (levelRaw?.toString()) {
      case "0":
        return "Cantrip";
      case "1":
        return "1st";
      case "2":
        return "2nd";
      case "3":
        return "3rd";
      case "4":
        return "4th";
      case "5":
        return "5th";
      case "6":
        return "6th";
      case "7":
        return "7th";
      case "8":
        return "8th";
      case "9":
        return "9th";
      default:
        return levelRaw?.toString();
    }
  }

  getSource(rawSource: string | undefined): string | undefined {
    if (!rawSource) return rawSource;
    return rawSource.replace(/&amp;/g, "&").replace(/’/g, "'");
  }

  getName(rawName: string | undefined): string | undefined {
    if (!rawName) return rawName;
    return rawName.replace(/’/g, "'");
  }
}
