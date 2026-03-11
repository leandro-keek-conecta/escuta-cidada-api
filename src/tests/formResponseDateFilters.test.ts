import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";

import { ListFormOpinionsService } from "@/modules/FormResponse/services/ListFormOpinionsService";
import { ListFormResponsesRawService } from "@/modules/FormResponse/services/ListFormResponsesRawService";

test("opinions expande data simples para o dia inteiro em America/Fortaleza", async () => {
  let capturedWhere: any;

  const service = new ListFormOpinionsService();
  service.setClient({
    formResponseField: {
      findMany: async ({ where }: { where: unknown }) => {
        capturedWhere = where;
        return [];
      },
      count: async () => 0,
    },
  } as any);

  await service.execute({
    projetoId: 1,
    start: "2026-03-10",
    end: "2026-03-10",
    limit: 20,
    offset: 0,
    fieldName: "opiniao",
  });

  assert.equal(
    capturedWhere.response.createdAt.gte.toISOString(),
    "2026-03-10T03:00:00.000Z"
  );
  assert.equal(
    capturedWhere.response.createdAt.lte.toISOString(),
    "2026-03-11T02:59:59.999Z"
  );
});

test("raw expande data simples para o dia inteiro em America/Fortaleza", async () => {
  let capturedWhere: any;

  const service = new ListFormResponsesRawService();
  service.setClient({
    formResponse: {
      findMany: async ({ where }: { where: unknown }) => {
        capturedWhere = where;
        return [];
      },
      count: async () => 0,
    },
  } as any);

  await service.execute({
    projetoId: 1,
    start: "2026-03-10",
    end: "2026-03-10",
    limit: 20,
    offset: 0,
    includeDates: true,
  });

  assert.equal(
    capturedWhere.createdAt.gte.toISOString(),
    "2026-03-10T03:00:00.000Z"
  );
  assert.equal(
    capturedWhere.createdAt.lte.toISOString(),
    "2026-03-11T02:59:59.999Z"
  );
});
