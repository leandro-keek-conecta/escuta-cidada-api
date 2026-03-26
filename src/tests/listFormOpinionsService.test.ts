import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";

import { ListFormOpinionsService } from "@/modules/FormResponse/services/ListFormOpinionsService";

test("ListFormOpinionsService retorna respostas achatadas agrupadas por formulario de opiniao", async () => {
  const service = new ListFormOpinionsService();

  service.setClient({
    formResponse: {
      findMany: async () => [
        {
          id: 2,
          projetoId: 5,
          userId: 102,
          formVersionId: 1002,
          startedAt: new Date("2026-03-03T08:38:10.000Z"),
          submittedAt: new Date("2026-03-03T08:40:00.000Z"),
          completedAt: new Date("2026-03-03T08:40:00.000Z"),
          createdAt: new Date("2026-03-03T08:40:00.000Z"),
          fields: [
            { fieldName: "bairro", value: "Mangabeira", valueJson: null, valueNumber: null, valueBool: null, valueDate: null },
            { fieldName: "opiniao", value: "Mobilidade", valueJson: null, valueNumber: null, valueBool: null, valueDate: null },
            { fieldName: "tipo_opiniao", value: "Sugestao", valueJson: null, valueNumber: null, valueBool: null, valueDate: null },
            { fieldName: "texto_opiniao", value: "Aumentar a frota de onibus.", valueJson: null, valueNumber: null, valueBool: null, valueDate: null },
          ],
          formVersion: {
            form: {
              id: 10,
              name: "Formulario de Opiniao",
            },
          },
        },
        {
          id: 1,
          projetoId: 5,
          userId: 101,
          formVersionId: 1001,
          startedAt: new Date("2026-03-03T08:09:20.000Z"),
          submittedAt: new Date("2026-03-03T08:10:00.000Z"),
          completedAt: new Date("2026-03-03T08:10:00.000Z"),
          createdAt: new Date("2026-03-03T08:10:00.000Z"),
          fields: [
            { fieldName: "bairro", value: "Centro", valueJson: null, valueNumber: null, valueBool: null, valueDate: null },
            { fieldName: "opiniao", value: "Saude", valueJson: null, valueNumber: null, valueBool: null, valueDate: null },
            { fieldName: "tipo_opiniao", value: "Reclamacao", valueJson: null, valueNumber: null, valueBool: null, valueDate: null },
            { fieldName: "texto_opiniao", value: "Falta medico no posto.", valueJson: null, valueNumber: null, valueBool: null, valueDate: null },
            { fieldName: "campanha", value: "Panorama 2026", valueJson: null, valueNumber: null, valueBool: null, valueDate: null },
          ],
          formVersion: {
            form: {
              id: 10,
              name: "Formulario de Opiniao",
            },
          },
        },
      ],
      count: async () => 2,
    },
  } as any);

  const result = await service.execute({
    projetoId: 5,
    limit: 20,
    offset: 0,
  });

  assert.deepEqual(result, {
    projectId: 5,
    totalResponses: 2,
    returnedResponses: 2,
    totalForms: 1,
    limit: 20,
    offset: 0,
    forms: [
      {
        formId: 10,
        formName: "Formulario de Opiniao",
        formVersionIds: [1002, 1001],
        totalResponses: 2,
        latestResponseAt: "2026-03-03T08:40:00.000Z",
        responses: [
          {
            id: 2,
            usuario_id: 102,
            horario: "2026-03-03T08:40:00.000Z",
            startedAt: "2026-03-03T08:38:10.000Z",
            submittedAt: "2026-03-03T08:40:00.000Z",
            completedAt: "2026-03-03T08:40:00.000Z",
            createdAt: "2026-03-03T08:40:00.000Z",
            bairro: "Mangabeira",
            opiniao: "Mobilidade",
            tipo_opiniao: "Sugestao",
            texto_opiniao: "Aumentar a frota de onibus.",
          },
          {
            id: 1,
            usuario_id: 101,
            horario: "2026-03-03T08:10:00.000Z",
            startedAt: "2026-03-03T08:09:20.000Z",
            submittedAt: "2026-03-03T08:10:00.000Z",
            completedAt: "2026-03-03T08:10:00.000Z",
            createdAt: "2026-03-03T08:10:00.000Z",
            bairro: "Centro",
            opiniao: "Saude",
            tipo_opiniao: "Reclamacao",
            texto_opiniao: "Falta medico no posto.",
            campanha: "Panorama 2026",
          },
        ],
      },
    ],
  });
});

