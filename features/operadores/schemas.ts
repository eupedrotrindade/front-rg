import { z } from "zod";

export const operatorLoginSchema = z.object({
  cpf: z.string().min(11, "CPF obrigatório"),
  senha: z.string().min(1, "Senha obrigatória"),
});

export type OperatorLoginSchema = z.infer<typeof operatorLoginSchema>;
