import { inject, injectable } from "inversify";
import { StatusCodes } from "http-status-codes";
import AppError from "@/common/errors/AppError";
import Types from "@/common/container/types";
import { IFormResponseRepository } from "../repositories/IFormResponseRepository";

import { CreateFormResponseInput } from "../http/validators/createFormResponseValidator";
import { createDynamicSchema } from "../utils/createDynamicSchema";
import { IFormVersionRepository } from "@/modules/FormVersion/repositories/IFormVersionRepository";

interface IRequest {
  data: CreateFormResponseInput; // Assumo que aqui tem { projetoId, formVersionId, fields: {...} }
}

@injectable()
export class CreateFormResponseService {
  @inject(Types.FormResponseRepository) private formResponseRepository!: IFormResponseRepository;
  @inject(Types.FormVersionRepository) private formVersionRepository!: IFormVersionRepository;

  public async execute({ data }: IRequest) {
    // 1. Buscar a DEFINIÇÃO (Schema) no repositório correto
    const formVersion = await this.formVersionRepository.findById(
      data.formVersionId
    );

    if (!formVersion) {
      throw new AppError(
        "Versão do formulário não encontrada",
        StatusCodes.NOT_FOUND
      );
    }

    // 2. Gerar o Schema Dinâmico
    const fieldsDefinition = formVersion.schema as any[];
    const dynamicSchema = createDynamicSchema(fieldsDefinition);

    // 3. Validar os dados
    // data.fields é o objeto cru vindo do front: { nome: "João", idade: "20" }
    const validationResult = dynamicSchema.safeParse(data.fields);

    if (!validationResult.success) {
      // Retorna erro 400 (Bad Request) com as mensagens detalhadas
      throw new AppError(
        JSON.stringify(validationResult.error.format()),
        StatusCodes.BAD_REQUEST
      );
    }

    const cleanData = validationResult.data;

    // 4. Preparar payload (Conversão Horizontal -> Vertical)
    const fieldsToCreate = Object.entries(cleanData).map(([key, value]) => {
      let strValue = String(value);
      if (value instanceof Date) strValue = value.toISOString();

      return {
        fieldName: key,
        value: strValue,
      };
    });

    // 5. Salvar usando Nested Write do Prisma
    // O create precisa receber a estrutura completa da tabela FormResponse
    try {
      return await this.formResponseRepository.create({
        projetoId: data.projetoId, // Aceito pelo Unchecked
        formVersionId: data.formVersionId, // Aceito pelo Unchecked
        fields: {
          create: fieldsToCreate, // O Unchecked TAMBÉM aceita nested writes!
        },
      });
    } catch (error) {
      console.error(error); // Logar o erro real para debug
      throw new AppError(
        "Erro ao salvar resposta no banco de dados",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }
}
