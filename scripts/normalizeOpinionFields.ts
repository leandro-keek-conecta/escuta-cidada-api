import { PrismaClient } from "@prisma/client";

type OpinionFieldName = "opiniao" | "tipo_opiniao";

type RawFieldRow = {
  id: number;
  fieldName: OpinionFieldName;
  value: string;
};

const prisma = new PrismaClient();

const THEME_CANONICAL_BY_KEY: Record<string, string> = {
  saude: "Sa\u00fade",
  educacao: "Educa\u00e7\u00e3o",
  seguranca: "Seguran\u00e7a",
  infraestrutura: "Infraestrutura",
  mobilidade: "Mobilidade",
  "meio ambiente": "Meio ambiente",
  outro: "Outro",
};

const OPINION_TYPE_CANONICAL_BY_KEY: Record<string, string> = {
  reclamacao: "Reclama\u00e7\u00e3o",
  elogio: "Elogio",
  sugestao: "Sugest\u00e3o",
};

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function parseProjetoIdArg() {
  const arg = process.argv.find((item) => item.startsWith("--projetoId="));
  if (!arg) {
    return undefined;
  }

  const parsed = Number(arg.split("=")[1]);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Parametro --projetoId invalido");
  }

  return parsed;
}

function chunk<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

function pickMostFrequentLabelByKey(rows: RawFieldRow[]) {
  const grouped = new Map<string, Map<string, number>>();

  for (const row of rows) {
    const key = normalizeKey(row.value);
    const value = row.value.trim().replace(/\s+/g, " ");
    const byValue = grouped.get(key) ?? new Map<string, number>();
    byValue.set(value, (byValue.get(value) ?? 0) + 1);
    grouped.set(key, byValue);
  }

  const chosen = new Map<string, string>();
  for (const [key, byValue] of grouped.entries()) {
    const sorted = Array.from(byValue.entries()).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
    );
    chosen.set(key, sorted[0]?.[0] ?? key);
  }

  return chosen;
}

function canonicalizeTheme(
  value: string,
  fallbackByKey: Map<string, string>
) {
  const key = normalizeKey(value);
  return THEME_CANONICAL_BY_KEY[key] ?? fallbackByKey.get(key) ?? value.trim();
}

function canonicalizeOpinionType(value: string) {
  const key = normalizeKey(value);
  return OPINION_TYPE_CANONICAL_BY_KEY[key] ?? value.trim();
}

async function main() {
  const apply = process.argv.includes("--apply");
  const projetoId = parseProjetoIdArg();

  const rows = await prisma.formResponseField.findMany({
    where: {
      fieldName: { in: ["opiniao", "tipo_opiniao"] },
      value: { not: null },
      ...(projetoId
        ? { response: { projetoId } }
        : {}),
    },
    select: {
      id: true,
      fieldName: true,
      value: true,
    },
  });

  const validRows: RawFieldRow[] = rows
    .filter((row): row is RawFieldRow => typeof row.value === "string")
    .map((row) => ({
      id: row.id,
      fieldName: row.fieldName as OpinionFieldName,
      value: row.value.trim().replace(/\s+/g, " "),
    }))
    .filter((row) => row.value.length > 0);

  const opinionRows = validRows.filter((row) => row.fieldName === "opiniao");
  const opinionTypeRows = validRows.filter(
    (row) => row.fieldName === "tipo_opiniao"
  );

  const themeFallback = pickMostFrequentLabelByKey(opinionRows);

  const updates = validRows
    .map((row) => {
      const canonical =
        row.fieldName === "opiniao"
          ? canonicalizeTheme(row.value, themeFallback)
          : canonicalizeOpinionType(row.value);
      return {
        id: row.id,
        fieldName: row.fieldName,
        from: row.value,
        to: canonical,
      };
    })
    .filter((row) => row.from !== row.to);

  const byField = updates.reduce(
    (acc, row) => {
      acc[row.fieldName] += 1;
      return acc;
    },
    { opiniao: 0, tipo_opiniao: 0 }
  );

  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry-run",
        projetoId: projetoId ?? null,
        scanned: validRows.length,
        updatesPlanned: updates.length,
        byField,
        sample: updates.slice(0, 20),
      },
      null,
      2
    )
  );

  if (!apply || updates.length === 0) {
    return;
  }

  for (const batch of chunk(updates, 200)) {
    await prisma.$transaction(
      batch.map((row) =>
        prisma.formResponseField.update({
          where: { id: row.id },
          data: { value: row.to },
        })
      )
    );
  }

  console.log(
    JSON.stringify(
      {
        applied: updates.length,
        projetoId: projetoId ?? null,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
