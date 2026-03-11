import * as Z from "zod";

export const dateInputSchema = Z.union([Z.string().trim().min(1), Z.date()]).superRefine(
  (value, ctx) => {
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        ctx.addIssue({
          code: Z.ZodIssueCode.custom,
          message: "Data invalida",
        });
      }
      return;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      ctx.addIssue({
        code: Z.ZodIssueCode.custom,
        message: "Data invalida",
      });
    }
  }
);
