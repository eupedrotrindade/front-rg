import apiClient from "@/lib/api-client";
import type {
  MovementCredential,
  CreateMovementCredentialRequest,
  UpdateMovementCredentialRequest,
  MovementCredentialResponse,
  MovementCredentialsListResponse,
} from "@/app/utils/interfaces/movement-credentials";

// Buscar movimentação de credenciais
export const getMovementCredentials = async (params?: {
  eventId?: string;
  participantId?: string;
  code?: string;
}): Promise<MovementCredentialsListResponse> => {
  const queryParams = new URLSearchParams();

  if (params?.eventId) queryParams.append("eventId", params.eventId);
  if (params?.participantId)
    queryParams.append("participantId", params.participantId);
  if (params?.code) queryParams.append("code", params.code);

  const response = await apiClient.get(
    `/movement-credentials?${queryParams.toString()}`
  );
  return response.data;
};

// Buscar movimentação específica por ID
export const getMovementCredential = async (
  id: string
): Promise<MovementCredentialResponse> => {
  const response = await apiClient.get(`/movement-credentials/${id}`);
  return response.data;
};

// Criar nova movimentação de credencial
export const createMovementCredential = async (
  data: CreateMovementCredentialRequest
): Promise<MovementCredentialResponse> => {
  const response = await apiClient.post("/movement-credentials", data);
  return response.data;
};

// Atualizar movimentação de credencial
export const updateMovementCredential = async (
  id: string,
  data: UpdateMovementCredentialRequest
): Promise<MovementCredentialResponse> => {
  const response = await apiClient.put(`/movement-credentials/${id}`, data);
  return response.data;
};

// Deletar movimentação de credencial
export const deleteMovementCredential = async (
  id: string
): Promise<{ message: string }> => {
  const response = await apiClient.delete(`/movement-credentials/${id}`);
  return response.data;
};

// Buscar movimentação por participante e evento
export const getMovementCredentialByParticipant = async (
  eventId: string,
  participantId: string
): Promise<MovementCredentialResponse | null> => {
  try {
    const response = await getMovementCredentials({ eventId, participantId });
    return response.data.length > 0 ? { data: response.data[0] } : null;
  } catch (error) {
    console.error("Erro ao buscar movimentação por participante:", error);
    return null;
  }
};

// Trocar código de pulseira
export const changeCredentialCode = async (
  eventId: string,
  participantId: string,
  newCode: string,
  credentialsId?: string
): Promise<MovementCredentialResponse> => {
  try {
    // Buscar registro existente de movement_credential para o participante
    const existingMovement = await getMovementCredentialByParticipant(eventId, participantId);

    if (existingMovement?.data) {
      // Se já existe um registro, atualizar movendo o código antigo para history_code
      const updateData: UpdateMovementCredentialRequest = {
        code: newCode,
        history_code: existingMovement.data.code, // Salvar código antigo no histórico
        credentialsId,
      };
      
      return await updateMovementCredential(existingMovement.data.id, updateData);
    } else {
      // Se não existe registro, criar um novo
      return await createMovementCredential({
        eventId,
        participantId,
        code: newCode,
        credentialsId,
      });
    }
  } catch (error) {
    console.error("Erro ao trocar código de pulseira:", error);
    // Fallback: tentar criar um novo registro
    return await createMovementCredential({
      eventId,
      participantId,
      code: newCode,
      credentialsId,
    });
  }
};
