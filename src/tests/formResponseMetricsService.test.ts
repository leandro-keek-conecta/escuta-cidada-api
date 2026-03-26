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

test("projectReport agrega cards gerais e respostas por origem", async () => {
  const results = [
    [
      { status: FormResponseStatus.COMPLETED, count: "3" },
      { status: FormResponseStatus.ABANDONED, count: "1" },
    ],
    [
      { label: "WhatsApp", total: "3" },
      { label: "Web", total: 1 },
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
  assert.deepEqual(result.responsesByOrigin, [
    { label: "Web", value: 1 },
    { label: "WhatsApp", value: 3 },
  ]);
  assert.deepEqual(result.statusFunnel, [
    { status: FormResponseStatus.COMPLETED, count: 3 },
    { status: FormResponseStatus.ABANDONED, count: 1 },
  ]);
  assert.deepEqual(result.meta, {
    timeZone: "America/Fortaleza",
    realtime: {
      event: "domain:changed",
      rooms: ["scope:global", "projeto:10"],
      scopes: [{ projetoId: 10 }],
      entities: ["form", "formVersion", "formField", "formResponse"],
    },
  });
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

test("filters retorna opcoes de origem", async () => {
  const service = new FormResponseMetricsService();
  service.setClient({} as any);

  (service as any).distributionByFieldAliases = async (params: {
    fieldNames: string[];
  }) => {
    if (params.fieldNames.includes("tipo_opiniao")) {
      return [{ value: "Elogio", count: 2 }];
    }
    if (params.fieldNames.includes("ano_nascimento")) {
      return [{ value: "1999", count: 1 }];
    }
    return [];
  };

  (service as any).distribution = async (params: { fieldName: string }) => {
    if (params.fieldName === "opiniao") {
      return [{ value: "SaÃºde", count: 3 }];
    }
    if (params.fieldName === "genero") {
      return [{ value: "Masculino", count: 2 }];
    }
    if (params.fieldName === "bairro") {
      return [{ value: "Mangabeira", count: 2 }];
    }
    if (params.fieldName === "campanha") {
      return [{ value: "Sim", count: 2 }];
    }
    return [];
  };

  (service as any).distributionByOrigin = async () => [
    { value: "WhatsApp", count: 3 },
    { value: "Web", count: 1 },
  ];

  const result = await service.filters({
    projetoId: 5,
    limit: 20,
  });

  assert.deepEqual(result.origens, [
    { label: "WhatsApp", value: "WhatsApp", count: 3 },
    { label: "Web", value: "Web", count: 1 },
  ]);
});

test("report unifica temas e tipos de opiniao por normalizacao", async () => {
  const service = new FormResponseMetricsService();
  service.setClient({
    formResponse: {
      count: async () => 2,
    },
  } as any);

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
  assert.equal(result.opinions_today, 2);
  assert.deepEqual(result.meta, {
    timeZone: "America/Fortaleza",
    realtime: {
      event: "domain:changed",
      rooms: ["scope:global", "projeto:1"],
      scopes: [{ projetoId: 1 }],
      entities: ["form", "formVersion", "formField", "formResponse"],
    },
  });
});

test("report unifica Outro e Outros em topTemas como Outros", async () => {
  const service = new FormResponseMetricsService();
  service.setClient({
    formResponse: {
      count: async () => 5,
    },
  } as any);

  (service as any).statusFunnel = async () => [];
  (service as any).timeSeries = async () => [];
  (service as any).distribution = async (params: { fieldName: string }) => {
    if (params.fieldName === "opiniao") {
      return [
        { value: "Outro", count: 2 },
        { value: "Outros", count: 3 },
      ];
    }
    if (params.fieldName === "ano_nascimento") {
      return [];
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
    { id: 1, tema: "Outros", total: 5 },
  ]);
  assert.equal(result.opinions_today, 5);
});

test("report usa aliases alternativos para tipo de opiniao e ano de nascimento", async () => {
  const service = new FormResponseMetricsService();
  service.setClient({
    formResponse: {
      count: async () => 1,
    },
  } as any);

  (service as any).statusFunnel = async () => [];
  (service as any).timeSeries = async () => [];
  (service as any).distribution = async (params: { fieldName: string }) => {
    if (params.fieldName === "tipo_de_opiniao") {
      return [{ value: "Elogio", count: 2 }];
    }
    if (params.fieldName === "ano_de_nascimento") {
      return [{ value: "1999", count: 2 }];
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

  assert.deepEqual(result.cards, {
    totalOpinions: 2,
    totalComplaints: 0,
    totalPraise: 2,
    totalSuggestions: 0,
  });
  assert.equal(result.opinions_today, 1);
  assert.deepEqual(result.tipoOpiniao, [{ label: "Elogio", value: 2 }]);
  assert.deepEqual(
    result.opinionsByAge.find((item) => item.label === "26-35"),
    { label: "26-35", value: 2 }
  );
});

test("summary trata day em formato YYYY-MM-DD como data de calendario local", async () => {
  let countWhere: any;
  const distributionCalls: Array<{ fieldName: string; start?: Date; end?: Date }> =
    [];

  const client = {
    formResponse: {
      count: async ({ where }: { where: unknown }) => {
        countWhere = where;
        return 0;
      },
    },
  };

  const service = new FormResponseMetricsService();
  service.setClient(client as any);
  (service as any).distribution = async (params: {
    fieldName: string;
    start?: Date;
    end?: Date;
  }) => {
    distributionCalls.push(params);
    return [];
  };

  const result = await service.summary({
    projetoId: 5,
    day: "2026-03-03",
    limitTopThemes: 5,
    limitTopNeighborhoods: 5,
  });

  const expectedDayStart = new Date("2026-03-03T03:00:00.000Z");
  const expectedDayEnd = new Date("2026-03-04T02:59:59.999Z");
  const expectedRangeStart = new Date("2025-03-03T03:00:00.000Z");

  assert.deepEqual(result.day, {
    start: expectedDayStart.toISOString(),
    end: expectedDayEnd.toISOString(),
  });
  assert.deepEqual(result.range, {
    start: expectedRangeStart.toISOString(),
    end: expectedDayEnd.toISOString(),
  });
  assert.equal(
    countWhere.createdAt.gte.toISOString(),
    expectedDayStart.toISOString()
  );
  assert.equal(
    countWhere.createdAt.lte.toISOString(),
    expectedDayEnd.toISOString()
  );
  assert.equal(distributionCalls.length, 2);
  assert.equal(
    distributionCalls[0].start?.toISOString(),
    expectedRangeStart.toISOString()
  );
  assert.equal(
    distributionCalls[0].end?.toISOString(),
    expectedDayEnd.toISOString()
  );
  assert.equal(
    distributionCalls[1].start?.toISOString(),
    expectedRangeStart.toISOString()
  );
  assert.equal(
    distributionCalls[1].end?.toISOString(),
    expectedDayEnd.toISOString()
  );
});

test("buildFieldFilterWhere aplica equals insensitive em filtros de valor", () => {
  const service = new FormResponseMetricsService();
  service.setClient({} as any);

  const where = (service as any).buildFieldFilterWhere(
    { bairros: ["mangabeira"] },
    new Date("2026-02-26T00:00:00.000Z")
  );

  assert.deepEqual(where, {
    AND: [
      {
        fields: {
          some: {
            fieldName: "bairro",
            OR: [{ value: { equals: "mangabeira", mode: "insensitive" } }],
          },
        },
      },
    ],
  });
});

test("buildFieldFilterWhere canoniza tema sem acento para filtrar valor acentuado", () => {
  const service = new FormResponseMetricsService();
  service.setClient({} as any);

  const where = (service as any).buildFieldFilterWhere(
    { temas: ["Educacao"] },
    new Date("2026-02-26T00:00:00.000Z")
  );

  assert.deepEqual(where, {
    AND: [
      {
        fields: {
          some: {
            fieldName: "opiniao",
            OR: [
              { value: { equals: "Educacao", mode: "insensitive" } },
              { value: { equals: "Educação", mode: "insensitive" } },
              { value: { equals: "Educação", mode: "insensitive" } },
            ],
          },
        },
      },
    ],
  });
});

test("buildFieldFilterWhere unifica tema Outro e Outros como Outros", () => {
  const service = new FormResponseMetricsService();
  service.setClient({} as any);

  const where = (service as any).buildFieldFilterWhere(
    { temas: ["Outros"] },
    new Date("2026-02-26T00:00:00.000Z")
  );

  assert.deepEqual(where, {
    AND: [
      {
        fields: {
          some: {
            fieldName: "opiniao",
            OR: [
              { value: { equals: "Outros", mode: "insensitive" } },
              { value: { equals: "Outro", mode: "insensitive" } },
            ],
          },
        },
      },
    ],
  });
});

test("buildFieldFilterWhere inclui variantes unicode combinadas no filtro por tipo", () => {
  const service = new FormResponseMetricsService();
  service.setClient({} as any);
  const tipoCanonico = "Sugest\u00e3o";

  const where = (service as any).buildFieldFilterWhere(
    { tipos: [tipoCanonico] },
    new Date("2026-02-26T00:00:00.000Z")
  );

  const variants = where.AND[0].fields.some.OR.map(
    (item: any) => item.value.equals
  );

  assert.equal(variants.includes(tipoCanonico), true);
  assert.equal(variants.includes("Sugestao"), true);
  assert.equal(variants.includes(tipoCanonico.normalize("NFD")), true);
});

test("buildValueFilterSql inclui variantes unicode combinadas no filtro SQL por tipo", () => {
  const service = new FormResponseMetricsService();
  service.setClient({} as any);
  const tipoCanonico = "Sugest\u00e3o";

  const sql = (service as any).buildValueFilterSql(
    "f",
    [tipoCanonico],
    "tipo_opiniao"
  );

  assert.equal(Array.isArray(sql.values), true);
  assert.equal(sql.values.includes(tipoCanonico.toLowerCase()), true);
  assert.equal(sql.values.includes("sugestao"), true);
  assert.equal(
    sql.values.includes(tipoCanonico.normalize("NFD").toLowerCase()),
    true
  );
});

test("normalizeFieldFilters agrega aliases de busca textual nas metricas", () => {
  const service = new FormResponseMetricsService();
  service.setClient({} as any);

  const filters = (service as any).normalizeFieldFilters({
    busca: ["medicamento"],
    search: ["ubatuba"],
    keyword: ["remedio"],
  });

  assert.deepEqual(filters, {
    temas: undefined,
    tipos: undefined,
    generos: undefined,
    bairros: undefined,
    origens: undefined,
    faixaEtaria: undefined,
    textoOpiniao: ["medicamento", "ubatuba", "remedio"],
    campanhas: undefined,
  });
});

test("buildOriginWhere mapeia origem canonica para source/channel", () => {
  const service = new FormResponseMetricsService();
  service.setClient({} as any);

  const whatsappWhere = (service as any).buildOriginWhere(["WhatsApp"]);
  const webWhere = (service as any).buildOriginWhere(["Web"]);

  const whatsappCondition = {
    OR: [
      { source: { equals: "whatsapp", mode: "insensitive" } },
      { channel: { equals: "automation", mode: "insensitive" } },
    ],
  };

  assert.deepEqual(whatsappWhere, whatsappCondition);
  assert.deepEqual(webWhere, { NOT: whatsappCondition });
});

test("buildFieldFilterWhere aplica busca textual em texto_opiniao e outra_opiniao", () => {
  const service = new FormResponseMetricsService();
  service.setClient({} as any);

  const where = (service as any).buildFieldFilterWhere(
    { textoOpiniao: ["inovacao"] },
    new Date("2026-02-26T00:00:00.000Z")
  );

  assert.deepEqual(where, {
    AND: [
      {
        fields: {
          some: {
            fieldName: { in: ["texto_opiniao", "outra_opiniao"] },
            OR: [{ value: { contains: "inovacao", mode: "insensitive" } }],
          },
        },
      },
    ],
  });
});

test("report restringe series e distribuicoes ao universo de opinioes", async () => {
  let countWhere: any;
  const capturedDistributions: any[] = [];
  const capturedTimeSeries: any[] = [];
  let capturedStatusFunnel: any;

  const service = new FormResponseMetricsService();
  service.setClient({
    formResponse: {
      count: async ({ where }: { where: unknown }) => {
        countWhere = where;
        return 0;
      },
    },
  } as any);

  (service as any).statusFunnel = async (params: unknown) => {
    capturedStatusFunnel = params;
    return [];
  };
  (service as any).distribution = async (params: unknown) => {
    capturedDistributions.push(params);
    return [];
  };
  (service as any).distributionByFieldAliases = async (params: unknown) => {
    capturedDistributions.push(params);
    return [];
  };
  (service as any).timeSeries = async (params: unknown) => {
    capturedTimeSeries.push(params);
    return [];
  };

  await service.report({
    projetoId: 5,
    dateField: "createdAt",
    texto: ["inovacao"],
    origem: ["whatsapp"],
    limitTopThemes: 10,
    limitTopNeighborhoods: 10,
    limitDistribution: 50,
  });

  assert.equal(capturedStatusFunnel.restrictToOpinionForms, true);
  assert.deepEqual(capturedStatusFunnel.origens, ["WhatsApp"]);
  assert.equal(
    capturedDistributions.every((params) => params.restrictToOpinionForms === true),
    true
  );
  assert.equal(
    capturedDistributions.every(
      (params) =>
        Array.isArray(params.origens) &&
        params.origens.length === 1 &&
        params.origens[0] === "WhatsApp"
    ),
    true
  );
  assert.equal(
    capturedTimeSeries.every((params) => params.restrictToOpinionForms === true),
    true
  );
  assert.equal(
    capturedTimeSeries.every(
      (params) =>
        Array.isArray(params.origens) &&
        params.origens.length === 1 &&
        params.origens[0] === "WhatsApp"
    ),
    true
  );
  assert.equal(Array.isArray(countWhere.AND), true);
  assert.deepEqual(countWhere.AND[0], {
    fields: {
      some: {
        fieldName: {
          in: [
            "opiniao",
            "texto_opiniao",
            "outra_opiniao",
            "tipo_opiniao",
            "tipo_de_opiniao",
            "tipoopiniao",
            "tipodeopiniao",
            "tipo_da_opiniao",
            "classificacao_opiniao",
          ],
        },
      },
    },
  });
  assert.equal(
    countWhere.AND.some(
      (item: any) =>
        Array.isArray(item.OR) &&
        item.OR.some((entry: any) => entry.source?.equals === "whatsapp") &&
        item.OR.some((entry: any) => entry.channel?.equals === "automation")
    ),
    true
  );
});
