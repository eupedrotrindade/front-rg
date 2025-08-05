export type Event = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  type?: string;
  bannerUrl?: string;
  totalDays?: number;
  startDate: string;
  endDate: string;
  setupStartDate?: string;
  setupEndDate?: string;
  preparationStartDate?: string;
  preparationEndDate?: string;
  finalizationStartDate?: string;
  finalizationEndDate?: string;
  venue: string;
  address?: string;
  status: "active" | "closed" | "canceled" | "draft";
  visibility: "public" | "private" | "restricted";
  categories?: string[];
  capacity?: number;
  registrationLink?: string;
  qrCodeTemplate?: "default" | "custom";
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type EventManager = {
  id: string;
  eventId: string;
  idClerk?: string;
  name: string;
  cpf?: string;
  email?: string;
  phone?: string;
  profilePicture?: string;
  password: string;
  permissions?: "admin" | "manager" | "editor" | "viewer";
  createdAt?: string;
  updatedAt?: string;
};

export type EventStaff = {
  id: string;
  eventId: string;
  name: string;
  cpf?: string;
  email?: string;
  phone?: string;
  profilePicture?: string;
  password: string;
  permissions?: "admin" | "manager" | "editor" | "viewer";
  supervisorName?: string;
  supervisorCpf?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type EventWristband = {
  id: string;
  code: string;
  wristbandModelId: string;
  isActive?: boolean;
  isDistributed?: boolean;
};

// Novo tipo para credenciais independentes por dia
export type Credential = {
  id: string;
  nome: string;
  cor: string;
  id_events: string;
  days_works: string[];
  isActive?: boolean;
  isDistributed?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateCredentialRequest = {
  nome: string;
  cor: string;
  id_events: string;
  days_works: string[];
  isActive?: boolean;
  isDistributed?: boolean;
};

export type UpdateCredentialRequest = Partial<CreateCredentialRequest>;

export type EventParticipant = {
  id: string;
  eventId: string;
  credentialId?: string; // Novo campo para referenciar a credencial
  wristbandId?: string; // Mantido para compatibilidade
  staffId?: string;
  name: string;
  cpf: string;
  email?: string;
  phone?: string;
  role?: string;
  company: string;
  checkIn?: string;
  checkOut?: string;
  presenceConfirmed?: boolean;
  certificateIssued?: boolean;
  shirtSize?: "PP" | "P" | "M" | "G" | "GG" | "XG" | "XXG" | "EXG";
  notes?: string;
  photo?: string;
  documentPhoto?: string;
  validatedBy?: string;
  daysWork?: string[];
};

export type EventHistory = {
  id: string;
  entityType: "event" | "participant" | "manager" | "staff" | "wristband";
  entityId: string;
  action: "created" | "updated" | "deleted";
  performedBy: string;
  timestamp?: string;
  description?: string;
};

export type Coordenador = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  imageUrl: string;
  createdAt: string;
  metadata: {
    eventos?: Array<{
      role: string;
      id: string;
      nome_evento: string;
    }>;
  };
};

// Tipos para requisições
export type CreateEventRequest = {
  slug?: string;
  name: string;
  description?: string;
  type?: string;
  bannerUrl?: string;
  totalDays?: number;
  startDate: string;
  endDate: string;
  setupStartDate?: string;
  setupEndDate?: string;
  preparationStartDate?: string;
  preparationEndDate?: string;
  finalizationStartDate?: string;
  finalizationEndDate?: string;
  venue: string;
  address?: string;
  status: "active" | "closed" | "canceled" | "draft";
  visibility: "public" | "private" | "restricted";
  categories?: string[];
  capacity?: number;
  registrationLink?: string;
  qrCodeTemplate?: "default" | "custom";
  isActive?: boolean;
  performedBy?: string;
};

export type UpdateEventRequest = Partial<CreateEventRequest>;

export type CreateEventManagerRequest = {
  eventId: string;
  idClerk?: string;
  name: string;
  cpf?: string;
  email?: string;
  phone?: string;
  profilePicture?: string;
  password: string;
  permissions?: "admin" | "manager" | "editor" | "viewer";
};

export type CreateEventStaffRequest = {
  eventId: string;
  name: string;
  cpf?: string;
  email?: string;
  phone?: string;
  profilePicture?: string;
  password: string;
  permissions?: "admin" | "manager" | "editor" | "viewer";
  supervisorName?: string;
  supervisorCpf?: string;
};

export type CreateEventWristbandRequest = {
  eventId: string;
  code: string;
  label?: string;
  credentialType?: string;
  color?: string;
  isActive?: boolean;
  isDistributed?: boolean;
};

export type CreateEventParticipantRequest = {
  eventId: string;
  credentialId?: string; // Novo campo para credenciais
  wristbandId?: string; // Mantido para compatibilidade
  staffId?: string;
  name: string;
  cpf: string;
  email?: string;
  phone?: string;
  role?: string;
  company: string;
  checkIn?: string;
  checkOut?: string;
  presenceConfirmed?: boolean;
  certificateIssued?: boolean;
  shirtSize?: "PP" | "P" | "M" | "G" | "GG" | "XG" | "XXG" | "EXG";
  notes?: string;
  photo?: string;
  documentPhoto?: string;
  validatedBy?: string;
  daysWork?: string[];
};

// Tipos para respostas da API
export type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type PaginationParams = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type Empresa = {
  id: string;
  nome: string;
  id_evento?: string;
  days?: string[];
  cnpj?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  responsavel?: string;
  observacoes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateEmpresaRequest = {
  nome: string;
  id_evento?: string;
  days?: string[];
  cnpj?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  responsavel?: string;
  observacoes?: string;
};

export type UpdateEmpresaRequest = Partial<CreateEmpresaRequest>;

export type EmpresaEvento = {
  id: string;
  empresaId: string;
  eventoId: string;
  empresa: Empresa;
  evento: Event;
  createdAt: string;
  updatedAt: string;
};

export type CreateEmpresaEventoRequest = {
  empresaId: string;
  eventoId: string;
};

export interface EventAttendance {
  id: string;
  participantId: string;
  eventId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  validatedBy: string | null;
  notes: string | null;
  performedBy: string;
  createdAt: string;
  updatedAt: string;
  participant?: {
    id: string;
    name: string;
    cpf: string;
    role: string;
    company: string;
  };
}

export interface EventAttendanceListResponse {
  data: EventAttendance[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface EventAttendanceStats {
  totalChecks: number;
  totalCheckIns: number;
  totalCheckOuts: number;
  averageCheckInTime: string | null;
  averageCheckOutTime: string | null;
  checksByDate: {
    date: string;
    checkIns: number;
    checkOuts: number;
  }[];
}

export interface ImportRequest {
  id: string;
  eventId: string;
  empresaId: string;
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  status: "pending" | "approved" | "rejected" | "completed";
  requestedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  data: Array<{
    cpf: string;
    nome: string;
    funcao: string;
    empresa: string;
    credencial: string;
  }>;
  errors: Array<{ item: Record<string, unknown>; error: string; row: number }>;
  duplicates: Array<{
    item: Record<string, unknown>;
    existing: Record<string, unknown>;
    row: number;
  }>;
  missingCredentials: Array<{ name: string; count: number }>;
  missingCompanies: Array<{ name: string; count: number }>;
  createdAt: string;
  updatedAt?: string;
  empresa?: { nome: string };
  event?: { name: string };
}

export interface CreateImportRequestRequest {
  eventId: string;
  empresaId: string;
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  data: Array<{
    cpf: string;
    nome: string;
    funcao: string;
    empresa: string;
    credencial: string;
  }>;
  errors: Array<{ item: Record<string, unknown>; error: string; row: number }>;
  duplicates: Array<{
    item: Record<string, unknown>;
    existing: Record<string, unknown>;
    row: number;
  }>;
  missingCredentials: Array<{ name: string; count: number }>;
  missingCompanies: Array<{ name: string; count: number }>;
  requestedBy: string;
}

export interface ApproveImportRequestRequest {
  approvedBy: string;
}

export interface RejectImportRequestRequest {
  approvedBy: string;
  reason: string;
}
