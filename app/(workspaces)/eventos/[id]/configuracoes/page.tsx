'use client'

import React, { useState } from "react"
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

    // Buscar dados do evento
    const evento = Array.isArray(eventos)
        ? eventos.find((e) => String(e.id) === String(eventId))
        : undefined

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
                                <div>
                                    <label className="block text-sm font-medium mb-2">Capacidade</label>
                                    <Input
                                        type="number"
                                        value={configuracoes.capacidade}
                                        onChange={(e) => setConfiguracoes(prev => ({ ...prev, capacidade: e.target.value }))}
                                        placeholder="Número máximo de participantes"
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

                    {/* Configurações de Participantes */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Configurações de Participantes
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Máximo de Participantes</label>
                                    <Input
                                        type="number"
                                        value={configuracoes.maxParticipantes}
                                        onChange={(e) => setConfiguracoes(prev => ({ ...prev, maxParticipantes: e.target.value }))}
                                        placeholder="Limite de participantes"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Permitir Inscrições</label>
                                        <p className="text-xs text-gray-500">Permitir que pessoas se inscrevam</p>
                                    </div>
                                    <Switch
                                        checked={configuracoes.permitirInscricoes}
                                        onCheckedChange={(checked) => setConfiguracoes(prev => ({ ...prev, permitirInscricoes: checked }))}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Aprovar Participantes</label>
                                        <p className="text-xs text-gray-500">Requer aprovação manual</p>
                                    </div>
                                    <Switch
                                        checked={configuracoes.aprovarParticipantes}
                                        onCheckedChange={(checked) => setConfiguracoes(prev => ({ ...prev, aprovarParticipantes: checked }))}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Permitir Empresas</label>
                                        <p className="text-xs text-gray-500">Vincular participantes a empresas</p>
                                    </div>
                                    <Switch
                                        checked={configuracoes.permitirEmpresas}
                                        onCheckedChange={(checked) => setConfiguracoes(prev => ({ ...prev, permitirEmpresas: checked }))}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Obrigar CNPJ</label>
                                        <p className="text-xs text-gray-500">CNPJ obrigatório para empresas</p>
                                    </div>
                                    <Switch
                                        checked={configuracoes.obrigarCNPJ}
                                        onCheckedChange={(checked) => setConfiguracoes(prev => ({ ...prev, obrigarCNPJ: checked }))}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Configurações de Staff */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Configurações de Staff
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Máximo de Operadores</label>
                                    <Input
                                        type="number"
                                        value={configuracoes.maxOperadores}
                                        onChange={(e) => setConfiguracoes(prev => ({ ...prev, maxOperadores: e.target.value }))}
                                        placeholder="Limite de operadores"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Máximo de Coordenadores</label>
                                    <Input
                                        type="number"
                                        value={configuracoes.maxCoordenadores}
                                        onChange={(e) => setConfiguracoes(prev => ({ ...prev, maxCoordenadores: e.target.value }))}
                                        placeholder="Limite de coordenadores"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Auto Atribuição</label>
                                        <p className="text-xs text-gray-500">Permitir auto atribuição de funções</p>
                                    </div>
                                    <Switch
                                        checked={configuracoes.permitirAutoAtribuicao}
                                        onCheckedChange={(checked) => setConfiguracoes(prev => ({ ...prev, permitirAutoAtribuicao: checked }))}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Notificar Novos Staff</label>
                                        <p className="text-xs text-gray-500">Notificar quando novo staff for adicionado</p>
                                    </div>
                                    <Switch
                                        checked={configuracoes.notificarNovosStaff}
                                        onCheckedChange={(checked) => setConfiguracoes(prev => ({ ...prev, notificarNovosStaff: checked }))}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Configurações de Recursos */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building className="h-5 w-5" />
                                Configurações de Recursos
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Máximo de Vagas</label>
                                    <Input
                                        type="number"
                                        value={configuracoes.maxVagas}
                                        onChange={(e) => setConfiguracoes(prev => ({ ...prev, maxVagas: e.target.value }))}
                                        placeholder="Limite de vagas"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Máximo de Rádios</label>
                                    <Input
                                        type="number"
                                        value={configuracoes.maxRadios}
                                        onChange={(e) => setConfiguracoes(prev => ({ ...prev, maxRadios: e.target.value }))}
                                        placeholder="Limite de rádios"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Permitir Reserva</label>
                                        <p className="text-xs text-gray-500">Permitir reserva de recursos</p>
                                    </div>
                                    <Switch
                                        checked={configuracoes.permitirReservaRecursos}
                                        onCheckedChange={(checked) => setConfiguracoes(prev => ({ ...prev, permitirReservaRecursos: checked }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Tempo de Reserva (horas)</label>
                                    <Select value={configuracoes.tempoReserva} onValueChange={(value) => setConfiguracoes(prev => ({ ...prev, tempoReserva: value }))}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">1 hora</SelectItem>
                                            <SelectItem value="6">6 horas</SelectItem>
                                            <SelectItem value="12">12 horas</SelectItem>
                                            <SelectItem value="24">24 horas</SelectItem>
                                            <SelectItem value="48">48 horas</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
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

                    {/* Configurações de Notificações */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bell className="h-5 w-5" />
                                Configurações de Notificações
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Notificar Check-in</label>
                                        <p className="text-xs text-gray-500">Notificar quando alguém fizer check-in</p>
                                    </div>
                                    <Switch
                                        checked={configuracoes.notificarCheckin}
                                        onCheckedChange={(checked) => setConfiguracoes(prev => ({ ...prev, notificarCheckin: checked }))}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Notificar Check-out</label>
                                        <p className="text-xs text-gray-500">Notificar quando alguém fizer check-out</p>
                                    </div>
                                    <Switch
                                        checked={configuracoes.notificarCheckout}
                                        onCheckedChange={(checked) => setConfiguracoes(prev => ({ ...prev, notificarCheckout: checked }))}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Notificar Empresas</label>
                                        <p className="text-xs text-gray-500">Notificar mudanças relacionadas a empresas</p>
                                    </div>
                                    <Switch
                                        checked={configuracoes.notificarEmpresas}
                                        onCheckedChange={(checked) => setConfiguracoes(prev => ({ ...prev, notificarEmpresas: checked }))}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Notificar Relatórios</label>
                                        <p className="text-xs text-gray-500">Notificar quando relatórios forem gerados</p>
                                    </div>
                                    <Switch
                                        checked={configuracoes.notificarRelatorios}
                                        onCheckedChange={(checked) => setConfiguracoes(prev => ({ ...prev, notificarRelatorios: checked }))}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Email para Notificações</label>
                                <Input
                                    type="email"
                                    value={configuracoes.emailNotificacoes}
                                    onChange={(e) => setConfiguracoes(prev => ({ ...prev, emailNotificacoes: e.target.value }))}
                                    placeholder="email@exemplo.com"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Configurações de Relatórios */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Configurações de Relatórios
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Relatórios Automáticos</label>
                                        <p className="text-xs text-gray-500">Gerar relatórios automaticamente</p>
                                    </div>
                                    <Switch
                                        checked={configuracoes.gerarRelatoriosAutomaticos}
                                        onCheckedChange={(checked) => setConfiguracoes(prev => ({ ...prev, gerarRelatoriosAutomaticos: checked }))}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Incluir Dados de Empresas</label>
                                        <p className="text-xs text-gray-500">Incluir informações de empresas nos relatórios</p>
                                    </div>
                                    <Switch
                                        checked={configuracoes.incluirDadosEmpresas}
                                        onCheckedChange={(checked) => setConfiguracoes(prev => ({ ...prev, incluirDadosEmpresas: checked }))}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Incluir Dados de Staff</label>
                                        <p className="text-xs text-gray-500">Incluir informações de staff nos relatórios</p>
                                    </div>
                                    <Switch
                                        checked={configuracoes.incluirDadosStaff}
                                        onCheckedChange={(checked) => setConfiguracoes(prev => ({ ...prev, incluirDadosStaff: checked }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Formato do Relatório</label>
                                    <Select value={configuracoes.formatoRelatorio} onValueChange={(value) => setConfiguracoes(prev => ({ ...prev, formatoRelatorio: value }))}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pdf">PDF</SelectItem>
                                            <SelectItem value="excel">Excel</SelectItem>
                                            <SelectItem value="csv">CSV</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Frequência do Relatório</label>
                                    <Select value={configuracoes.frequenciaRelatorio} onValueChange={(value) => setConfiguracoes(prev => ({ ...prev, frequenciaRelatorio: value }))}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="diario">Diário</SelectItem>
                                            <SelectItem value="semanal">Semanal</SelectItem>
                                            <SelectItem value="mensal">Mensal</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Configurações Avançadas */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="h-5 w-5" />
                                Configurações Avançadas
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Fuso Horário</label>
                                    <Select value={configuracoes.timezone} onValueChange={(value) => setConfiguracoes(prev => ({ ...prev, timezone: value }))}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="America/Sao_Paulo">São Paulo (GMT-3)</SelectItem>
                                            <SelectItem value="America/Manaus">Manaus (GMT-4)</SelectItem>
                                            <SelectItem value="America/Belem">Belém (GMT-3)</SelectItem>
                                            <SelectItem value="UTC">UTC</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Idioma</label>
                                    <Select value={configuracoes.idioma} onValueChange={(value) => setConfiguracoes(prev => ({ ...prev, idioma: value }))}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                                            <SelectItem value="en-US">English (US)</SelectItem>
                                            <SelectItem value="es-ES">Español</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Tema</label>
                                    <Select value={configuracoes.tema} onValueChange={(value) => setConfiguracoes(prev => ({ ...prev, tema: value }))}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="claro">Claro</SelectItem>
                                            <SelectItem value="escuro">Escuro</SelectItem>
                                            <SelectItem value="auto">Automático</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Modo Debug</label>
                                        <p className="text-xs text-gray-500">Ativar logs detalhados</p>
                                    </div>
                                    <Switch
                                        checked={configuracoes.modoDebug}
                                        onCheckedChange={(checked) => setConfiguracoes(prev => ({ ...prev, modoDebug: checked }))}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Cache Ativo</label>
                                        <p className="text-xs text-gray-500">Usar cache para melhor performance</p>
                                    </div>
                                    <Switch
                                        checked={configuracoes.cacheAtivo}
                                        onCheckedChange={(checked) => setConfiguracoes(prev => ({ ...prev, cacheAtivo: checked }))}
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