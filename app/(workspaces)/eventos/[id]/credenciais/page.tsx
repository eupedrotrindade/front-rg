"use client";

import { useState } from "react";
import { CredentialsDashboard } from "@/features/eventos/components/credentials-dashboard";
import { CredentialEditDialog } from "@/features/eventos/components/credential-edit-dialog";
import { Credential } from "@/features/eventos/types";
import EventLayout from "@/components/dashboard/dashboard-layout"
import { useParams } from "next/navigation";
import { useEventos } from "@/features/eventos/api/query/use-eventos";
export default function CredenciaisPage() {
    const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null);

    const handleOpenEditDialog = (credential: Credential) => {
        setSelectedCredential(credential);
    };

    const params = useParams();
    const eventId = params.id as string;
    const { data: event } = useEventos({ id: eventId });
    const eventName =
        (Array.isArray(event) ? event[0]?.name : event?.name) || "Credenciais";
    return (
        <EventLayout eventId={eventId} eventName={eventName}>
            <div className="container mx-auto p-4 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Credenciais</h1>
                        <p className="text-muted-foreground">
                            Gerencie as credenciais do evento
                        </p>
                    </div>
                </div>

                <CredentialsDashboard
                    onOpenCreateDialog={() => { }}
                    onOpenEditDialog={handleOpenEditDialog}
                />



                {/* Diálogo de edição */}
                {selectedCredential && (
                    <CredentialEditDialog credential={selectedCredential} />
                )}
            </div>
        </EventLayout>);
} 