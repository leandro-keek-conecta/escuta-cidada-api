import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { ListFormByProjectSeparatedForFormService } from "@/modules/FormResponse/services/ListFormByProjectSeparatedForFormService";

test("ListFormByProjectSeparatedForFormService retorna respostas agrupadas e achatadas para o panorama", async () => {
  const service = new ListFormByProjectSeparatedForFormService();

  (service as any).formResponseRepository = {
    listByProjectId: async () => [
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
          { fieldName: "nome", value: "Joao Santos", valueJson: null, valueNumber: null, valueBool: null, valueDate: null },
          { fieldName: "bairro", value: "Mangabeira", valueJson: null, valueNumber: null, valueBool: null, valueDate: null },
          { fieldName: "opiniao", value: "Mobilidade", valueJson: null, valueNumber: null, valueBool: null, valueDate: null },
          { fieldName: "tipo_opiniao", value: "Sugestao", valueJson: null, valueNumber: null, valueBool: null, valueDate: null },
          { fieldName: "texto_opiniao", value: "Aumentar a frota de onibus.", valueJson: null, valueNumber: null, valueBool: null, valueDate: null },
        ],
        formVersion: {
          form: {
            id: 10,
            name: "Formulario Principal",
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
          { fieldName: "nome", value: "Maria Silva", valueJson: null, valueNumber: null, valueBool: null, valueDate: null },
          { fieldName: "bairro", value: "Centro", valueJson: null, valueNumber: null, valueBool: null, valueDate: null },
          { fieldName: "opiniao", value: "Saude", valueJson: null, valueNumber: null, valueBool: null, valueDate: null },
          { fieldName: "tipo_opiniao", value: "Reclamacao", valueJson: null, valueNumber: null, valueBool: null, valueDate: null },
          { fieldName: "texto_opiniao", value: "Falta medico no posto.", valueJson: null, valueNumber: null, valueBool: null, valueDate: null },
          { fieldName: "campanha", value: "Panorama 2026", valueJson: null, valueNumber: null, valueBool: null, valueDate: null },
        ],
        formVersion: {
          form: {
            id: 10,
            name: "Formulario Principal",
          },
        },
      },
    ],
  };

  const result = await service.execute({ projectId: 5 });

  assert.deepEqual(result, {
    projectId: 5,
    selectedFormId: null,
    totalResponses: 2,
    totalForms: 1,
    forms: [
      {
        formId: 10,
        formName: "Formulario Principal",
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
            nome: "Joao Santos",
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
            nome: "Maria Silva",
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
