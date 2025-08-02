export interface MovementCredential {
    id: string;
    event_id: string;
    participant_id: string;
    code: string;
    history_code: string[];
    credentials_id?: string;
    created_at: string;
    updated_at: string;
    event_participants?: {
        id: string;
        name: string;
        cpf: string;
        role: string;
        company: string;
    };
    credentials?: {
        id: string;
        nome: string;
        cor: string;
    };
}

export interface CreateMovementCredentialRequest {
    eventId: string;
    participantId: string;
    code: string;
    credentialsId?: string;
}

export interface UpdateMovementCredentialRequest {
    code: string;
    credentialsId?: string;
}

export interface MovementCredentialResponse {
    data: MovementCredential;
    message?: string;
}

export interface MovementCredentialsListResponse {
    data: MovementCredential[];
} 