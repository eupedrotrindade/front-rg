export type EventStatus = "active" | "closed" | "canceled" | "draft";
export type EventVisibility = "public" | "private" | "restricted";
export type EventPermission = "admin" | "manager" | "editor" | "viewer";
export type ActionType = "created" | "updated" | "deleted";
export type ShirtSize = "PP" | "P" | "M" | "G" | "GG" | "XG" | "XXG" | "EXG";

export interface ActionHistory {
  action: ActionType;
  performedBy: string; // user ID, email or name
  timestamp: string | Date;
  description?: string;
}

export interface Event {
  id: string;
  slug?: string;
  name: string;
  description?: string;
  bannerUrl: string;
  totalDays: number;
  startDate: string | Date;
  endDate: string | Date;
  venue: string;
  address?: string;
  status: EventStatus;
  visibility?: EventVisibility;
  categories?: string[];
  capacity?: number;
  registrationLink?: string;
  qrCodeTemplate?: "default" | "custom";
  isActive?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  history: ActionHistory[];
  managers: EventManager[];
  staff: EventStaff[];
  participants: EventParticipant[];
}

export interface EventManager {
  idClerk?: string;
  name: string;
  cpf?: string;
  email?: string;
  phone?: string;
  profilePicture?: string;
  password: string;
  permissions?: EventPermission;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  history?: ActionHistory[];
}

export interface EventStaff {
  id: string;
  name: string;
  cpf?: string;
  email?: string;
  phone?: string;
  profilePicture?: string;
  password: string;
  permissions?: EventPermission;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  history?: ActionHistory[];
  supervisor: {
    name: string;
    cpf: string;
  };
}

export interface EventParticipant {
  id?: string;
  name: string;
  cpf: string;
  email?: string;
  phone?: string;
  role: string;
  company: string;
  wristband: EventWristband;
  checkIn: string | Date;
  checkOut: string | Date;
  presenceConfirmed?: boolean;
  certificateIssued?: boolean;
  shirtSize?: ShirtSize;
  notes?: string;
  photo?: string;
  documentPhoto?: string;
  validatedBy?: string;
  responsibleStaff: EventStaff;
  history?: ActionHistory[];
  daysWork?: string[];
}

export interface EventWristband {
  id?: string;
  code: string;
  label: string;
  credentialType: string;
  color?: string;
  isActive?: boolean;
  isDistributed?: boolean;
  history?: ActionHistory[];
}

//gerentes -> coordenador
//staff -> operador
//participantes -> staff geral
