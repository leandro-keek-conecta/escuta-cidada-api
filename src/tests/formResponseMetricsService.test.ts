import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { FormResponseStatus } from "@prisma/client";
import { FormResponseMetricsService } from "@/modules/FormResponse/services/FormResponseMetricsService";

test("timeSeries normaliza bucket e count", async () => {
  const client = {
    $queryRaw: async () => [
      { bucket: new Date("2026-01-01T00:00:00.000Z"), count: "3" },
    ],
  };
  const service = new FormResponseMetricsService();
  service.setClient(client as any);
  const result = await service.timeSeries({
    projetoId: 1,
    interval: "day",
    dateField: "createdAt",
  });

  assert.deepEqual(result, [
    { bucket: "2026-01-01T00:00:00.000Z", count: 3 },
  ]);
});

test("distribution normaliza datas e contagem", async () => {
  const client = {
    $queryRaw: async () => [
      { value: new Date("2026-01-02T00:00:00.000Z"), count: 2 },
    ],
  };
  const service = new FormResponseMetricsService();
  service.setClient(client as any);
  const result = await service.distribution({
    fieldId: 10,
    valueType: "date",
    limit: 10,
  });

  assert.deepEqual(result, [
    { value: "2026-01-02T00:00:00.000Z", count: 2 },
  ]);
});

test("numberStats normaliza numeros", async () => {
  const client = {
    $queryRaw: async () => [{ count: "5", min: "1", max: "9", avg: "4.2" }],
  };
  const service = new FormResponseMetricsService();
  service.setClient(client as any);
  const result = await service.numberStats({
    fieldId: 10,
    formVersionId: 2,
  });

  assert.deepEqual(result, { count: 5, min: 1, max: 9, avg: 4.2 });
});

test("statusFunnel retorna contagem por status", async () => {
  const client = {
    formResponse: {
      groupBy: async () => [
        { status: FormResponseStatus.COMPLETED, _count: { _all: 7 } },
      ],
    },
  };
  const service = new FormResponseMetricsService();
  service.setClient(client as any);
  const result = await service.statusFunnel({ projetoId: 1 });

  assert.deepEqual(result, [
    { status: FormResponseStatus.COMPLETED, count: 7 },
  ]);
});
