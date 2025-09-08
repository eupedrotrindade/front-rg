/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useMemo, useCallback } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BannerUpload } from "@/components/ui/banner-upload"

import {
    Settings,
    Calendar,
    Users,
    Building,
    Shield,
    Bell,
    FileText,
    Save,
    AlertTriangle,
    Eye,
    EyeOff
} from "lucide-react"
import { toast } from "sonner"
import { useEventos } from "@/features/eventos/api/query/use-eventos"
import { useUpdateEvento } from "@/features/eventos/api/mutation/use-update-evento"
import EventLayout from "@/components/dashboard/dashboard-layout"

export default function EventoConfiguracoesPage() {
    const params = useParams()
    const eventId = String(params.id)
    const { data: eventos } = useEventos()

    // Buscar dados do evento com tratamento robusto
    const evento = useMemo(() => {
        const foundEvent = Array.isArray(eventos)
            ? eventos.find((e) => String(e.id) === String(eventId))
            : undefined

        // Debug temporário para verificar estrutura dos dados
        if (foundEvent) {
            console.log('🔍 Evento encontrado em configurações:', {
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

    // Função helper para garantir que os dados sejam arrays válidos
    const ensureArray = useCallback((data: any): any[] => {
        if (!data) return []

        // Se for string, tentar fazer parse
        if (typeof data === 'string') {
            try {
                const parsed = JSON.parse(data)
                return Array.isArray(parsed) ? parsed : []
            } catch (error) {
                console.warn('⚠️ Dados não são JSON válido:', data)
                return []
            }
        }

        // Se já for array, retornar como está
        if (Array.isArray(data)) {
            return data
        }

        // Se for objeto, tentar extrair dados
        if (typeof data === 'object' && data !== null) {
            console.warn('⚠️ Dados inesperados para dias do evento:', data)
            return []
        }

        return []
    }, [])

    // Hook para atualizar evento
    const updateEventoMutation = useUpdateEvento()

    // Estados para configurações do evento
    const [configuracoes, setConfiguracoes] = useState({
        name: "",
        description: "",
        startDate: "",
        endDate: "",
        venue: "",
        address: "",
        status: "draft" as "active" | "closed" | "canceled" | "draft",
        visibility: "private" as "public" | "private" | "restricted",
        type: "",
        categories: [] as string[],
        registrationLink: "",
        bannerUrl: "",
        isActive: true
    })

    const [isLoading, setIsLoading] = useState(false)

    // Atualizar configurações quando evento mudar
    React.useEffect(() => {
        if (evento) {
            setConfiguracoes({
                name: evento.name || "",
                description: evento.description || "",
                startDate: evento.startDate ? new Date(evento.startDate).toISOString().split('T')[0] : "",
                endDate: evento.endDate ? new Date(evento.endDate).toISOString().split('T')[0] : "",
                venue: evento.venue || "",
                address: evento.address || "",
                status: evento.status || "draft",
                visibility: evento.visibility || "private",
                type: evento.type || "",
                categories: evento.categories || [],
                registrationLink: evento.registrationLink || "",
                bannerUrl: evento.bannerUrl || "",
                isActive: evento.isActive ?? true
            })
        }
    }, [evento])

    const handleSave = async () => {
        if (!evento?.id) {
            toast.error("ID do evento não encontrado")
            return
        }

        if (!configuracoes.name.trim()) {
            toast.error("Nome do evento é obrigatório")
            return
        }

        if (!configuracoes.startDate || !configuracoes.endDate) {
            toast.error("Data de início e fim são obrigatórias")
            return
        }

        if (!configuracoes.venue.trim()) {
            toast.error("Local do evento é obrigatório")
            return
        }

        setIsLoading(true)
        try {
            const updateData = {
                id: evento.id,
                name: configuracoes.name.trim(),
                description: configuracoes.description?.trim() || undefined,
                startDate: configuracoes.startDate,
                endDate: configuracoes.endDate,
                venue: configuracoes.venue.trim(),
                address: configuracoes.address?.trim() || undefined,
                status: configuracoes.status,
                visibility: configuracoes.visibility,
                type: configuracoes.type?.trim() || undefined,
                categories: configuracoes.categories.filter(c => c.trim()),
                registrationLink: configuracoes.registrationLink?.trim() || undefined,
                bannerUrl: configuracoes.bannerUrl?.trim() || undefined,
                isActive: configuracoes.isActive
            }

            await updateEventoMutation.mutateAsync(updateData)
        } catch (error) {
            console.error('Erro ao salvar configurações:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleReset = () => {
        if (confirm("Tem certeza que deseja redefinir todas as configurações para os valores originais?")) {
            if (evento) {
                setConfiguracoes({
                    name: evento.name || "",
                    description: evento.description || "",
                    startDate: evento.startDate ? new Date(evento.startDate).toISOString().split('T')[0] : "",
                    endDate: evento.endDate ? new Date(evento.endDate).toISOString().split('T')[0] : "",
                    venue: evento.venue || "",
                    address: evento.address || "",
                    status: evento.status || "draft",
                    visibility: evento.visibility || "private",
                    type: evento.type || "",
                    categories: evento.categories || [],
                    registrationLink: evento.registrationLink || "",
                    bannerUrl: evento.bannerUrl || "",
                    isActive: evento.isActive ?? true
                })
                toast.success("Configurações redefinidas para os valores originais!")
            }
        }
    }

    // Se não há evento, mostrar loading
    if (!evento) {
        return (
            <EventLayout
                eventId={eventId}
                eventName="Carregando..."
            >
                <div className="p-8">
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Carregando configurações do evento...</p>
                        </div>
                    </div>
                </div>
            </EventLayout>
        )
    }

    return (
        <EventLayout
            eventId={eventId}
            eventName={evento?.name || "Configurações"}
        >
            <div className="p-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                Configurações do Evento
                            </h1>
                            <p className="text-gray-600">
                                {evento ? `Gerencie as configurações do evento "${evento.name}"` : "Gerencie as configurações deste evento"}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-blue-600">
                                <Settings className="h-3 w-3 mr-1" />
                                Configurações
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Configurações */}
                <div className="space-y-6">
                    {/* Informações Básicas */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                Informações Básicas
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Nome do Evento *</label>
                                    <Input
                                        value={configuracoes.name}
                                        onChange={(e) => setConfiguracoes(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Nome do evento"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Tipo do Evento</label>
                                    <Input
                                        value={configuracoes.type}
                                        onChange={(e) => setConfiguracoes(prev => ({ ...prev, type: e.target.value }))}
                                        placeholder="Ex: Conferência, Show, Workshop"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Data de Início *</label>
                                    <Input
                                        type="date"
                                        value={configuracoes.startDate}
                                        onChange={(e) => setConfiguracoes(prev => ({ ...prev, startDate: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Data de Fim *</label>
                                    <Input
                                        type="date"
                                        value={configuracoes.endDate}
                                        onChange={(e) => setConfiguracoes(prev => ({ ...prev, endDate: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Local do Evento *</label>
                                    <Input
                                        value={configuracoes.venue}
                                        onChange={(e) => setConfiguracoes(prev => ({ ...prev, venue: e.target.value }))}
                                        placeholder="Local do evento"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Endereço Completo</label>
                                <Input
                                    value={configuracoes.address}
                                    onChange={(e) => setConfiguracoes(prev => ({ ...prev, address: e.target.value }))}
                                    placeholder="Endereço completo do local"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Descrição</label>
                                <Textarea
                                    value={configuracoes.description}
                                    onChange={(e) => setConfiguracoes(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Descrição detalhada do evento"
                                    rows={3}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Link de Inscrição</label>
                                <Input
                                    type="url"
                                    value={configuracoes.registrationLink}
                                    onChange={(e) => setConfiguracoes(prev => ({ ...prev, registrationLink: e.target.value }))}
                                    placeholder="https://exemplo.com/inscricao"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Banner do Evento</label>
                                <BannerUpload
                                    value={configuracoes.bannerUrl}
                                    onChange={(url) => setConfiguracoes(prev => ({ ...prev, bannerUrl: url }))}
                                    eventId={eventId}
                                    maxSize={5}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Configurações do Status */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Configurações de Status e Visibilidade
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Status do Evento</label>
                                    <Select value={configuracoes.status} onValueChange={(value: "active" | "closed" | "canceled" | "draft") => setConfiguracoes(prev => ({ ...prev, status: value }))}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Ativo</SelectItem>
                                            <SelectItem value="draft">Rascunho</SelectItem>
                                            <SelectItem value="closed">Encerrado</SelectItem>
                                            <SelectItem value="canceled">Cancelado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Visibilidade</label>
                                    <Select value={configuracoes.visibility} onValueChange={(value: "public" | "private" | "restricted") => setConfiguracoes(prev => ({ ...prev, visibility: value }))}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="private">Privado</SelectItem>
                                            <SelectItem value="public">Público</SelectItem>
                                            <SelectItem value="restricted">Restrito</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Evento Ativo</label>
                                        <p className="text-xs text-gray-500">Habilitar o evento no sistema</p>
                                    </div>
                                    <Switch
                                        checked={configuracoes.isActive}
                                        onCheckedChange={(checked) => setConfiguracoes(prev => ({ ...prev, isActive: checked }))}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Actions */}
                <div className="mt-8 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            onClick={handleReset}
                            className="flex items-center gap-2"
                        >
                            <AlertTriangle className="h-4 w-4" />
                            Redefinir
                        </Button>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            onClick={() => window.history.back()}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isLoading || updateEventoMutation.isPending}
                            className="flex items-center gap-2"
                        >
                            {(isLoading || updateEventoMutation.isPending) ? (
                                <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Salvar Configurações
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </EventLayout>
    )
} 