test("ListFormOpinionsService aplica filtros semanticos e busca textual", async () => {
  let capturedWhere: any;

  const service = new ListFormOpinionsService();
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
    projetoId: 9,
    tema: ["Saude"],
    tipo: ["Reclamacao"],
    genero: ["Masculino"],
    bairro: ["Mangabeira"],
    faixaEtaria: ["26-35"],
    busca: ["medicamento"],
    limit: 20,
    offset: 0,
  });

  assert.equal(capturedWhere.projetoId, 9);
  assert.equal(capturedWhere.AND[0].fields.some.fieldName.in.includes("opiniao"), true);
  assert.equal(capturedWhere.AND[1].fields.some.fieldName, "opiniao");
  assert.equal(
    capturedWhere.AND[1].fields.some.OR.some(
      (item: any) => item.value.equals === "Saúde"
    ),
    true
  );
  assert.deepEqual(capturedWhere.AND[2].fields.some.fieldName.in, [
    "tipo_opiniao",
    "tipo_de_opiniao",
    "tipoopiniao",
    "tipodeopiniao",
    "tipo_da_opiniao",
    "classificacao_opiniao",
  ]);
  assert.equal(capturedWhere.AND[3].fields.some.fieldName, "genero");
  assert.equal(capturedWhere.AND[4].fields.some.fieldName, "bairro");
  assert.equal(
    capturedWhere.AND[5].fields.some.OR.some(
      (item: any) => item.fieldName === "texto_opiniao"
    ),
    true
  );
  assert.deepEqual(capturedWhere.AND[6].fields.some.fieldName.in, [
    "ano_nascimento",
    "ano_de_nascimento",
    "ano",
    "anonascimento",
    "anodenascimento",
    "nascimento",
  ]);
});

test("ListFormOpinionsService considera variantes com e sem acento no filtro de tema e tipo", async () => {
  let capturedWhere: any;

  const service = new ListFormOpinionsService();
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
    projetoId: 5,
    tema: ["Saúde"],
    tipo: ["Sugestão"],
    limit: 20,
    offset: 0,
  });

  const temaVariants = capturedWhere.AND[1].fields.some.OR.map(
    (item: any) => item.value.equals
  );
  const tipoVariants = capturedWhere.AND[2].fields.some.OR.map(
    (item: any) => item.value.equals
  );

  assert.equal(temaVariants.includes("Saúde"), true);
  assert.equal(temaVariants.includes("Saude"), true);
  assert.equal(tipoVariants.includes("Sugestão"), true);
  assert.equal(tipoVariants.includes("Sugestao"), true);
});

test("ListFormOpinionsService considera variantes unicode combinadas no filtro de tema e tipo", async () => {
  let capturedWhere: any;
  const temaCanonico = "Sa\u00fade";
  const tipoCanonico = "Sugest\u00e3o";

  const service = new ListFormOpinionsService();
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
    projetoId: 5,
    tema: [temaCanonico],
    tipo: [tipoCanonico],
    limit: 20,
    offset: 0,
  });

  const temaVariants = capturedWhere.AND[1].fields.some.OR.map(
    (item: any) => item.value.equals
  );
  const tipoVariants = capturedWhere.AND[2].fields.some.OR.map(
    (item: any) => item.value.equals
  );

  assert.equal(temaVariants.includes(temaCanonico.normalize("NFD")), true);
  assert.equal(tipoVariants.includes(tipoCanonico.normalize("NFD")), true);
});

test("ListFormOpinionsService aplica filtro por origem web e whatsapp", async () => {
  let capturedWhere: any;

  const service = new ListFormOpinionsService();
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
    projetoId: 5,
    origem: ["web"],
    limit: 20,
    offset: 0,
  });

  const webOriginFilter = capturedWhere.AND[1];
  assert.deepEqual(webOriginFilter, {
    AND: [
      {
        OR: [
          { source: null },
          { NOT: { source: { equals: "whatsapp", mode: "insensitive" } } },
        ],
      },
      {
        OR: [
          { channel: null },
          { NOT: { channel: { equals: "automation", mode: "insensitive" } } },
        ],
      },
    ],
  });

  await service.execute({
    projetoId: 5,
    origem: ["whatsapp"],
    limit: 20,
    offset: 0,
  });

  const whatsappOriginFilter = capturedWhere.AND[1];
  assert.deepEqual(whatsappOriginFilter, {
    OR: [
      { source: { equals: "whatsapp", mode: "insensitive" } },
      { channel: { equals: "automation", mode: "insensitive" } },
    ],
  });
});
