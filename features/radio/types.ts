export type Radio = {
  id: string;
  codes: string[];
  status: "disponivel" | "retirado" | "manutencao";
  event_id: string;
  last_retirada_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateRadioData = {
  codes: string[];
  status: "disponivel" | "retirado" | "manutencao";
  event_id: string;
  last_retirada_id?: string | null;
};

export type UpdateRadioData = {
  codes?: string[];
  status?: "disponivel" | "retirado" | "manutencao";
  event_id?: string;
  last_retirada_id?: string | null;
};

export type RadioListResponse = {
  data: Radio[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

export type RadioFilters = {
  eventId?: string;
  status?: "disponivel" | "retirado" | "manutencao";
  page?: number;
  limit?: number;
  search?: string;
}; 