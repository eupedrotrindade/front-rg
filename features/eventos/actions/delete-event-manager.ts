import { apiClient } from "@/lib/api-client";

export const deleteEventManager = async (
  id: string,
  performedBy: string
): Promise<boolean> => {
  try {
    const response = await fetch(
      `${apiClient.defaults.baseURL}/event-managers`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          performedBy,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error("Erro ao deletar gerente:", error);
    return false;
  }
};
