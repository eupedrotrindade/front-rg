import { apiClient } from "@/lib/api-client";
import { CreateEventWristbandRequest, EventWristband } from "../types";

export const createEventWristband = async (
  wristbandData: CreateEventWristbandRequest
): Promise<EventWristband | null> => {
  try {
    const { data } = await apiClient.post<EventWristband>(
      "/event-wristbands",
      wristbandData
    );
    return data;
  } catch (error) {
    console.error("Erro ao criar credencial:", error);
    return null;
  }
};

export const createEventWristbandsBulk = async (bulkData: {
  eventId: string;
  wristbands: Array<{
    code: string;
    label: string;
    credentialType?: string;
    color?: string;
  }>;
  performedBy: string;
}): Promise<EventWristband[] | null> => {
  try {
    const { data } = await apiClient.post<EventWristband[]>(
      "/event-wristbands/bulk",
      bulkData
    );
    return data;
  } catch (error) {
    console.error("Erro ao criar credenciais em lote:", error);
    return null;
  }
};
