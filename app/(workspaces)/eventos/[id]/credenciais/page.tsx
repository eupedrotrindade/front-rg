"use client";

import { useMemo } from "react";
import { CredentialsDashboard } from "@/features/eventos/components/credentials-dashboard";
import EventLayout from "@/components/dashboard/dashboard-layout"
import { useParams } from "next/navigation";
import { useEventos } from "@/features/eventos/api/query/use-eventos";

export default function CredenciaisPage() {
    const params = useParams();
    const eventId = params.id as string;
    const { data: eventos } = useEventos();

    // Buscar dados do evento com tratamento robusto
    const evento = useMemo(() => {
        const foundEvent = Array.isArray(eventos)
            ? eventos.find(e => String(e.id) === String(eventId))
            : undefined

        // Debug temporário para verificar estrutura dos dados
        if (foundEvent) {
            console.log('🔍 Evento encontrado em credenciais:', {
                id: foundEvent.id,
                name: foundEvent.name,
                montagem: foundEvent.montagem,
                evento: foundEvent.evento,
                desmontagem: foundEvent.desmontagem,
                montagemType: typeof foundEvent.montagem,
                eventoType: typeof foundEvent.evento,
                desmontagemType: typeof foundEvent.desmontagem
            })
        }

        return foundEvent
    }, [eventos, eventId])

    // Se não há evento, mostrar loading
    if (!evento) {
        return (
            <EventLayout
                eventId={eventId}
                eventName="Carregando..."
            >
                <div className="container mx-auto p-4 space-y-6">
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Carregando credenciais do evento...</p>
                        </div>
                    </div>
                </div>
            </EventLayout>
        );
    }

    return (
        <EventLayout eventId={eventId} eventName={evento.name || "Credenciais"}>
            <div className="container mx-auto p-4 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Credenciais</h1>
                        <p className="text-muted-foreground">
                            Gerencie as credenciais do evento &quot;{evento.name}&quot;
                        </p>
                    </div>
                </div>

                <CredentialsDashboard />
            </div>
        </EventLayout>
    );
} 