import { FormResponseStatus, Prisma, PrismaClient } from "@prisma/client";
import { buildResponseFieldData } from "../modules/FormResponse/utils/buildResponseFieldData";

const prisma = new PrismaClient();

type FieldMeta = {
  id: number;
  type?: string | null;
};

function buildFieldKey(formVersionId: number, fieldName: string) {
  return `${formVersionId}:${fieldName}`;
}

async function main() {
  const batchSize = Number(process.env.BACKFILL_BATCH_SIZE ?? 200);
  const dryRun = process.env.DRY_RUN === "true";

  const formFields = await prisma.formField.findMany({
    select: { id: true, formVersionId: true, name: true, type: true },
  });

  const fieldMap = new Map<string, FieldMeta>();
  formFields.forEach((field) => {
    fieldMap.set(buildFieldKey(field.formVersionId, field.name), {
      id: field.id,
      type: field.type,
    });
  });

  let lastId = 0;
  while (true) {
    const responses = await prisma.formResponse.findMany({
      where: { id: { gt: lastId } },
      orderBy: { id: "asc" },
      take: batchSize,
      include: {
        fields: {
          select: {
            id: true,
            fieldName: true,
            value: true,
            fieldId: true,
            valueNumber: true,
            valueBool: true,
            valueDate: true,
            valueJson: true,
          },
        },
      },
    });

    if (!responses.length) {
      break;
    }

    const operations: Prisma.PrismaPromise<unknown>[] = [];

    for (const response of responses) {
      const updateResponseData: Prisma.FormResponseUpdateInput = {};
      const hasFields = response.fields.length > 0;

      if (response.status !== FormResponseStatus.COMPLETED && hasFields) {
        updateResponseData.status = FormResponseStatus.COMPLETED;
      }

      if (response.startedAt > response.createdAt) {
        updateResponseData.startedAt = response.createdAt;
      }

      if (updateResponseData.status === FormResponseStatus.COMPLETED) {
        if (!response.submittedAt) {
          updateResponseData.submittedAt = response.createdAt;
        }
        if (!response.completedAt) {
          updateResponseData.completedAt = response.createdAt;
        }
      }

      if (Object.keys(updateResponseData).length > 0) {
        operations.push(
          prisma.formResponse.update({
            where: { id: response.id },
            data: updateResponseData,
          })
        );
      }

      for (const field of response.fields) {
        const fieldMeta = fieldMap.get(
          buildFieldKey(response.formVersionId, field.fieldName)
        );
        const normalized = buildResponseFieldData({
          fieldName: field.fieldName,
          value: field.value,
          fieldId: fieldMeta?.id,
          fieldDefinition: fieldMeta
            ? { name: field.fieldName, type: fieldMeta.type ?? undefined }
            : undefined,
        });

        const updateFieldData: Prisma.FormResponseFieldUpdateInput = {};

        if (!field.fieldId && normalized.fieldId) {
          updateFieldData.field = { connect: { id: normalized.fieldId } };
        }
        if (field.valueNumber === null && normalized.valueNumber !== undefined) {
          updateFieldData.valueNumber = normalized.valueNumber;
        }
        if (field.valueBool === null && normalized.valueBool !== undefined) {
          updateFieldData.valueBool = normalized.valueBool;
        }
        if (field.valueDate === null && normalized.valueDate !== undefined) {
          updateFieldData.valueDate = normalized.valueDate;
        }
        if (
          field.valueJson === null &&
          normalized.valueJson !== undefined &&
          normalized.valueJson !== null
        ) {
          updateFieldData.valueJson = normalized.valueJson;
        }

        if (Object.keys(updateFieldData).length > 0) {
          operations.push(
            prisma.formResponseField.update({
              where: { id: field.id },
              data: updateFieldData,
            })
          );
        }
      }
    }

    if (!dryRun && operations.length > 0) {
      await prisma.$transaction(operations);
    }

    lastId = responses[responses.length - 1].id;
    console.log(
      `[backfill] processed=${responses.length} up to id=${lastId} updates=${operations.length}`
    );
  }
}

main()
  .catch((error) => {
    console.error("[backfill] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
