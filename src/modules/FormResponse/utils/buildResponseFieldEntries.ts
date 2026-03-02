import { ResponseFieldData, buildResponseFieldData } from "./buildResponseFieldData";

type FieldDefinition = {
  id?: number;
  name?: string;
  label?: string;
  type?: string;
  options?: unknown;
};

const CANONICAL_SEMANTIC_FIELD_BY_KEY: Record<string, string> = {
  opiniao: "opiniao",
  "tipo opiniao": "tipo_opiniao",
  "texto opiniao": "texto_opiniao",
  "opinion text": "texto_opiniao",
  "text opinion": "texto_opiniao",
};

function normalizeToken(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function canonicalizeSemanticField(value: unknown) {
  const key = normalizeToken(value);
  return CANONICAL_SEMANTIC_FIELD_BY_KEY[key] ?? null;
}

function extractOptionValues(options: unknown, key: string) {
  if (!options || typeof options !== "object") {
    return [];
  }

  const value = (options as Record<string, unknown>)[key];
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0
    );
  }

  return [];
}

function shouldAliasAsOpinionText(fieldDefinition?: FieldDefinition | null) {
  if (!fieldDefinition) {
    return false;
  }

  const fieldType = normalizeToken(fieldDefinition.type);
  const combinedLabel = normalizeToken(
    `${fieldDefinition.name ?? ""} ${fieldDefinition.label ?? ""}`
  );

  if (!combinedLabel.includes("opiniao")) {
    return false;
  }

  if (combinedLabel === "opiniao" || combinedLabel === "tipo opiniao") {
    return false;
  }

  if (fieldType === "textarea") {
    return true;
  }

  if (fieldType !== "text" && fieldType !== "longtext") {
    return false;
  }

  return /(texto|digite|descreva|mensagem|comentario|comentarios)/.test(
    combinedLabel
  );
}

function resolveSemanticAliases(fieldDefinition?: FieldDefinition | null) {
  const aliases = new Set<string>();

  for (const key of [
    "semanticKey",
    "semanticField",
    "metricField",
    "canonicalField",
    "alias",
    "aliases",
    "semanticAliases",
  ]) {
    for (const value of extractOptionValues(fieldDefinition?.options, key)) {
      const canonical = canonicalizeSemanticField(value);
      if (canonical) {
        aliases.add(canonical);
      }
    }
  }

  if (shouldAliasAsOpinionText(fieldDefinition)) {
    aliases.add("texto_opiniao");
  }

  return Array.from(aliases);
}

export function buildResponseFieldEntries(params: {
  cleanData: Record<string, unknown>;
  fieldIdByName: Map<string, number>;
  definitionByName: Map<string, FieldDefinition>;
}): ResponseFieldData[] {
  const { cleanData, fieldIdByName, definitionByName } = params;
  const result: ResponseFieldData[] = [];
  const inputFieldNames = new Set(Object.keys(cleanData));
  const generatedAliasNames = new Set<string>();

  for (const [fieldName, value] of Object.entries(cleanData)) {
    const fieldDefinition = definitionByName.get(fieldName);

    result.push(
      buildResponseFieldData({
        fieldName,
        value,
        fieldId: fieldIdByName.get(fieldName),
        fieldDefinition,
      })
    );

    for (const aliasName of resolveSemanticAliases(fieldDefinition)) {
      if (
        aliasName === fieldName ||
        inputFieldNames.has(aliasName) ||
        generatedAliasNames.has(aliasName)
      ) {
        continue;
      }

      result.push(
        buildResponseFieldData({
          fieldName: aliasName,
          value,
          fieldDefinition: {
            name: aliasName,
            type: fieldDefinition?.type,
          },
        })
      );
      generatedAliasNames.add(aliasName);
    }
  }

  return result;
}
