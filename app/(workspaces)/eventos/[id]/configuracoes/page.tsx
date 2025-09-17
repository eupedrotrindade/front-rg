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
            <div className="p-8 bg-gray-50 min-h-screen">
                {/* Header */}
                <div className="mb-8">
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <Settings className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <h1 className="text-3xl font-bold text-gray-900">
                                        Configurações do Evento
                                    </h1>
                                </div>
                                <p className="text-gray-600 text-lg">
                                    {evento ? `Gerencie as configurações do evento "${evento.name}"` : "Gerencie as configurações deste evento"}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 px-3 py-1">
                                    <Settings className="h-4 w-4 mr-2" />
                                    Configurações
                                </Badge>
                                {evento && (
                                    <Badge variant="outline" className={`px-3 py-1 ${
                                        evento.isActive ? 'text-green-600 border-green-200 bg-green-50' : 'text-gray-600 border-gray-200 bg-gray-50'
                                    }`}>
                                        <div className={`w-2 h-2 rounded-full mr-2 ${evento.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                        {evento.isActive ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Configurações */}
                <div className="space-y-6">
                    {/* Informações Básicas */}
                    <Card className="border-l-4 border-l-green-500 shadow-sm">
                        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                            <CardTitle className="flex items-center gap-2 text-gray-800">
                                <Calendar className="h-5 w-5 text-green-600" />
                                Informações Básicas
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nome do Evento *</label>
                                    <Input
                                        value={configuracoes.name}
                                        onChange={(e) => setConfiguracoes(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Nome do evento"
                                        required
                                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">ID do Evento</label>
                                    <div className="relative">
                                        <Input
                                            value={eventId}
                                            readOnly
                                            className="bg-gray-50 border-gray-300 text-gray-600 cursor-text pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(eventId)
                                                toast.success("ID copiado!")
                                            }}
                                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            <FileText className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo do Evento</label>
                                    <Input
                                        value={configuracoes.type}
                                        onChange={(e) => setConfiguracoes(prev => ({ ...prev, type: e.target.value }))}
                                        placeholder="Ex: Conferência, Show, Workshop"
                                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Data de Início *</label>
                                    <Input
                                        type="date"
                                        value={configuracoes.startDate}
                                        onChange={(e) => setConfiguracoes(prev => ({ ...prev, startDate: e.target.value }))}
                                        required
                                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Data de Fim *</label>
                                    <Input
                                        type="date"
                                        value={configuracoes.endDate}
                                        onChange={(e) => setConfiguracoes(prev => ({ ...prev, endDate: e.target.value }))}
                                        required
                                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Local do Evento *</label>
                                    <div className="relative">
                                        <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                        <Input
                                            value={configuracoes.venue}
                                            onChange={(e) => setConfiguracoes(prev => ({ ...prev, venue: e.target.value }))}
                                            placeholder="Local do evento"
                                            required
                                            className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Endereço Completo</label>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-3 text-gray-400 h-4 w-4" />
                                        <Input
                                            value={configuracoes.address}
                                            onChange={(e) => setConfiguracoes(prev => ({ ...prev, address: e.target.value }))}
                                            placeholder="Endereço completo do local"
                                            className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Descrição</label>
                                    <Textarea
                                        value={configuracoes.description}
                                        onChange={(e) => setConfiguracoes(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Descrição detalhada do evento"
                                        rows={4}
                                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Link de Inscrição</label>
                                    <div className="relative">
                                        <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                        <Input
                                            type="url"
                                            value={configuracoes.registrationLink}
                                            onChange={(e) => setConfiguracoes(prev => ({ ...prev, registrationLink: e.target.value }))}
                                            placeholder="https://exemplo.com/inscricao"
                                            className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">Banner do Evento</label>
                                    <BannerUpload
                                        value={configuracoes.bannerUrl}
                                        onChange={(url) => setConfiguracoes(prev => ({ ...prev, bannerUrl: url }))}
                                        eventId={eventId}
                                        maxSize={5}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Configurações do Status */}
                    <Card className="border-l-4 border-l-blue-500">
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                            <CardTitle className="flex items-center gap-2 text-gray-800">
                                <Shield className="h-5 w-5 text-blue-600" />
                                Configurações de Status e Visibilidade
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Status do Evento</label>
                                    <Select value={configuracoes.status} onValueChange={(value: "active" | "closed" | "canceled" | "draft") => setConfiguracoes(prev => ({ ...prev, status: value }))}>
                                        <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active" className="flex items-center">
                                                <span className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                    Ativo
                                                </span>
                                            </SelectItem>
                                            <SelectItem value="draft" className="flex items-center">
                                                <span className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                                    Rascunho
                                                </span>
                                            </SelectItem>
                                            <SelectItem value="closed" className="flex items-center">
                                                <span className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                                    Encerrado
                                                </span>
                                            </SelectItem>
                                            <SelectItem value="canceled" className="flex items-center">
                                                <span className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                                    Cancelado
                                                </span>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Visibilidade</label>
                                    <Select value={configuracoes.visibility} onValueChange={(value: "public" | "private" | "restricted") => setConfiguracoes(prev => ({ ...prev, visibility: value }))}>
                                        <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="private" className="flex items-center">
                                                <span className="flex items-center gap-2">
                                                    <EyeOff className="w-4 h-4 text-gray-500" />
                                                    Privado
                                                </span>
                                            </SelectItem>
                                            <SelectItem value="public" className="flex items-center">
                                                <span className="flex items-center gap-2">
                                                    <Eye className="w-4 h-4 text-green-500" />
                                                    Público
                                                </span>
                                            </SelectItem>
                                            <SelectItem value="restricted" className="flex items-center">
                                                <span className="flex items-center gap-2">
                                                    <Shield className="w-4 h-4 text-yellow-500" />
                                                    Restrito
                                                </span>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="bg-white rounded-lg border border-gray-200 p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <label className="block text-sm font-semibold text-gray-700">Evento Ativo</label>
                                            <p className="text-xs text-gray-500">Habilitar o evento no sistema</p>
                                        </div>
                                        <div className="flex items-center">
                                            <Switch
                                                checked={configuracoes.isActive}
                                                onCheckedChange={(checked) => setConfiguracoes(prev => ({ ...prev, isActive: checked }))}
                                                className="data-[state=checked]:bg-blue-600"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Status Indicator */}
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${
                                        configuracoes.status === 'active' ? 'bg-green-500' :
                                        configuracoes.status === 'draft' ? 'bg-yellow-500' :
                                        configuracoes.status === 'closed' ? 'bg-gray-500' :
                                        'bg-red-500'
                                    }`}></div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-700">
                                            Status Atual: <span className="capitalize">{
                                                configuracoes.status === 'active' ? 'Ativo' :
                                                configuracoes.status === 'draft' ? 'Rascunho' :
                                                configuracoes.status === 'closed' ? 'Encerrado' :
                                                'Cancelado'
                                            }</span>
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Visibilidade: {
                                                configuracoes.visibility === 'public' ? 'Público' :
                                                configuracoes.visibility === 'private' ? 'Privado' :
                                                'Restrito'
                                            } • Sistema: {configuracoes.isActive ? 'Ativo' : 'Inativo'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Actions */}
                <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center space-x-3">
                            <Button
                                variant="outline"
                                onClick={handleReset}
                                className="flex items-center gap-2 border-orange-300 text-orange-700 hover:bg-orange-50 hover:border-orange-400"
                            >
                                <AlertTriangle className="h-4 w-4" />
                                Redefinir
                            </Button>
                        </div>
                        <div className="flex items-center space-x-3">
                            <Button
                                variant="outline"
                                onClick={() => window.history.back()}
                                className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={isLoading || updateEventoMutation.isPending}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 shadow-md hover:shadow-lg transition-all duration-200"
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
            </div>
        </EventLayout>
    )
} 