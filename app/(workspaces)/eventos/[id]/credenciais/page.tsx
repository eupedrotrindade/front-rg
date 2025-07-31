"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Ticket, Palette, Hash, Activity } from "lucide-react"
import EventWristbandModelsDashboard from "@/features/eventos/components/event-wristband-models-dashboard"
import EventWristbandsDashboard from "@/features/eventos/components/event-wristbands-dashboard"
import EventLayout from "@/components/dashboard/dashboard-layout"
import { useEventos } from "@/features/eventos/api/query"

export default function CredenciaisPage() {
    const params = useParams()
    const eventId = params.id as string
    const [activeTab, setActiveTab] = useState("modelos")
    const { data: eventos = [] } = useEventos()
    const evento = Array.isArray(eventos) ? eventos.find(e => e.id === eventId) : null

    if (!evento) {
        return <div>Evento não encontrado</div>
    }

    return (
        <EventLayout eventId={String(params.id)} eventName={evento.name}>
            <div className="container mx-auto p-6">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Credenciais</h1>
                    <p className="text-gray-600 mt-1">Gerencie modelos e credenciais do evento</p>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="modelos" className="flex items-center gap-2">
                            <Palette className="h-4 w-4" />
                            Modelos de Credenciais Gerais
                        </TabsTrigger>
                        <TabsTrigger value="credenciais" className="flex items-center gap-2">
                            <Ticket className="h-4 w-4" />
                            Credenciais de Participantes
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="modelos" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Palette className="h-5 w-5" />
                                    Modelos de Credenciais
                                </CardTitle>
                                <CardDescription>
                                    Crie e gerencie os modelos de credenciais para este evento.
                                    Os modelos definem o tipo, cor e características das credenciais.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <EventWristbandModelsDashboard />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="credenciais" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Ticket className="h-5 w-5" />
                                    Credenciais Físicas
                                </CardTitle>
                                <CardDescription>
                                    Gerencie as credenciais físicas do evento.
                                    Visualize distribuição, status e informações detalhadas.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <EventWristbandsDashboard />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </EventLayout>
    )
} 