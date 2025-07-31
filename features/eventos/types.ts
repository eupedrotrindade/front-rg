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

export type EventParticipant = {
  id: string;
  eventId: string;
  wristbandId: string;
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
  wristbandId: string;
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
