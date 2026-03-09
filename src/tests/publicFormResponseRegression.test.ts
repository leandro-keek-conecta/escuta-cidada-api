import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { FormResponseStatus } from "@prisma/client";
import AppError from "@/common/errors/AppError";
import { CreateFormResponseService } from "@/modules/FormResponse/services/CreateFormResponseService";
import { PublicFormReadService } from "@/modules/form/services/PublicFormReadService";

test("PublicFormReadService inclui projeto.id no payload publico", async () => {
  const service = new PublicFormReadService();

  (service as any).repository = {
    getProjetoBySlug: async () => ({
      id: 7,
      slug: "prefeitura-municipal-de-bayeux",
      name: "Prefeitura Municipal de Bayeux",
      corHex: "#123456",
      ativo: true,
    }),
    getActiveFormsByProjetoId: async () => [
      {
        id: 3,
        name: "Formulario de Opiniao",
        description: "Coleta publica",
        versions: [
          {
            id: 12,
            version: 4,
            schema: {},
            fields: [
              {
                id: 101,
                name: "opiniao",
                label: "Opiniao",
                type: "select",
                required: true,
                options: { items: ["Educacao"] },
                ordem: 1,
              },
            ],
          },
        ],
      },
    ],
  };

  const result = await service.getPublicFormBySlug({
    projetoSlug: "prefeitura-municipal-de-bayeux",
    formSlug: "formulario-de-opiniao",
  });

  assert.equal((result as any).projeto.id, 7);
});

test("CreateFormResponseService rejeita projetoId incompativel com a versao do formulario", async () => {
  const service = new CreateFormResponseService();

  (service as any).formVersionRepository = {
    findByIdWithForm: async () => ({
      id: 12,
      formId: 5,
      form: {
        id: 5,
        projetoId: 99,
      },
    }),
  };
  (service as any).formFieldRepository = {
    findByFormVersionId: async () => [],
  };
  (service as any).formResponseRepository = {
    create: async () => ({ id: 1 }),
  };

  await assert.rejects(
    service.execute({
      data: {
        formVersionId: 12,
        projetoId: 1,
        status: FormResponseStatus.COMPLETED,
      },
    }),
    (error: unknown) =>
      error instanceof AppError && [400, 422].includes(error.statusCode)
  );
});

test("CreateFormResponseService persiste campos textarea dinamicos definidos na versao ativa", async () => {
  const service = new CreateFormResponseService();
  const textareaFieldName = "area_de_texto_8439accc0c";
  let capturedCreateInput: any;

  (service as any).formVersionRepository = {
    findByIdWithForm: async () => ({
      id: 12,
      formId: 5,
      form: {
        id: 5,
        projetoId: 1,
      },
    }),
  };
  (service as any).formFieldRepository = {
    findByFormVersionId: async () => [
      {
        id: 201,
        formVersionId: 12,
        name: "opiniao",
        label: "Opiniao",
        type: "select",
        required: true,
        options: { items: ["Educacao"] },
        ordem: 1,
      },
      {
        id: 202,
        formVersionId: 12,
        name: textareaFieldName,
        label: "Digite sua opiniao",
        type: "textarea",
        required: true,
        options: null,
        ordem: 2,
      },
    ],
  };
  (service as any).formResponseRepository = {
    create: async (data: any) => {
      capturedCreateInput = data;
      return data;
    },
  };

  await service.execute({
    data: {
      formVersionId: 12,
      projetoId: 1,
      status: FormResponseStatus.COMPLETED,
      fields: {
        opiniao: "Educacao",
        [textareaFieldName]: "texto ascii para validar persistencia do campo textarea",
      },
    },
  });

  assert.ok(
    capturedCreateInput.fields.create.some(
      (field: any) =>
        field.fieldName === textareaFieldName &&
        field.value ===
          "texto ascii para validar persistencia do campo textarea"
    )
  );
  assert.ok(
    capturedCreateInput.fields.create.some(
      (field: any) =>
        field.fieldName === "texto_opiniao" &&
        field.value ===
          "texto ascii para validar persistencia do campo textarea"
    )
  );
});

test("CreateFormResponseService usa a data historica informada para createdAt e datas derivadas", async () => {
  const service = new CreateFormResponseService();
  let capturedCreateInput: any;

  (service as any).formVersionRepository = {
    findByIdWithForm: async () => ({
      id: 12,
      formId: 5,
      form: {
        id: 5,
        projetoId: 1,
      },
    }),
  };
  (service as any).formFieldRepository = {
    findByFormVersionId: async () => [],
  };
  (service as any).formResponseRepository = {
    create: async (data: any) => {
      capturedCreateInput = data;
      return data;
    },
  };

  const createdAt = new Date("2025-04-23T15:48:22.000Z");

  await service.execute({
    data: {
      formVersionId: 12,
      projetoId: 1,
      createdAt,
      status: FormResponseStatus.COMPLETED,
    },
  });

  assert.equal(capturedCreateInput.createdAt.toISOString(), createdAt.toISOString());
  assert.equal(capturedCreateInput.startedAt.toISOString(), createdAt.toISOString());
  assert.equal(
    capturedCreateInput.submittedAt.toISOString(),
    createdAt.toISOString()
  );
  assert.equal(
    capturedCreateInput.completedAt.toISOString(),
    createdAt.toISOString()
  );
});
