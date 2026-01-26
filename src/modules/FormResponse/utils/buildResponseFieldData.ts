import { Prisma } from "@prisma/client";

type FieldDefinition = {
  name?: string;
  type?: string;
};

export type ResponseFieldData = {
  fieldName: string;
  fieldId?: number;
  value?: string | null;
  valueNumber?: number | null;
  valueBool?: boolean | null;
  valueDate?: Date | null;
  valueJson?: Prisma.InputJsonValue;
};

function isObjectValue(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function buildResponseFieldData(params: {
  fieldName: string;
  value: unknown;
  fieldId?: number;
  fieldDefinition?: FieldDefinition | null;
}): ResponseFieldData {
  const { fieldName, value, fieldId, fieldDefinition } = params;
  const result: ResponseFieldData = { fieldName };

  if (fieldId) {
    result.fieldId = fieldId;
  }

  if (value === undefined || value === null) {
    result.value = null;
    return result;
  }

  const fieldType = fieldDefinition?.type?.toLowerCase();
  const isDateValue = value instanceof Date;
  result.value = isDateValue ? value.toISOString() : String(value);

  switch (fieldType) {
    case "number": {
      const numValue =
        typeof value === "number" ? value : Number(String(value));
      if (Number.isFinite(numValue)) {
        result.valueNumber = numValue;
      }
      break;
    }
    case "boolean": {
      if (typeof value === "boolean") {
        result.valueBool = value;
      } else if (value === "true" || value === "false") {
        result.valueBool = value === "true";
      }
      break;
    }
    case "date": {
      if (isDateValue) {
        result.valueDate = value;
      } else {
        const parsed = new Date(String(value));
        if (!Number.isNaN(parsed.getTime())) {
          result.valueDate = parsed;
        }
      }
      break;
    }
    default: {
      if (Array.isArray(value) || isObjectValue(value)) {
        result.valueJson = value as Prisma.InputJsonValue;
      }
      break;
    }
  }

  return result;
}
