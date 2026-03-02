import { z } from "zod";

// 1. O Mapa de Tipos (Sua "Caixa de Ferramentas")
const typeMapper: Record<string, z.ZodTypeAny> = {
  text: z.string(),
  textarea: z.string(),
  longtext: z.string(),
  email: z.string().email(),
  number: z.coerce.number(),
  date: z.coerce.date(),
  boolean: z.coerce.boolean(),
  switch: z.coerce.boolean(),
  select: z.string(),
};

// 2. O Mapa de Regras (Seus "Ajustes Finos")
const ruleMappers: Record<string, (v: any, val: any) => z.ZodTypeAny> = {
  min: (validator, value) => {
    // Atenção: number usa 'min', string usa 'min' (length), mas date usa 'min' (data)
    // O Zod é esperto e entende, mas em TS avançado teríamos que tipar melhor.
    // Por enquanto, assumimos que se tem 'min', o tipo suporta.
    return validator.min(value, `Mínimo de ${value}`);
  },
  max: (validator, value) => {
    return validator.max(value, `Máximo de ${value}`);
  },
  regex: (validator, value) => {
    // Regex só funciona em string, então cuidado ao usar em number
    return (validator as z.ZodString).regex(new RegExp(value), "Formato inválido");
  },
};

export function createDynamicSchema(
  fields: any[],
  options?: { ignoreRequired?: boolean }
) {
  const shape: Record<string, z.ZodTypeAny> = {};

  fields.forEach((field) => {
    // PASSO A: Identificar o validador base (Sem IFs repetitivos!) 🚀
    // Acessamos direto pelo nome. Se field.type for "text", ele pega typeMapper.text
    const normalizedType =
      typeof field.type === "string"
        ? field.type.toLowerCase()
        : String(field.type ?? "").toLowerCase();
    let validator = typeMapper[normalizedType];

    // Segurança: Se vier um tipo que não existe (ex: "file"), ignoramos ou damos erro
    if (!validator) return;

    Object.keys(ruleMappers).forEach((ruleKey) => {
      // Se o JSON tiver essa chave (ex: field.min existe?)
      if (field[ruleKey] !== undefined && field[ruleKey] !== null) {
        const applyRule = ruleMappers[ruleKey];
        // Atualizamos a variável 'validator' com a nova versão "turbinada"
        validator = applyRule(validator, field[ruleKey]);
      }
    });

    // PASSO C: Verificar Opcional
    // Foi deixado por último porque o .optional() muda o tipo do objeto
    if (options?.ignoreRequired) {
      validator = validator.optional();
    } else if (field.required === false) {
      validator = validator.optional();
    }

    // PASSO D: Salvar no objeto final
    shape[field.name] = validator;
  });

  return z.object(shape);
}

