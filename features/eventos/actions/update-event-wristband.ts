import { apiClient } from "@/lib/api-client";
import { EventWristband } from "../types";

export const updateEventWristband = async (
  id: string,
  wristbandData: Partial<EventWristband>
): Promise<EventWristband | null> => {
  try {
    const { data } = await apiClient.put<EventWristband>(
      `/event-wristbands/${id}`,
      wristbandData
    );
    return data;
  } catch (error) {
    console.error("Erro ao atualizar credencial:", error);
    return null;
  }
};

export const distributeEventWristband = async (
  id: string,
  data: { performedBy: string }
): Promise<EventWristband | null> => {
  try {
    const { data: wristband } = await apiClient.patch<EventWristband>(
      `/event-wristbands/${id}/distribute`,
      data
    );
    return wristband;
  } catch (error) {
    console.error("Erro ao distribuir credencial:", error);
    return null;
  }
};
