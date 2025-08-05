'use client'

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
    Settings,
    Shield,
    Users,
    FileText,
    Save,
    Upload,
    Download,
    Trash2,
    Plus,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Eye,
    EyeOff,
    Lock,
    Globe,
    Bell,
    Database,
    Calendar,
    Building
} from "lucide-react"
import { toast } from "sonner"
import EventLayout from "@/components/dashboard/dashboard-layout"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

interface BlacklistedParticipant {
    id: string
    name: string
    document: string
    reason: string
    addedAt: string
    addedBy: string
}

export default function ConfigGeralPage() {
    const [configuracoes, setConfiguracoes] = useState({
        // Configurações Globais de Eventos
        tempoMaximoEvento: "30",
        capacidadePadrao: "1000",
        permitirEventosSimultaneos: true,
        limiteEventosSimultaneos: "5",

        // Configurações de Participantes Globais
        maxParticipantesGlobal: "10000",
        permitirInscricoesGlobais: true,
        aprovarParticipantesGlobais: false,
        obrigarCNPJGlobal: false,
        validarDocumentos: true,

        // Configurações de Staff Globais
        maxOperadoresGlobal: "100",
        maxCoordenadoresGlobal: "20",
        permitirAutoAtribuicaoGlobal: true,
        notificarNovosStaffGlobal: true,

        // Configurações de Recursos Globais
        maxVagasGlobal: "500",
        maxRadiosGlobal: "200",
        permitirReservaRecursosGlobal: true,
        tempoReservaGlobal: "24",

        // Configurações de Segurança Globais
        senhaPadraoEventos: "",
        mostrarSenhaGlobal: false,
        permitirAcessoExternoGlobal: false,
        logTodasAcoesGlobal: true,
        backupAutomaticoGlobal: true,
        criptografarDados: true,

        // Configurações de Notificações Globais
        notificarCheckinGlobal: true,
        notificarCheckoutGlobal: true,
        notificarEmpresasGlobal: true,
        notificarRelatoriosGlobal: true,
        emailNotificacoesGlobal: "",

        // Configurações de Relatórios Globais
        gerarRelatoriosAutomaticosGlobal: false,
        incluirDadosEmpresasGlobal: true,
        incluirDadosStaffGlobal: true,
        formatoRelatorioGlobal: "pdf",
        frequenciaRelatorioGlobal: "diario",

        // Configurações Avançadas Globais
        timezoneGlobal: "America/Sao_Paulo",
        idiomaGlobal: "pt-BR",
        temaGlobal: "claro",
        modoDebugGlobal: false,
        cacheAtivoGlobal: true,

        // Configurações de Lista Negra
        ativarListaNegra: true,
        validarListaNegraAutomaticamente: true,
        notificarTentativaAcesso: true,
        permitirSobrescreverListaNegra: false,
        tempoRetencaoListaNegra: "365"
    })

    const [blacklistedParticipants, setBlacklistedParticipants] = useState<BlacklistedParticipant[]>([
        {
            id: "1",
            name: "João Silva",
            document: "123.456.789-00",
            reason: "Comportamento inadequado em eventos anteriores",
            addedAt: "2024-01-15",
            addedBy: "admin@rg.com"
        },
        {
            id: "2",
            name: "Maria Santos",
            document: "987.654.321-00",
            reason: "Não compareceu em múltiplos eventos",
            addedAt: "2024-01-10",
            addedBy: "admin@rg.com"
        }
    ])

    const [newBlacklistedParticipant, setNewBlacklistedParticipant] = useState({
        name: "",
        document: "",
        reason: ""
    })

    const [isLoading, setIsLoading] = useState(false)
    const [showAddBlacklistDialog, setShowAddBlacklistDialog] = useState(false)
    const [deletingParticipant, setDeletingParticipant] = useState<BlacklistedParticipant | null>(null)

    const handleSave = async () => {
        setIsLoading(true)
        try {
            // Simular salvamento
            await new Promise(resolve => setTimeout(resolve, 1000))
            toast.success("Configurações gerais salvas com sucesso!")
        } catch (error) {
            toast.error("Erro ao salvar configurações")
        } finally {
            setIsLoading(false)
        }
    }

    const handleAddBlacklistedParticipant = () => {
        if (!newBlacklistedParticipant.name || !newBlacklistedParticipant.document || !newBlacklistedParticipant.reason) {
            toast.error("Preencha todos os campos")
            return
        }

        const newParticipant: BlacklistedParticipant = {
            id: Date.now().toString(),
            name: newBlacklistedParticipant.name,
            document: newBlacklistedParticipant.document,
            reason: newBlacklistedParticipant.reason,
            addedAt: new Date().toISOString().split('T')[0],
            addedBy: "admin@rg.com"
        }

        setBlacklistedParticipants([...blacklistedParticipants, newParticipant])
        setNewBlacklistedParticipant({ name: "", document: "", reason: "" })
        setShowAddBlacklistDialog(false)
        toast.success("Participante adicionado à lista negra")
    }

    const handleRemoveBlacklistedParticipant = (participant: BlacklistedParticipant) => {
        setDeletingParticipant(participant)
    }

    const confirmRemoveBlacklistedParticipant = () => {
        if (!deletingParticipant) return

        setBlacklistedParticipants(
            blacklistedParticipants.filter(p => p.id !== deletingParticipant.id)
        )
        setDeletingParticipant(null)
        toast.success("Participante removido da lista negra")
    }

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            // Simular processamento de arquivo
            toast.success("Arquivo processado com sucesso")
        }
    }

    return (
        <EventLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Configuração Geral</h1>
                        <p className="text-muted-foreground">
                            Configurações que se aplicam a todos os eventos do sistema
                        </p>
                    </div>
                    <Button onClick={handleSave} disabled={isLoading}>
                        <Save className="w-4 h-4 mr-2" />
                        {isLoading ? "Salvando..." : "Salvar Configurações"}
                    </Button>
                </div>

                <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                        As configurações gerais são aplicadas como padrão para todos os eventos.
                        Eventos individuais podem sobrescrever essas configurações.
                    </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Configurações Globais de Eventos */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Globe className="w-5 h-5" />
                                Configurações Globais de Eventos
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Tempo Máximo de Evento (dias)</Label>
                                    <Input
                                        type="number"
                                        value={configuracoes.tempoMaximoEvento}
                                        onChange={(e) => setConfiguracoes({
                                            ...configuracoes,
                                            tempoMaximoEvento: e.target.value
                                        })}
                                    />
                                </div>
                                <div>
                                    <Label>Capacidade Padrão</Label>
                                    <Input
                                        type="number"
                                        value={configuracoes.capacidadePadrao}
                                        onChange={(e) => setConfiguracoes({
                                            ...configuracoes,
                                            capacidadePadrao: e.target.value
                                        })}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <Label>Permitir Eventos Simultâneos</Label>
                                <Switch
                                    checked={configuracoes.permitirEventosSimultaneos}
                                    onCheckedChange={(checked) => setConfiguracoes({
                                        ...configuracoes,
                                        permitirEventosSimultaneos: checked
                                    })}
                                />
                            </div>

                            {configuracoes.permitirEventosSimultaneos && (
                                <div>
                                    <Label>Limite de Eventos Simultâneos</Label>
                                    <Input
                                        type="number"
                                        value={configuracoes.limiteEventosSimultaneos}
                                        onChange={(e) => setConfiguracoes({
                                            ...configuracoes,
                                            limiteEventosSimultaneos: e.target.value
                                        })}
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Configurações de Participantes Globais */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="w-5 h-5" />
                                Configurações de Participantes
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Máximo de Participantes Global</Label>
                                    <Input
                                        type="number"
                                        value={configuracoes.maxParticipantesGlobal}
                                        onChange={(e) => setConfiguracoes({
                                            ...configuracoes,
                                            maxParticipantesGlobal: e.target.value
                                        })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label>Permitir Inscrições Globais</Label>
                                    <Switch
                                        checked={configuracoes.permitirInscricoesGlobais}
                                        onCheckedChange={(checked) => setConfiguracoes({
                                            ...configuracoes,
                                            permitirInscricoesGlobais: checked
                                        })}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label>Aprovar Participantes</Label>
                                    <Switch
                                        checked={configuracoes.aprovarParticipantesGlobais}
                                        onCheckedChange={(checked) => setConfiguracoes({
                                            ...configuracoes,
                                            aprovarParticipantesGlobais: checked
                                        })}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label>Obrigar CNPJ</Label>
                                    <Switch
                                        checked={configuracoes.obrigarCNPJGlobal}
                                        onCheckedChange={(checked) => setConfiguracoes({
                                            ...configuracoes,
                                            obrigarCNPJGlobal: checked
                                        })}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label>Validar Documentos</Label>
                                    <Switch
                                        checked={configuracoes.validarDocumentos}
                                        onCheckedChange={(checked) => setConfiguracoes({
                                            ...configuracoes,
                                            validarDocumentos: checked
                                        })}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Configurações de Segurança */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="w-5 h-5" />
                                Configurações de Segurança
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>Senha Padrão para Eventos</Label>
                                <div className="relative">
                                    <Input
                                        type={configuracoes.mostrarSenhaGlobal ? "text" : "password"}
                                        value={configuracoes.senhaPadraoEventos}
                                        onChange={(e) => setConfiguracoes({
                                            ...configuracoes,
                                            senhaPadraoEventos: e.target.value
                                        })}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-full px-3"
                                        onClick={() => setConfiguracoes({
                                            ...configuracoes,
                                            mostrarSenhaGlobal: !configuracoes.mostrarSenhaGlobal
                                        })}
                                    >
                                        {configuracoes.mostrarSenhaGlobal ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label>Permitir Acesso Externo</Label>
                                    <Switch
                                        checked={configuracoes.permitirAcessoExternoGlobal}
                                        onCheckedChange={(checked) => setConfiguracoes({
                                            ...configuracoes,
                                            permitirAcessoExternoGlobal: checked
                                        })}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label>Log de Todas as Ações</Label>
                                    <Switch
                                        checked={configuracoes.logTodasAcoesGlobal}
                                        onCheckedChange={(checked) => setConfiguracoes({
                                            ...configuracoes,
                                            logTodasAcoesGlobal: checked
                                        })}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label>Backup Automático</Label>
                                    <Switch
                                        checked={configuracoes.backupAutomaticoGlobal}
                                        onCheckedChange={(checked) => setConfiguracoes({
                                            ...configuracoes,
                                            backupAutomaticoGlobal: checked
                                        })}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label>Criptografar Dados</Label>
                                    <Switch
                                        checked={configuracoes.criptografarDados}
                                        onCheckedChange={(checked) => setConfiguracoes({
                                            ...configuracoes,
                                            criptografarDados: checked
                                        })}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Configurações de Notificações */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bell className="w-5 h-5" />
                                Configurações de Notificações
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>Email para Notificações</Label>
                                <Input
                                    type="email"
                                    value={configuracoes.emailNotificacoesGlobal}
                                    onChange={(e) => setConfiguracoes({
                                        ...configuracoes,
                                        emailNotificacoesGlobal: e.target.value
                                    })}
                                    placeholder="admin@rg.com"
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label>Notificar Check-in</Label>
                                    <Switch
                                        checked={configuracoes.notificarCheckinGlobal}
                                        onCheckedChange={(checked) => setConfiguracoes({
                                            ...configuracoes,
                                            notificarCheckinGlobal: checked
                                        })}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label>Notificar Check-out</Label>
                                    <Switch
                                        checked={configuracoes.notificarCheckoutGlobal}
                                        onCheckedChange={(checked) => setConfiguracoes({
                                            ...configuracoes,
                                            notificarCheckoutGlobal: checked
                                        })}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label>Notificar Empresas</Label>
                                    <Switch
                                        checked={configuracoes.notificarEmpresasGlobal}
                                        onCheckedChange={(checked) => setConfiguracoes({
                                            ...configuracoes,
                                            notificarEmpresasGlobal: checked
                                        })}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label>Notificar Relatórios</Label>
                                    <Switch
                                        checked={configuracoes.notificarRelatoriosGlobal}
                                        onCheckedChange={(checked) => setConfiguracoes({
                                            ...configuracoes,
                                            notificarRelatoriosGlobal: checked
                                        })}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Separator />

                {/* Lista Negra de Participantes */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            Lista Negra de Participantes
                        </CardTitle>
                        <CardDescription>
                            Gerencie participantes que não podem participar de nenhum evento
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={configuracoes.ativarListaNegra}
                                        onCheckedChange={(checked) => setConfiguracoes({
                                            ...configuracoes,
                                            ativarListaNegra: checked
                                        })}
                                    />
                                    <Label>Ativar Lista Negra</Label>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Quando ativada, participantes na lista negra não podem se inscrever em eventos
                                </p>
                            </div>

                            <Button
                                onClick={() => setShowAddBlacklistDialog(true)}
                                disabled={!configuracoes.ativarListaNegra}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Adicionar Participante
                            </Button>
                        </div>

                        {configuracoes.ativarListaNegra && (
                            <>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label>Validar Lista Negra Automaticamente</Label>
                                        <Switch
                                            checked={configuracoes.validarListaNegraAutomaticamente}
                                            onCheckedChange={(checked) => setConfiguracoes({
                                                ...configuracoes,
                                                validarListaNegraAutomaticamente: checked
                                            })}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <Label>Notificar Tentativas de Acesso</Label>
                                        <Switch
                                            checked={configuracoes.notificarTentativaAcesso}
                                            onCheckedChange={(checked) => setConfiguracoes({
                                                ...configuracoes,
                                                notificarTentativaAcesso: checked
                                            })}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <Label>Permitir Sobrescrever Lista Negra</Label>
                                        <Switch
                                            checked={configuracoes.permitirSobrescreverListaNegra}
                                            onCheckedChange={(checked) => setConfiguracoes({
                                                ...configuracoes,
                                                permitirSobrescreverListaNegra: checked
                                            })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label>Tempo de Retenção na Lista Negra (dias)</Label>
                                    <Input
                                        type="number"
                                        value={configuracoes.tempoRetencaoListaNegra}
                                        onChange={(e) => setConfiguracoes({
                                            ...configuracoes,
                                            tempoRetencaoListaNegra: e.target.value
                                        })}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold">Participantes na Lista Negra</h3>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm">
                                                <Upload className="w-4 h-4 mr-2" />
                                                Importar CSV
                                            </Button>
                                            <Button variant="outline" size="sm">
                                                <Download className="w-4 h-4 mr-2" />
                                                Exportar
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        {blacklistedParticipants.map((participant) => (
                                            <div
                                                key={participant.id}
                                                className="flex items-center justify-between p-3 border rounded-lg"
                                            >
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <XCircle className="w-4 h-4 text-red-500" />
                                                        <span className="font-medium">{participant.name}</span>
                                                        <Badge variant="secondary">{participant.document}</Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {participant.reason}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Adicionado em {participant.addedAt} por {participant.addedBy}
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveBlacklistedParticipant(participant)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Dialog para adicionar participante à lista negra */}
                <AlertDialog open={showAddBlacklistDialog} onOpenChange={setShowAddBlacklistDialog}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Adicionar à Lista Negra</AlertDialogTitle>
                            <AlertDialogDescription>
                                Adicione um participante à lista negra. Este participante não poderá se inscrever em nenhum evento.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label>Nome Completo</Label>
                                <Input
                                    value={newBlacklistedParticipant.name}
                                    onChange={(e) => setNewBlacklistedParticipant({
                                        ...newBlacklistedParticipant,
                                        name: e.target.value
                                    })}
                                    placeholder="Nome completo do participante"
                                />
                            </div>
                            <div>
                                <Label>Documento (CPF/CNPJ)</Label>
                                <Input
                                    value={newBlacklistedParticipant.document}
                                    onChange={(e) => setNewBlacklistedParticipant({
                                        ...newBlacklistedParticipant,
                                        document: e.target.value
                                    })}
                                    placeholder="000.000.000-00"
                                />
                            </div>
                            <div>
                                <Label>Motivo</Label>
                                <Textarea
                                    value={newBlacklistedParticipant.reason}
                                    onChange={(e) => setNewBlacklistedParticipant({
                                        ...newBlacklistedParticipant,
                                        reason: e.target.value
                                    })}
                                    placeholder="Motivo para adicionar à lista negra"
                                />
                            </div>
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleAddBlacklistedParticipant}>
                                Adicionar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Dialog de confirmação para remover da lista negra */}
                <AlertDialog open={!!deletingParticipant} onOpenChange={() => setDeletingParticipant(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Remover da Lista Negra</AlertDialogTitle>
                            <AlertDialogDescription>
                                Tem certeza que deseja remover {deletingParticipant?.name} da lista negra?
                                Este participante poderá se inscrever em eventos novamente.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmRemoveBlacklistedParticipant}>
                                Remover
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </EventLayout>
    )
}