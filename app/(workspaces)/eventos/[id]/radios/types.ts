// Tipos para a nova estrutura de rádios com dias específicos

export interface RadioAssignment {
  id: string;
  event_id: string;
  event_day: string; // formato: dd/mm/yyyy
  assigned_to: string;
  contact?: string;
  radio_codes: string[];
  status: "ativo" | "devolvido" | "parcial";
  assigned_by?: string;
  assigned_at: string;
  returned_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RadioOperation {
  id: string;
  assignment_id: string;
  operation_type:
    | "retirada"
    | "devolucao_total"
    | "devolucao_parcial"
    | "troca";
  radio_codes: string[];
  old_radio_codes?: string[];
  new_radio_codes?: string[];
  performed_by?: string;
  performed_at: string;
  notes?: string;
}

export interface CreateRadioAssignmentData {
  event_id: string;
  event_day: string;
  assigned_to: string;
  contact?: string;
  radio_codes: string[];
  assigned_by?: string;
  notes?: string;
}

export interface UpdateRadioAssignmentData {
  status?: "ativo" | "devolvido" | "parcial";
  radio_codes?: string[];
  returned_at?: string;
  notes?: string;
}

export interface PartialReturnData {
  assignment_id: string;
  returned_radio_codes: string[];
  performed_by?: string;
  notes?: string;
}

export interface RadioExchangeData {
  assignment_id: string;
  old_radio_codes: string[];
  new_radio_codes: string[];
  performed_by?: string;
  notes?: string;
}

export interface AvailableRadiosResponse {
  data: string[];
}

export interface RadioAssignmentListResponse {
  data: RadioAssignment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface RadioOperationsResponse {
  data: RadioOperation[];
}

// Tipos para filtros e queries
export interface RadioAssignmentFilters {
  eventId?: string;
  eventDay?: string;
  status?: "ativo" | "devolvido" | "parcial";
  page?: number;
  limit?: number;
  search?: string;
}

// Tipos para componentes da interface
export interface RadioAssignmentDisplay extends RadioAssignment {
  // Campos calculados para exibição
  isActive: boolean;
  isReturned: boolean;
  isPartiallyReturned: boolean;
  activeRadioCodes: string[];
  returnedRadioCodes: string[];
  operations: RadioOperation[];
}

// Tipos para formulários
export interface NewAssignmentForm {
  assigned_to: string;
  contact?: string;
  radio_codes: string[];
  notes?: string;
}

export interface PartialReturnForm {
  returned_radio_codes: string[];
  notes?: string;
}

export interface ExchangeForm {
  old_radio_codes: string[];
  new_radio_codes: string[];
  notes?: string;
}
