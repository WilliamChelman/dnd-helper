import { Injectable } from "injection-js";

@Injectable()
export class NotionHelper {
  getTitle(propertyName: string, value: string | undefined): any {
    if (!value) return {};
    return {
      [propertyName]: {
        type: "title",
        title: [{ type: "text", text: { content: value } }],
      },
    };
  }

  getSelect(propertyName: string, value: string | undefined): any {
    value = value?.replace(/,\s/g, " ").replace(/,/g, "");
    if (!value) return {};
    return { [propertyName]: { select: { name: value } } };
  }

  getMultiSelect(propertyName: string, values: string[] | undefined): any {
    values = values?.filter((v) => !!v && v.length <= 100);
    if (!values || !values.length) return {};
    return {
      [propertyName]: {
        multi_select: values.map((c) => ({ name: c })),
      },
    };
  }

  getCheckbox(propertyName: string, value: boolean | undefined): any {
    if (value == null) return {};
    return {
      [propertyName]: {
        checkbox: !!value,
      },
    };
  }

  getNumber(propertyName: string, value: number | undefined): any {
    if (value == null) return {};
    return {
      [propertyName]: {
        number: value,
      },
    };
  }

  getUrl(propertyName: string, value: string | undefined): any {
    value = value?.trim();
    if (!value) return {};
    return {
      [propertyName]: {
        url: value.trim(),
      },
    };
  }

  getRelation(propertyName: string, value: string[] | undefined): any {
    value = value?.filter((v) => !!v);
    if (!value || value.length === 0) return {};

    return {
      [propertyName]: {
        relation: value.map((id) => ({ id })),
      },
    };
  }

  getRichText(propertyName: string, values: string[] | undefined): any {
    values = values?.filter((v) => !!v);
    if (!values || !values.length) return {};
    return {
      [propertyName]: {
        rich_text: values.map((value) => ({
          type: "text",
          text: {
            content: value,
          },
        })),
      },
    };
  }
}
