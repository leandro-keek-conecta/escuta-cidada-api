import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import AppError from "@/common/errors/AppError";
import { SubmitPublicFormResponseService } from "@/modules/form/services/SubmitPublicFormResponseService";

test("SubmitPublicFormResponseService resolve projeto e versao ativa pela URL", async () => {
  const service = new SubmitPublicFormResponseService(
    {
      getPublicFormBySlug: async () => ({
        projeto: {
          id: 5,
          slug: "ale-cmjp",
          name: "ALE CMJP",
          corHex: null,
        },
        form: {
          id: 9,
          name: "Formulario de Opiniao",
          description: null,
        },
        activeVersion: {
          id: 12,
          version: 3,
          schema: {},
          fields: [],
        },
      }),
    } as any,
    {
      execute: async ({ data }: any) => data,
    } as any
  );

  const result = (await service.executeBySlug({
    projetoSlug: "ale-cmjp",
    formSlug: "formulario-de-opiniao",
    requestIp: "127.0.0.1",
    requestUserAgent: "Mozilla/5.0",
    data: {
      fields: {
        nome: "Leandro",
        opiniao: "Saude",
      },
      source: "public-form",
      channel: "web",
    },
  })) as any;

  assert.equal(result.projetoId, 5);
  assert.equal(result.formVersionId, 12);
  assert.equal(result.ip, "127.0.0.1");
  assert.equal(result.userAgent, "Mozilla/5.0");
  assert.deepEqual(result.fields, {
    nome: "Leandro",
    opiniao: "Saude",
  });
});

test("SubmitPublicFormResponseService rejeita formVersionId diferente da versao ativa", async () => {
  const service = new SubmitPublicFormResponseService(
    {
      getPublicFormBySlug: async () => ({
        projeto: {
          id: 5,
          slug: "ale-cmjp",
          name: "ALE CMJP",
          corHex: null,
        },
        form: {
          id: 9,
          name: "Formulario de Opiniao",
          description: null,
        },
        activeVersion: {
          id: 12,
          version: 3,
          schema: {},
          fields: [],
        },
      }),
    } as any,
    {
      execute: async ({ data }: any) => data,
    } as any
  );

  await assert.rejects(
    service.executeBySlug({
      projetoSlug: "ale-cmjp",
      formSlug: "formulario-de-opiniao",
      data: {
        formVersionId: 99,
        fields: {
          nome: "Leandro",
        },
      },
    }),
    (error: unknown) =>
      error instanceof AppError && error.statusCode === 422
  );
});
