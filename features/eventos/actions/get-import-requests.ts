import { apiClient } from "@/lib/api-client";
import type { ImportRequest } from "../types";

interface ImportRequestAPIResponse {
  id: string;
  event_id: string;
  empresa_id: string;
  file_name: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  status: string;
  requested_by: string;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
  data: unknown[];
  errors: unknown[];
  duplicates: unknown[];
  missing_credentials: unknown[];
  missing_companies: unknown[];
  created_at: string;
  updated_at?: string;
  empresas?: { nome: string };
  events?: { name: string };
}

export const getImportRequestsByEvent = async (
  eventId: string
): Promise<ImportRequest[]> => {
  try {
    const response = await apiClient.get(`/import-requests/event/${eventId}`);

    // Transformar dados de snake_case para camelCase
    const transformedData = response.data.map(
      (item: ImportRequestAPIResponse) => {
        const transformed = {
          id: item.id,
          eventId: item.event_id,
          empresaId: item.empresa_id,
          fileName: item.file_name,
          totalRows: item.total_rows,
          validRows: item.valid_rows,
          invalidRows: item.invalid_rows,
          duplicateRows: item.duplicate_rows,
          status: item.status,
          requestedBy: item.requested_by,
          approvedBy: item.approved_by,
          approvedAt: item.approved_at,
          notes: item.notes,
          data: item.data,
          errors: item.errors,
          duplicates: item.duplicates,
          missingCredentials: item.missing_credentials,
          missingCompanies: item.missing_companies,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          empresa: item.empresas,
          event: item.events,
        };

        return transformed;
      }
    );

    return transformedData;
  } catch (error) {
    console.error("Erro ao buscar solicitações de importação:", error);
    throw new Error("Erro ao buscar solicitações de importação");
  }
};

export const getAllImportRequests = async (): Promise<ImportRequest[]> => {
  try {
    const response = await apiClient.get("/import-requests");

    // Transformar dados de snake_case para camelCase
    const transformedData = response.data.map(
      (item: ImportRequestAPIResponse) => {
        const transformed = {
          id: item.id,
          eventId: item.event_id,
          empresaId: item.empresa_id,
          fileName: item.file_name,
          totalRows: item.total_rows,
          validRows: item.valid_rows,
          invalidRows: item.invalid_rows,
          duplicateRows: item.duplicate_rows,
          status: item.status,
          requestedBy: item.requested_by,
          approvedBy: item.approved_by,
          approvedAt: item.approved_at,
          notes: item.notes,
          data: item.data,
          errors: item.errors,
          duplicates: item.duplicates,
          missingCredentials: item.missing_credentials,
          missingCompanies: item.missing_companies,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          empresa: item.empresas,
          event: item.events,
        };

        return transformed;
      }
    );

    return transformedData;
  } catch (error) {
    console.error("Erro ao buscar todas as solicitações de importação:", error);
    throw new Error("Erro ao buscar solicitações de importação");
  }
};

export const getImportRequestsByEmpresa = async (
  empresaId: string
): Promise<ImportRequest[]> => {
  try {
    const response = await apiClient.get(
      `/import-requests/empresa/${empresaId}`
    );

    // Transformar dados de snake_case para camelCase
    const transformedData = response.data.map(
      (item: ImportRequestAPIResponse) => {
        const transformed = {
          id: item.id,
          eventId: item.event_id,
          empresaId: item.empresa_id,
          fileName: item.file_name,
          totalRows: item.total_rows,
          validRows: item.valid_rows,
          invalidRows: item.invalid_rows,
          duplicateRows: item.duplicate_rows,
          status: item.status,
          requestedBy: item.requested_by,
          approvedBy: item.approved_by,
          approvedAt: item.approved_at,
          notes: item.notes,
          data: item.data,
          errors: item.errors,
          duplicates: item.duplicates,
          missingCredentials: item.missing_credentials,
          missingCompanies: item.missing_companies,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          empresa: item.empresas,
          event: item.events,
        };

        return transformed;
      }
    );

    return transformedData;
  } catch (error) {
    console.error(
      "Erro ao buscar solicitações de importação da empresa:",
      error
    );
    throw new Error("Erro ao buscar solicitações de importação da empresa");
  }
};
