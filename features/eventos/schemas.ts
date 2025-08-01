import { z } from "zod";

export const eventoSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  description: z.string().optional(),
  type: z.string().optional(),
  bannerUrl: z.string().optional(),
  totalDays: z.number().min(1).optional(),
  startDate: z.string().min(1, "Início do evento obrigatório"),
  endDate: z.string().min(1, "Fim do evento obrigatório"),
  setupStartDate: z.string().optional(),
  setupEndDate: z.string().optional(),
  preparationStartDate: z.string().min(1, "Início da Evento obrigatório"),
  preparationEndDate: z.string().min(1, "Fim da Evento obrigatório"),
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
});

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
  email: z.string().email("E-mail inválido").optional(),
  phone: z.string().optional(),
  role: z.string().min(1, "Função obrigatória"),
  company: z.string().min(1, "Empresa obrigatória"),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  presenceConfirmed: z.boolean().optional(),
  certificateIssued: z.boolean().optional(),
  shirtSize: z.enum(["PP", "P", "M", "G", "GG", "XG", "XXG", "EXG"]).optional(),
  notes: z.string().optional(),
  photo: z.string().optional(),
  documentPhoto: z.string().optional(),
  validatedBy: z.string().optional(),
  daysWork: z.array(z.string()).optional(),
});

export type EventParticipantSchema = z.infer<typeof eventParticipantSchema>;

// Schemas para credenciais
export const credentialSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório"),
  cor: z.string().min(1, "Cor obrigatória"),
  id_events: z.string().min(1, "Evento obrigatório"),
  days_works: z.array(z.string()).min(1, "Pelo menos um dia de trabalho é obrigatório"),
  isActive: z.boolean().optional(),
  isDistributed: z.boolean().optional(),
});

export const credentialUpdateSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório").optional(),
  cor: z.string().min(1, "Cor obrigatória").optional(),
  id_events: z.string().min(1, "Evento obrigatório").optional(),
  days_works: z.array(z.string()).min(1, "Pelo menos um dia de trabalho é obrigatório").optional(),
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
