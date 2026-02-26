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

test("projectReport agrega cards gerais e top formularios", async () => {
  const results = [
    [
      { status: FormResponseStatus.COMPLETED, count: "3" },
      { status: FormResponseStatus.ABANDONED, count: "1" },
    ],
    [
      { formId: 2, formName: "Pesquisa NPS", total: "3" },
      { formId: 4, formName: "Atendimento", total: 1 },
    ],
    [{ total: "2" }],
    [
      { tipoOpiniao: "Elogio", total: "1" },
      { tipoOpiniao: "Sugestão", total: "1" },
      { tipoOpiniao: "Reclamação", total: "1" },
    ],
  ];

  const client = {
    $queryRaw: async () => results.shift() ?? [],
  };

  const service = new FormResponseMetricsService();
  service.setClient(client as any);
  (service as any).timeSeries = async (params: { interval: string }) =>
    params.interval === "month"
      ? [{ bucket: "2026-01-01T00:00:00.000Z", count: 4 }]
      : [
          { bucket: "2026-01-01T00:00:00.000Z", count: 2 },
          { bucket: "2026-01-03T00:00:00.000Z", count: 2 },
        ];

  const result = await service.projectReport({
    projetoId: 10,
    dateField: "createdAt",
    dayStart: new Date(2026, 0, 1),
    dayEnd: new Date(2026, 0, 3),
    limitTopForms: 10,
  });

  assert.deepEqual(result.cards, {
    totalOpinions: 2,
    totalComplaints: 1,
    totalPraise: 1,
    totalSuggestions: 1,
    totalResponses: 4,
    totalCompleted: 3,
    totalStarted: 0,
    totalAbandoned: 1,
    totalOpinionFormResponses: 2,
    completionRate: 75,
  });
  assert.deepEqual(result.lineByDay, [
    { label: "2026-01-01", value: 2 },
    { label: "2026-01-02", value: 0 },
    { label: "2026-01-03", value: 2 },
  ]);
  assert.deepEqual(result.responsesByForm, [
    { formId: 2, label: "Pesquisa NPS", value: 3 },
    { formId: 4, label: "Atendimento", value: 1 },
  ]);
  assert.deepEqual(result.statusFunnel, [
    { status: FormResponseStatus.COMPLETED, count: 3 },
    { status: FormResponseStatus.ABANDONED, count: 1 },
  ]);
});

test("formFilters retorna campos por formulario com valores agregados", async () => {
  const queryResults = [
    [
      {
        minDate: new Date("2026-02-01T00:00:00.000Z"),
        maxDate: new Date("2026-02-26T23:59:59.999Z"),
      },
    ],
    [{ value: "Masculino", total: "2" }],
  ];

  const client = {
    form: {
      findMany: async () => [
        {
          id: 3,
          name: "Formulario de Opiniao",
          description: "Coleta de opinioes",
          versions: [
            {
              id: 7,
              version: 1,
              isActive: true,
              schema: { title: "Formulario de Opiniao" },
              fields: [
                {
                  id: 8,
                  name: "genero",
                  label: "Genero",
                  type: "Select",
                  required: true,
                  options: { items: ["Masculino", "Feminino"] },
                  ordem: 1,
                },
              ],
            },
          ],
        },
      ],
    },
    $queryRaw: async () => queryResults.shift() ?? [],
  };

  const service = new FormResponseMetricsService();
  service.setClient(client as any);

  const result = await service.formFilters({
    projetoId: 1,
    dateField: "createdAt",
    limitValuesPerField: 20,
  });

  assert.deepEqual(result.dateRange, {
    min: "2026-02-01T00:00:00.000Z",
    max: "2026-02-26T23:59:59.999Z",
  });
  assert.equal(result.forms.length, 1);
  assert.deepEqual(result.forms[0].fields[0], {
    fieldId: 8,
    name: "genero",
    label: "Genero",
    type: "Select",
    required: true,
    ordem: 1,
    optionsConfig: { items: ["Masculino", "Feminino"] },
    suggestedFilter: "multi-select",
    values: [{ value: "Masculino", count: 2 }],
  });
});

test("report unifica temas e tipos de opiniao por normalizacao", async () => {
  const service = new FormResponseMetricsService();
  service.setClient({} as any);

  (service as any).statusFunnel = async () => [
    { status: FormResponseStatus.COMPLETED, count: 4 },
  ];
  (service as any).timeSeries = async (params: { interval: string }) =>
    params.interval === "month"
      ? [{ bucket: "2026-02-01T00:00:00.000Z", count: 4 }]
      : [{ bucket: "2026-02-20T00:00:00.000Z", count: 4 }];
  (service as any).distribution = async (params: { fieldName: string }) => {
    if (params.fieldName === "opiniao") {
      return [
        { value: "Saúde", count: 2 },
        { value: "Saúde", count: 1 },
        { value: "Educação", count: 1 },
      ];
    }
    if (params.fieldName === "tipo_opiniao") {
      return [
        { value: "Reclamação", count: 2 },
        { value: "Reclamação", count: 1 },
        { value: "Elogio", count: 1 },
      ];
    }
    if (params.fieldName === "ano_nascimento") {
      return [{ value: "1999", count: 4 }];
    }
    return [];
  };

  const result = await service.report({
    projetoId: 1,
    dateField: "createdAt",
    limitTopThemes: 10,
    limitTopNeighborhoods: 10,
    limitDistribution: 50,
  });

  assert.deepEqual(result.topTemas, [
    { id: 1, tema: "Saúde", total: 3 },
    { id: 2, tema: "Educação", total: 1 },
  ]);
  assert.deepEqual(result.tipoOpiniao, [
    { label: "Reclamação", value: 3 },
    { label: "Elogio", value: 1 },
  ]);
  assert.deepEqual(result.cards, {
    totalOpinions: 4,
    totalComplaints: 3,
    totalPraise: 1,
    totalSuggestions: 0,
  });
});
