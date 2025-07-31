import { apiClient } from "@/lib/api-client";
import { CreateEmpresaRequest, UpdateEmpresaRequest, Empresa } from "../types";

export const createEmpresa = async (data: CreateEmpresaRequest): Promise<Empresa | null> => {
  try {
    console.log("🔍 Criando empresa:", data);
    const response = await apiClient.post<Empresa>("/empresas", data);
    console.log("📦 Resposta da API (criar empresa):", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Erro ao criar empresa:", error);
    throw error;
  }
};

export const updateEmpresa = async (id: string, data: UpdateEmpresaRequest): Promise<Empresa | null> => {
  try {
    console.log("🔍 Atualizando empresa:", { id, data });
    const response = await apiClient.put<Empresa>(`/empresas/${id}`, data);
    console.log("📦 Resposta da API (atualizar empresa):", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Erro ao atualizar empresa:", error);
    throw error;
  }
};

export const deleteEmpresa = async (id: string): Promise<boolean> => {
  try {
    console.log("🔍 Deletando empresa:", id);
    await apiClient.delete(`/empresas/${id}`);
    console.log("✅ Empresa deletada com sucesso");
    return true;
  } catch (error) {
    console.error("❌ Erro ao deletar empresa:", error);
    throw error;
  }
};

export const vincularEmpresaEvento = async (empresaId: string, eventoId: string): Promise<boolean> => {
  try {
    console.log("🔍 Vinculando empresa ao evento:", { empresaId, eventoId });
    await apiClient.post("/empresas/event", {
      empresaId,
      eventoId,
    });
    console.log("✅ Empresa vinculada ao evento com sucesso");
    return true;
  } catch (error) {
    console.error("❌ Erro ao vincular empresa ao evento:", error);
    throw error;
  }
};

export const desvincularEmpresaEvento = async (empresaId: string, eventoId: string): Promise<boolean> => {
  try {
    console.log("🔍 Desvinculando empresa do evento:", { empresaId, eventoId });
    await apiClient.delete(`/empresas/event/${empresaId}/${eventoId}`);
    console.log("✅ Empresa desvinculada do evento com sucesso");
    return true;
  } catch (error) {
    console.error("❌ Erro ao desvincular empresa do evento:", error);
    throw error;
  }
}; 