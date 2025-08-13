/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Building, Calendar, Sun, Moon } from "lucide-react"
import { toast } from "sonner"
import { useCreateEmpresa } from "@/features/eventos/api/mutation"
import { useEventos } from "@/features/eventos/api/query"
import type { CreateEmpresaRequest } from "@/features/eventos/types"
import EventLayout from "@/components/dashboard/dashboard-layout"
import { useParams, useRouter } from "next/navigation"
import { formatEventDate } from "@/lib/utils"

export default function CreateEmpresaPage() {
    const [formData, setFormData] = useState<CreateEmpresaRequest>({
        nome: "",
        cnpj: "",
        email: "",
        telefone: "",
        endereco: "",
        cidade: "",
        estado: "",
        cep: "",
        responsavel: "",
        observacoes: "",
        id_evento: "",
        days: []
    })

    // Hooks
    const eventId = useParams().id as string
    const router = useRouter()
    const { data: eventos = [] } = useEventos()
    const createEmpresaMutation = useCreateEmpresa()
    const { data: event } = useEventos({ id: eventId })

    // Função para gerar dias do evento
    const getEventDays = useCallback((): Array<{ id: string; label: string; date: string; type: string; period?: 'diurno' | 'noturno' }> => {
        if (!event) return []

        // console.log('🔍 Gerando dias do evento:', event);

        const days: Array<{ id: string; label: string; date: string; type: string; period?: 'diurno' | 'noturno' }> = []

        // Função helper para processar arrays de dados do evento
        const processEventArray = (eventData: any, stage: string, stageName: string) => {
            if (!eventData) {
                console.log(`❌ ${stage}Data está vazio ou undefined`);
                return;
            }

            console.log(`📊 Processando ${stage}Data:`, eventData);

            try {
                let dataArray: any[] = [];

                // Se for string JSON, fazer parse
                if (typeof eventData === 'string') {
                    dataArray = JSON.parse(eventData);
                }
                // Se já for array, usar diretamente
                else if (Array.isArray(eventData)) {
                    dataArray = eventData;
                }
                // Se não for nem string nem array, sair
                else {
                    console.warn(`⚠️ ${stage}Data não é string nem array:`, typeof eventData, eventData);
                    return;
                }

                console.log(`🔍 DataArray para ${stage}:`, dataArray);

                // Processar cada item do array
                dataArray.forEach((item, index) => {
                    console.log(`🔍 Processando item ${index} de ${stage}:`, item);

                    if (item && item.date) {
                        // Garantir que a data está no formato correto
                        const dateObj = new Date(item.date);
                        if (isNaN(dateObj.getTime())) {
                            console.warn(`⚠️ Data inválida encontrada em ${stage}[${index}]:`, item.date);
                            return;
                        }

                        const formattedDate = formatEventDate(dateObj.toISOString());

                        // Usar o período do item se disponível, senão calcular
                        let period: 'diurno' | 'noturno';
                        if (item.period && (item.period === 'diurno' || item.period === 'noturno')) {
                            period = item.period;
                        } else {
                            // Fallback: calcular baseado na hora
                            const hour = dateObj.getHours();
                            period = (hour >= 6 && hour < 18) ? 'diurno' : 'noturno';
                        }

                        // Criar ID único baseado na data e período
                        const dayId = `${dateObj.toISOString().split('T')[0]}-${stage}-${period}`;

                        console.log(`✅ Adicionando dia: ${dayId} (período: ${period})`);

                        days.push({
                            id: dayId,
                            label: `${formattedDate} (${stageName} - ${period === 'diurno' ? 'Diurno' : 'Noturno'})`,
                            date: formattedDate,
                            type: stage,
                            period
                        });
                    } else {
                        console.warn(`⚠️ Item sem date em ${stage}[${index}]:`, item);
                    }
                });

            } catch (error) {
                console.error(`❌ Erro ao processar dados de ${stage}:`, error);
            }
        };

        // Processar cada etapa do evento (usando campos corretos)
        if (event?.montagem) {
            console.log('🔄 Processando montagem...');
            processEventArray(event.montagem, 'montagem', 'Montagem');
        }

        if (event?.evento) {
            console.log('🔄 Processando evento...');
            processEventArray(event.evento, 'evento', 'Evento');
        }

        if (event?.desmontagem) {
            console.log('🔄 Processando desmontagem...');
            processEventArray(event.desmontagem, 'desmontagem', 'Desmontagem');
        }

        // Ordenar por data
        const sortedDays = days.sort((a, b) => {
            const dateA = new Date(a.id.split('-').slice(0, 3).join('-'));
            const dateB = new Date(b.id.split('-').slice(0, 3).join('-'));
            return dateA.getTime() - dateB.getTime();
        });

        console.log('📅 Dias finais gerados:', sortedDays);
        return sortedDays;
    }, [event])

    const availableDays = useMemo(() => getEventDays(), [getEventDays])

    // Nome do evento para exibir na interface
    const eventName = useMemo(() => {
        if (!event) return "Carregando..."
        // Se event for array (da lista), usar o primeiro item
        return Array.isArray(event) ? event[0]?.name || "Evento sem nome" : event?.name || "Evento sem nome"
    }, [event])

    const handleInputChange = (field: keyof CreateEmpresaRequest, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleDayToggle = (dayId: string, checked: boolean) => {
        setFormData(prev => ({
            ...prev,
            days: checked
                ? [...(prev.days || []), dayId]
                : (prev.days || []).filter(id => id !== dayId)
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.nome.trim()) {
            toast.error("Nome da empresa é obrigatório")
            return
        }

        if (!formData.days || formData.days.length === 0) {
            toast.error("Selecione pelo menos um dia/turno")
            return
        }

        try {
            // Criar uma empresa para cada turno selecionado
            const empresasToCreate = formData.days?.map((day, index) => {
                const availableDay = availableDays.find(d => d.id === day)
                
                // Para resolver o problema de CNPJ unique constraint:
                // Remover completamente o campo CNPJ se estiver vazio para evitar conflito
                const empresaDataBase: any = {
                    nome: formData.nome,
                    email: formData.email,
                    telefone: formData.telefone,
                    endereco: formData.endereco,
                    cidade: formData.cidade,
                    estado: formData.estado,
                    cep: formData.cep,
                    responsavel: formData.responsavel,
                    observacoes: formData.observacoes,
                    id_evento: eventId,
                    days: formData.days
                }

                // Só incluir CNPJ se não estiver vazio
                if (formData.cnpj && formData.cnpj.trim() !== "") {
                    empresaDataBase.cnpj = formData.cnpj.trim()
                }

                if (availableDay) {
                    return {
                        ...empresaDataBase,
                        // Usar as novas colunas individuais
                        shiftId: availableDay.id,
                        workDate: availableDay.id.split('-').slice(0, 3).join('-'),
                        workStage: availableDay.type as 'montagem' | 'evento' | 'desmontagem',
                        workPeriod: availableDay.period as 'diurno' | 'noturno'
                    }
                }

                return {
                    ...empresaDataBase,
                    shiftId: `${day}-evento-diurno`,
                    workDate: day,
                    workStage: 'evento' as const,
                    workPeriod: 'diurno' as const
                }
            }) || []

            console.log('🏢 Criando empresas por turno:', empresasToCreate)

            // Criar todas as empresas (uma para cada turno)
            const createPromises = empresasToCreate.map(empresaData =>
                createEmpresaMutation.mutateAsync(empresaData)
            )

            await Promise.all(createPromises)
            toast.success(`Empresa criada com sucesso em ${empresasToCreate.length} turno(s)!`)

            // Redirecionar de volta para a lista de empresas
            router.push(`/eventos/${eventId}/empresas`)
        } catch (error) {
            console.error("Erro ao criar empresa:", error)
            toast.error("Erro ao criar empresa")
        }
    }

    const handleCancel = () => {
        router.push(`/eventos/${eventId}/empresas`)
    }

    return (
        <EventLayout eventId={eventId} eventName={eventName}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancel}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Voltar
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <Building className="h-6 w-6 text-purple-600" />
                                Nova Empresa
                            </h1>
                            <p className="text-gray-600 mt-1">
                                Cadastre uma nova empresa para o evento: <span className="font-medium text-purple-600">{eventName}</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building className="h-5 w-5" />
                            Informações da Empresa
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Informações do Evento */}
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="h-5 w-5 text-purple-600" />
                                    <h4 className="font-medium text-purple-900">Evento Selecionado</h4>
                                </div>
                                <p className="text-purple-800 font-medium">{eventName}</p>
                                <p className="text-sm text-purple-600 mt-1">
                                    A empresa será automaticamente vinculada a este evento
                                </p>
                            </div>

                            {/* Informações Básicas */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="nome">Nome da Empresa *</Label>
                                    <Input
                                        id="nome"
                                        type="text"
                                        value={formData.nome}
                                        onChange={(e) => handleInputChange('nome', e.target.value)}
                                        placeholder="Digite o nome da empresa"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="cnpj">CNPJ</Label>
                                    <Input
                                        id="cnpj"
                                        type="text"
                                        value={formData.cnpj || ''}
                                        onChange={(e) => handleInputChange('cnpj', e.target.value)}
                                        placeholder="00.000.000/0000-00"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">E-mail</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email || ''}
                                        onChange={(e) => handleInputChange('email', e.target.value)}
                                        placeholder="empresa@exemplo.com"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="telefone">Telefone</Label>
                                    <Input
                                        id="telefone"
                                        type="text"
                                        value={formData.telefone || ''}
                                        onChange={(e) => handleInputChange('telefone', e.target.value)}
                                        placeholder="(11) 99999-9999"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="responsavel">Responsável</Label>
                                    <Input
                                        id="responsavel"
                                        type="text"
                                        value={formData.responsavel || ''}
                                        onChange={(e) => handleInputChange('responsavel', e.target.value)}
                                        placeholder="Nome do responsável"
                                    />
                                </div>
                            </div>

                            {/* Endereço */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Endereço</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="endereco">Endereço</Label>
                                        <Input
                                            id="endereco"
                                            type="text"
                                            value={formData.endereco || ''}
                                            onChange={(e) => handleInputChange('endereco', e.target.value)}
                                            placeholder="Rua, número, complemento"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="cep">CEP</Label>
                                        <Input
                                            id="cep"
                                            type="text"
                                            value={formData.cep || ''}
                                            onChange={(e) => handleInputChange('cep', e.target.value)}
                                            placeholder="00000-000"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="cidade">Cidade</Label>
                                        <Input
                                            id="cidade"
                                            type="text"
                                            value={formData.cidade || ''}
                                            onChange={(e) => handleInputChange('cidade', e.target.value)}
                                            placeholder="Nome da cidade"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="estado">Estado</Label>
                                        <Input
                                            id="estado"
                                            type="text"
                                            value={formData.estado || ''}
                                            onChange={(e) => handleInputChange('estado', e.target.value)}
                                            placeholder="UF"
                                            maxLength={2}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Observações */}
                            <div className="space-y-2">
                                <Label htmlFor="observacoes">Observações</Label>
                                <Textarea
                                    id="observacoes"
                                    value={formData.observacoes || ''}
                                    onChange={(e) => handleInputChange('observacoes', e.target.value)}
                                    placeholder="Observações adicionais sobre a empresa"
                                    rows={3}
                                />
                            </div>

                            {/* Seleção de Dias/Turnos */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-purple-600" />
                                    <h3 className="text-lg font-semibold">Dias e Turnos de Trabalho *</h3>
                                </div>
                                <p className="text-sm text-gray-600">
                                    Selecione os dias e turnos em que a empresa estará presente no evento
                                </p>

                                {availableDays.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {availableDays.map(day => (
                                            <div
                                                key={day.id}
                                                className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50"
                                            >
                                                <Checkbox
                                                    id={day.id}
                                                    checked={formData.days?.includes(day.id) || false}
                                                    onCheckedChange={(checked) =>
                                                        handleDayToggle(day.id, checked as boolean)
                                                    }
                                                />
                                                <div className="flex flex-col space-y-1 flex-1">
                                                    <label
                                                        htmlFor={day.id}
                                                        className="text-sm font-medium cursor-pointer"
                                                    >
                                                        {day.date}
                                                    </label>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-xs ${day.type === 'montagem' ? 'border-blue-500 text-blue-700' :
                                                                day.type === 'evento' ? 'border-green-500 text-green-700' :
                                                                    'border-orange-500 text-orange-700'
                                                                }`}
                                                        >
                                                            {day.type === 'montagem' ? 'Montagem' :
                                                                day.type === 'evento' ? 'Evento' : 'Desmontagem'}
                                                        </Badge>
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-xs flex items-center gap-1 ${day.period === 'diurno' ? 'border-yellow-500 text-yellow-700' :
                                                                'border-indigo-500 text-indigo-700'
                                                                }`}
                                                        >
                                                            {day.period === 'diurno' ? (
                                                                <>
                                                                    <Sun className="h-3 w-3" />
                                                                    Diurno
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Moon className="h-3 w-3" />
                                                                    Noturno
                                                                </>
                                                            )}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                        <p>Nenhum dia disponível encontrado para este evento</p>
                                    </div>
                                )}
                            </div>

                            {/* Botões de Ação */}
                            <div className="flex justify-end gap-3 pt-6 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCancel}
                                    disabled={createEmpresaMutation.isPending}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={!formData.nome.trim() || !formData.days?.length || createEmpresaMutation.isPending}
                                    className="bg-purple-600 hover:bg-purple-700"
                                >
                                    {createEmpresaMutation.isPending ? "Criando..." : "Criar Empresa"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </EventLayout>
    )
}