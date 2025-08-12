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

    // Estados para configurações
    const [configuracoes, setConfiguracoes] = useState({
        // Informações Básicas
        nome: evento?.name || "",
        descricao: evento?.description || "",
        dataInicio: "",
        dataFim: "",
        local: "",
        capacidade: "",
        status: evento?.isActive ? "ativo" : "inativo",

        // Configurações de Participantes
        maxParticipantes: "",
        permitirInscricoes: true,
        aprovarParticipantes: false,
        permitirEmpresas: true,
        obrigarCNPJ: false,

        // Configurações de Staff
        maxOperadores: "",
        maxCoordenadores: "",
        permitirAutoAtribuicao: true,
        notificarNovosStaff: true,

        // Configurações de Recursos
        maxVagas: "",
        maxRadios: "",
        permitirReservaRecursos: true,
        tempoReserva: "24",

        // Configurações de Segurança
        senhaEvento: "",
        mostrarSenha: false,
        permitirAcessoExterno: false,
        logTodasAcoes: true,
        backupAutomatico: true,

        // Configurações de Notificações
        notificarCheckin: true,
        notificarCheckout: true,
        notificarEmpresas: true,
        notificarRelatorios: true,
        emailNotificacoes: "",

        // Configurações de Relatórios
        gerarRelatoriosAutomaticos: false,
        incluirDadosEmpresas: true,
        incluirDadosStaff: true,
        formatoRelatorio: "pdf",
        frequenciaRelatorio: "diario",

        // Configurações Avançadas
        timezone: "America/Sao_Paulo",
        idioma: "pt-BR",
        tema: "claro",
        modoDebug: false,
        cacheAtivo: true
    })

    const [isLoading, setIsLoading] = useState(false)

    // Atualizar configurações quando evento mudar
    React.useEffect(() => {
        if (evento) {
            setConfiguracoes(prev => ({
                ...prev,
                nome: evento.name || "",
                descricao: evento.description || "",
                status: evento.isActive ? "ativo" : "inativo"
            }))
        }
    }, [evento])

    const handleSave = async () => {
        setIsLoading(true)
        try {
            // Simular salvamento
            await new Promise((resolve) => setTimeout(resolve, 1000))
            toast.success("Configurações salvas com sucesso!")
        } catch (error) {
            toast.error("Erro ao salvar configurações", {
                description: error instanceof Error ? error.message : "Erro desconhecido"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleReset = () => {
        if (confirm("Tem certeza que deseja redefinir todas as configurações?")) {
            setConfiguracoes({
                nome: evento?.name || "",
                descricao: evento?.description || "",
                dataInicio: "",
                dataFim: "",
                local: "",
                capacidade: "",
                status: evento?.isActive ? "ativo" : "inativo",
                maxParticipantes: "",
                permitirInscricoes: true,
                aprovarParticipantes: false,
                permitirEmpresas: true,
                obrigarCNPJ: false,
                maxOperadores: "",
                maxCoordenadores: "",
                permitirAutoAtribuicao: true,
                notificarNovosStaff: true,
                maxVagas: "",
                maxRadios: "",
                permitirReservaRecursos: true,
                tempoReserva: "24",
                senhaEvento: "",
                mostrarSenha: false,
                permitirAcessoExterno: false,
                logTodasAcoes: true,
                backupAutomatico: true,
                notificarCheckin: true,
                notificarCheckout: true,
                notificarEmpresas: true,
                notificarRelatorios: true,
                emailNotificacoes: "",
                gerarRelatoriosAutomaticos: false,
                incluirDadosEmpresas: true,
                incluirDadosStaff: true,
                formatoRelatorio: "pdf",
                frequenciaRelatorio: "diario",
                timezone: "America/Sao_Paulo",
                idioma: "pt-BR",
                tema: "claro",
                modoDebug: false,
                cacheAtivo: true
            })
            toast.success("Configurações redefinidas!")
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
                                    <label className="block text-sm font-medium mb-2">Nome do Evento</label>
                                    <Input
                                        value={configuracoes.nome}
                                        onChange={(e) => setConfiguracoes(prev => ({ ...prev, nome: e.target.value }))}
                                        placeholder="Nome do evento"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Status</label>
                                    <Select value={configuracoes.status} onValueChange={(value) => setConfiguracoes(prev => ({ ...prev, status: value }))}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ativo">Ativo</SelectItem>
                                            <SelectItem value="inativo">Inativo</SelectItem>
                                            <SelectItem value="rascunho">Rascunho</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Data de Início</label>
                                    <Input
                                        type="date"
                                        value={configuracoes.dataInicio}
                                        onChange={(e) => setConfiguracoes(prev => ({ ...prev, dataInicio: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Data de Fim</label>
                                    <Input
                                        type="date"
                                        value={configuracoes.dataFim}
                                        onChange={(e) => setConfiguracoes(prev => ({ ...prev, dataFim: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Local</label>
                                    <Input
                                        value={configuracoes.local}
                                        onChange={(e) => setConfiguracoes(prev => ({ ...prev, local: e.target.value }))}
                                        placeholder="Local do evento"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Descrição</label>
                                <Textarea
                                    value={configuracoes.descricao}
                                    onChange={(e) => setConfiguracoes(prev => ({ ...prev, descricao: e.target.value }))}
                                    placeholder="Descrição detalhada do evento"
                                    rows={3}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Configurações de Segurança */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Configurações de Segurança
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Senha do Evento</label>
                                    <div className="relative">
                                        <Input
                                            type={configuracoes.mostrarSenha ? "text" : "password"}
                                            value={configuracoes.senhaEvento}
                                            onChange={(e) => setConfiguracoes(prev => ({ ...prev, senhaEvento: e.target.value }))}
                                            placeholder="Senha para acesso ao evento"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute right-0 top-0 h-full px-3"
                                            onClick={() => setConfiguracoes(prev => ({ ...prev, mostrarSenha: !prev.mostrarSenha }))}
                                        >
                                            {configuracoes.mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Acesso Externo</label>
                                        <p className="text-xs text-gray-500">Permitir acesso sem autenticação</p>
                                    </div>
                                    <Switch
                                        checked={configuracoes.permitirAcessoExterno}
                                        onCheckedChange={(checked) => setConfiguracoes(prev => ({ ...prev, permitirAcessoExterno: checked }))}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Log de Ações</label>
                                        <p className="text-xs text-gray-500">Registrar todas as ações realizadas</p>
                                    </div>
                                    <Switch
                                        checked={configuracoes.logTodasAcoes}
                                        onCheckedChange={(checked) => setConfiguracoes(prev => ({ ...prev, logTodasAcoes: checked }))}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Backup Automático</label>
                                        <p className="text-xs text-gray-500">Fazer backup automático dos dados</p>
                                    </div>
                                    <Switch
                                        checked={configuracoes.backupAutomatico}
                                        onCheckedChange={(checked) => setConfiguracoes(prev => ({ ...prev, backupAutomatico: checked }))}
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
                            disabled={isLoading}
                            className="flex items-center gap-2"
                        >
                            {isLoading ? (
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