import { apiClient } from "@/lib/api-client";
import {
  Radio,
  CreateRadioData,
  UpdateRadioData,
  RadioListResponse,
  RadioFilters,
} from "../types";

export const getRadios = async (
  filters?: RadioFilters
): Promise<RadioListResponse | null> => {
  try {
    console.log("🔍 Buscando rádios com filtros:", filters);
    const { data } = await apiClient.get<RadioListResponse>("/radios", {
      params: filters,
    });
    console.log("📦 Resposta da API (rádios):", data);
    return data;
  } catch (error) {
    console.error("❌ Erro ao buscar rádios:", error);
    return null;
  }
};

export const getRadio = async (id: string): Promise<Radio | null> => {
  try {
    const { data } = await apiClient.get<Radio>(`/radios/${id}`);
    return data;
  } catch (error) {
    console.error("❌ Erro ao buscar rádio:", error);
    return null;
  }
};

export const createRadio = async (
  radioData: CreateRadioData
): Promise<Radio | null> => {
  try {
    console.log("🔧 Criando rádio:", radioData);
    const { data } = await apiClient.post<Radio>("/radios", radioData);
    console.log("✅ Rádio criado:", data);
    return data;
  } catch (error) {
    console.error("❌ Erro ao criar rádio:", error);
    return null;
  }
};

export const updateRadio = async (
  id: string,
  radioData: UpdateRadioData
): Promise<Radio | null> => {
  try {
    console.log("🔧 Atualizando rádio:", { id, radioData });
    const { data } = await apiClient.put<Radio>(`/radios/${id}`, radioData);
    console.log("✅ Rádio atualizado:", data);
    return data;
  } catch (error) {
    console.error("❌ Erro ao atualizar rádio:", error);
    return null;
  }
};

export const deleteRadio = async (id: string): Promise<boolean> => {
  try {
    console.log("🗑️ Deletando rádio:", id);
    await apiClient.delete(`/radios/${id}`);
    console.log("✅ Rádio deletado com sucesso");
    return true;
  } catch (error) {
    console.error("❌ Erro ao deletar rádio:", error);
    return false;
  }
};
