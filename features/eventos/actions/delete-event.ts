import { apiClient } from "@/lib/api-client";

export const deleteEvent = async (
  id: string,
  performedBy: string
): Promise<boolean> => {
  try {
    console.log("🗑️ Tentando excluir evento:", { id, performedBy });

    const response = await fetch(`${apiClient.defaults.baseURL}/events`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id,
        performedBy,
      }),
    });

    console.log("✅ Evento excluído com sucesso:", response);
    return true;
  } catch (error) {
    console.error("❌ Erro ao deletar evento:", error);
    return false;
  }
};
