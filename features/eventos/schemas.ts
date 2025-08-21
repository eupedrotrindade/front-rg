import { z } from "zod";

// Schema para EventDay
const eventDaySchema = z.object({
  date: z.string().datetime("Formato de data e hora inválido"), // ISO datetime
  start: z.boolean(),
  end: z.boolean(),
});

export const eventoSchema = z
  .object({
    name: z.string().min(1, "Nome obrigatório"),
    description: z.string().optional(),
    type: z.string().optional(),
    bannerUrl: z.string().optional(),
    totalDays: z.number().min(1).optional(),
    startDate: z.string().optional(), // Será calculado automaticamente
    endDate: z.string().optional(), // Será calculado automaticamente

    // Nova estrutura de dias por fase
    montagem: z.array(eventDaySchema).default([]),
    evento: z.array(eventDaySchema).default([]),
    desmontagem: z.array(eventDaySchema).default([]),

    // Campos antigos para compatibilidade (opcionais)
    setupStartDate: z.string().optional(),
    setupEndDate: z.string().optional(),
    preparationStartDate: z.string().optional(),
    preparationEndDate: z.string().optional(),
    finalizationStartDate: z.string().optional(),
    finalizationEndDate: z.string().optional(),

    venue: z.string().min(1, "Local obrigatório"),
    address: z.string().optional(),
    status: z.enum(["active", "closed", "canceled", "draft"]).default("draft"),
    visibility: z.enum(["public", "private", "restricted"]).default("public"),
    categories: z.array(z.string()).optional(),
    capacity: z.number().min(1).optional(),
    registrationLink: z.string().optional(),
    qrCodeTemplate: z.enum(["default", "custom"]).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // Validação customizada: pelo menos uma fase deve ter dias
      const hasMontagemDays = data.montagem.length > 0;
      const hasEventoDays = data.evento.length > 0;
      const hasDesmontagemDays = data.desmontagem.length > 0;

      return hasMontagemDays || hasEventoDays || hasDesmontagemDays;
    },
    {
      message: "Pelo menos uma fase deve ter dias definidos",
      path: ["evento"], // Apontar erro para o campo evento
    }
  );

export type EventoSchema = z.infer<typeof eventoSchema>;

export const eventManagerSchema = z.object({
  eventId: z.string().min(1, "Evento obrigatório"),
  idClerk: z.string().optional(),
  name: z.string().min(1, "Nome obrigatório"),
  cpf: z.string().optional(),
  email: z.string().email("E-mail inválido").optional(),
  phone: z.string().optional(),
  profilePicture: z.string().optional(),
  password: z.string().min(6, "Senha obrigatória"),
  permissions: z
    .enum(["admin", "manager", "editor", "viewer"])
    .default("viewer"),
});

export type EventManagerSchema = z.infer<typeof eventManagerSchema>;

export const eventManagerUpdateSchema = z.object({
  eventId: z.string().min(1, "Evento obrigatório"),
  idClerk: z.string().optional(),
  name: z.string().min(1, "Nome obrigatório"),
  cpf: z.string().optional(),
  email: z.string().email("E-mail inválido").optional(),
  phone: z.string().optional(),
  profilePicture: z.string().optional(),
  password: z.string().min(6, "Senha obrigatória").optional(),
  permissions: z
    .enum(["admin", "manager", "editor", "viewer"])
    .default("viewer"),
});

export type EventManagerUpdateSchema = z.infer<typeof eventManagerUpdateSchema>;

export const eventStaffSchema = z.object({
  eventId: z.string().min(1, "Evento obrigatório"),
  name: z.string().min(1, "Nome obrigatório"),
  cpf: z.string().optional(),
  email: z.string().email("E-mail inválido").optional(),
  phone: z.string().optional(),
  profilePicture: z.string().optional(),
  password: z.string().min(6, "Senha obrigatória"),
  permissions: z
    .enum(["admin", "manager", "editor", "viewer"])
    .default("viewer"),
  supervisorName: z.string().optional(),
  supervisorCpf: z.string().optional(),
});

export type EventStaffSchema = z.infer<typeof eventStaffSchema>;

export const eventWristbandSchema = z.object({
  code: z.string().min(1, "Código obrigatório"),
  wristbandModelId: z.string().min(1, "Modelo de pulseira obrigatório"),
  isActive: z.boolean().optional(),
  isDistributed: z.boolean().optional(),
});

export type EventWristbandSchema = z.infer<typeof eventWristbandSchema>;

export const eventParticipantSchema = z.object({
  eventId: z.string().min(1, "Evento obrigatório"),
  credentialId: z.string().optional(), // Novo campo para credenciais
  wristbandId: z.string().optional(), // Mantido para compatibilidade
  staffId: z.string().optional(),
  name: z.string().min(1, "Nome obrigatório"),
  cpf: z.string().min(11, "CPF obrigatório"),
  email: z
    .union([z.string().email("E-mail inválido"), z.literal(""), z.undefined()])
    .optional(),
  phone: z.union([z.string(), z.literal(""), z.undefined()]).optional(),
  role: z.string().optional(),
  company: z.string().min(1, "Empresa obrigatória"),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  presenceConfirmed: z.boolean().optional(),
  certificateIssued: z.boolean().optional(),
  shirtSize: z
    .union([
      z.enum(["PP", "P", "M", "G", "GG", "XG", "XXG", "EXG"]),
      z.literal(""),
      z.undefined(),
    ])
    .optional(),
  notes: z.string().optional(),
  photo: z.string().optional(),
  documentPhoto: z.string().optional(),
  validatedBy: z.string().optional(),
  daysWork: z.array(z.string()).optional(),
  // Novos campos para controle de turnos e períodos
  workDate: z.string().optional(),
  workStage: z.string().optional(),
  workPeriod: z.string().optional(),

  shiftId: z.string().optional(), // ID do turno/shift específico
});

export type EventParticipantSchema = z.infer<typeof eventParticipantSchema>;

// Schemas para credenciais
export const credentialSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório"),
  cor: z.string().min(1, "Cor obrigatória"),
  id_events: z.string().min(1, "Evento obrigatório"),
  days_works: z.array(z.string()).refine((days) => {
    // Filtrar valores undefined/null e verificar se há pelo menos um dia válido
    const validDays = days.filter((day) => day && day.trim().length > 0);
    return validDays.length > 0;
  }, "Pelo menos um dia de trabalho válido é obrigatório"),
  isActive: z.boolean().optional(),
  isDistributed: z.boolean().optional(),
});

export const credentialUpdateSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório").optional(),
  cor: z.string().min(1, "Cor obrigatória").optional(),
  id_events: z.string().min(1, "Evento obrigatório").optional(),
  days_works: z
    .array(z.string())
    .refine((days) => {
      // Se o array não foi fornecido (opcional), é válido
      if (!days) return true;
      // Se fornecido, deve ter pelo menos um dia válido
      const validDays = days.filter((day) => day && day.trim().length > 0);
      return validDays.length > 0;
    }, "Pelo menos um dia de trabalho válido é obrigatório")
    .optional(),
  isActive: z.boolean().optional(),
  isDistributed: z.boolean().optional(),
});

export type CredentialSchema = z.infer<typeof credentialSchema>;
export type CredentialUpdateSchema = z.infer<typeof credentialUpdateSchema>;

export const eventHistorySchema = z.object({
  entityType: z.enum(["event", "participant", "manager", "staff", "wristband"]),
  entityId: z.string().min(1, "ID da entidade obrigatório"),
  action: z.enum(["created", "updated", "deleted"]),
  performedBy: z.string().min(1, "Usuário obrigatório"),
  description: z.string().optional(),
});

export type EventHistorySchema = z.infer<typeof eventHistorySchema>;
