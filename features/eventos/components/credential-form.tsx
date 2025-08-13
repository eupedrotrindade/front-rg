"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Credential, CreateCredentialRequest, UpdateCredentialRequest, Event } from "@/features/eventos/types";
import { credentialSchema, credentialUpdateSchema } from "@/features/eventos/schemas";
import { useEventos } from "@/features/eventos/api/query/use-eventos";
import { useCredentialsByEvent } from "@/features/eventos/api/query/use-credentials-by-event";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Palette, Wrench, Calendar, Truck } from "lucide-react";
import { HexColorPicker } from "react-colorful";
import { formatEventDate, getCurrentDateBR } from "@/lib/utils";

interface CredentialFormProps {
    credential?: Credential;
    onSubmit: (data: CreateCredentialRequest | UpdateCredentialRequest) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

type FormData = CreateCredentialRequest | UpdateCredentialRequest;

const generateEventDays = (event: Event): { [key: string]: string[] } => {
    const daysByStage: { [key: string]: string[] } = {
        setup: [],
        event: [],
        teardown: []
    };

    if (!event) return daysByStage;

    const formatDate = (dateString: string) => {
        return formatEventDate(dateString);
    };

    const addDaysToStage = (startDate: string, endDate: string, stage: string) => {
        const start = new Date(startDate);
        const end = new Date(endDate);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const formattedDate = formatDate(d.toISOString());
            if (!daysByStage[stage].includes(formattedDate)) {
                daysByStage[stage].push(formattedDate);
            }
        }
    };

    // Função helper para processar arrays de dados do evento
    const processEventArray = (eventData: any, stage: string) => {
        if (!eventData) return;
        
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
                return;
            }

            // Processar cada item do array
            dataArray.forEach(item => {
                if (item && item.date) {
                    const formattedDate = formatDate(item.date);
                    if (!daysByStage[stage].includes(formattedDate)) {
                        daysByStage[stage].push(formattedDate);
                    }
                }
            });
        } catch (error) {
            console.warn(`Erro ao processar dados do evento para stage ${stage}:`, error);
        }
    };

    // Processar nova estrutura do evento
    console.log('🔍 Processando dados do evento:', {
        montagem: event.montagem,
        evento: event.evento,
        desmontagem: event.desmontagem
    });
    
    processEventArray(event.montagem, 'setup');
    processEventArray(event.evento, 'event');
    processEventArray(event.desmontagem, 'teardown');
    
    console.log('🔍 Dias gerados:', {
        setup: daysByStage.setup,
        event: daysByStage.event,
        teardown: daysByStage.teardown,
        total: Object.values(daysByStage).flat().length
    });

    // Fallback para estrutura antiga (manter compatibilidade)
    if (event.setupStartDate && event.setupEndDate) {
        addDaysToStage(event.setupStartDate, event.setupEndDate, 'setup');
    }

    if (event.preparationStartDate && event.preparationEndDate) {
        addDaysToStage(event.preparationStartDate, event.preparationEndDate, 'setup');
    }

    if (event.startDate && event.endDate) {
        addDaysToStage(event.startDate, event.endDate, 'event');
    }

    if (event.finalizationStartDate && event.finalizationEndDate) {
        addDaysToStage(event.finalizationStartDate, event.finalizationEndDate, 'teardown');
    }

    // Ordenar cada etapa cronologicamente
    const sortDates = (a: string, b: string) => {
        const dateA = new Date(a.split('/').reverse().join('-'));
        const dateB = new Date(b.split('/').reverse().join('-'));
        return dateA.getTime() - dateB.getTime();
    };

    daysByStage.setup.sort(sortDates);
    daysByStage.event.sort(sortDates);
    daysByStage.teardown.sort(sortDates);

    return daysByStage;
};

const getStageInfo = (stage: string) => {
    switch (stage) {
        case 'setup':
            return {
                name: 'Montagem',
                icon: Wrench,
                color: 'text-orange-600',
                bgColor: 'bg-orange-50'
            };
        case 'event':
            return {
                name: 'Evento',
                icon: Calendar,
                color: 'text-blue-600',
                bgColor: 'bg-blue-50'
            };
        case 'teardown':
            return {
                name: 'Desmontagem',
                icon: Truck,
                color: 'text-red-600',
                bgColor: 'bg-red-50'
            };
        default:
            return {
                name: stage,
                icon: Calendar,
                color: 'text-gray-600',
                bgColor: 'bg-gray-50'
            };
    }
};

const checkOverlaps = (daysByStage: { [key: string]: string[] }) => {
    const allDays = Object.values(daysByStage).flat();
    const uniqueDays = [...new Set(allDays)];

    if (allDays.length !== uniqueDays.length) {
        return {
            hasOverlap: true,
            message: "Atenção: Existem datas sobrepostas entre as etapas do evento."
        };
    }

    return {
        hasOverlap: false,
        message: ""
    };
};

const checkDuplicateCredentials = (
    existingCredentials: Credential[],
    newCredential: CreateCredentialRequest | UpdateCredentialRequest,
    currentCredentialId?: string
): { hasDuplicate: boolean; message: string } => {
    const newDays = newCredential.days_works || [];
    const newName = newCredential.nome?.toLowerCase().trim();

    if (!newName || newDays.length === 0) {
        return { hasDuplicate: false, message: "" };
    }

    for (const credential of existingCredentials) {
        // Pular a credencial atual se estiver editando
        if (currentCredentialId && credential.id === currentCredentialId) {
            continue;
        }

        const existingName = credential.nome.toLowerCase().trim();
        const existingDays = credential.days_works || [];

        // Verificar se o nome é igual
        if (existingName === newName) {
            // Verificar se há sobreposição de dias
            const hasOverlappingDays = newDays.some(day => existingDays.includes(day));

            if (hasOverlappingDays) {
                return {
                    hasDuplicate: true,
                    message: `Já existe uma credencial chamada "${credential.nome}" com dias sobrepostos.`
                };
            }
        }
    }

    return { hasDuplicate: false, message: "" };
};

export const CredentialForm = ({
    credential,
    onSubmit,
    onCancel,
    isLoading = false,
}: CredentialFormProps) => {
    const params = useParams();
    const eventId = params.id as string;
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [selectedColor, setSelectedColor] = useState(credential?.cor || "#000000");
    const [duplicateError, setDuplicateError] = useState("");

    const isEditing = !!credential;
    const schema = isEditing ? credentialUpdateSchema : credentialSchema;

    // Buscar dados do evento
    const { data: eventData, isLoading: isLoadingEvent } = useEventos({ id: eventId });

    // Buscar credenciais existentes do evento
    const { data: existingCredentials = [] } = useCredentialsByEvent(eventId);

    // Garantir que eventData seja um objeto único
    const event = Array.isArray(eventData) ? null : eventData;

    const {
        register,
        handleSubmit,
        formState: { errors, isValid },
        setValue,
        watch,
        trigger,
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            nome: credential?.nome || "",
            cor: credential?.cor || "#000000",
            id_events: eventId,
            days_works: credential?.days_works || [],
            isActive: credential?.isActive ?? true,
            isDistributed: credential?.isDistributed ?? false,
        },
        mode: "onChange",
    });

    useEffect(() => {
        if (eventId) {
            setValue("id_events", eventId);
        }
    }, [eventId, setValue]);

    // Gerar dias disponíveis baseados no evento
    const availableDays = event ? generateEventDays(event) : {};
    const overlapInfo = checkOverlaps(availableDays);
    
    // Debug para verificar os dias disponíveis
    console.log('🔍 Debug availableDays:', {
        event: event,
        availableDays: availableDays,
        totalDays: Object.values(availableDays).flat().length,
        eventStructure: event ? {
            montagem: event.montagem,
            evento: event.evento, 
            desmontagem: event.desmontagem,
            montagemType: typeof event.montagem,
            eventoType: typeof event.evento,
            desmontagemType: typeof event.desmontagem
        } : null
    });

    useEffect(() => {
        if (Object.values(availableDays).flat().length > 0 && selectedDays.length === 0 && !credential?.days_works) {
            // Encontrar o primeiro dia disponível de qualquer etapa
            const allDays = Object.values(availableDays).flat().filter(day => day !== undefined && day !== null);
            if (allDays.length > 0) {
                setSelectedDays([allDays[0]]);
                setValue("days_works", [allDays[0]]);
                console.log('🔄 Selecionando primeiro dia disponível:', allDays[0]);
            }
        }
    }, [availableDays, selectedDays.length, credential?.days_works, setValue]);

    useEffect(() => {
        if (credential?.days_works) {
            setSelectedDays(credential.days_works);
            setValue("days_works", credential.days_works);
        }
    }, [credential, setValue]);

    // Verificar duplicatas quando os dados mudam
    useEffect(() => {
        const watchedNome = watch("nome");
        if (watchedNome && selectedDays.length > 0) {
            const formData = {
                nome: watchedNome,
                days_works: selectedDays,
                id_events: eventId,
            };

            const duplicateCheck = checkDuplicateCredentials(
                existingCredentials,
                formData,
                credential?.id
            );

            setDuplicateError(duplicateCheck.message);
        } else {
            setDuplicateError("");
        }
    }, [watch("nome"), selectedDays, existingCredentials, credential?.id, eventId]);

    const handleDayToggle = async (day: string) => {
        const newSelectedDays = selectedDays.includes(day)
            ? selectedDays.filter((d) => d !== day)
            : [...selectedDays, day];

        setSelectedDays(newSelectedDays);
        setValue("days_works", newSelectedDays);

        await trigger("days_works");
    };

    const handleColorChange = (color: string) => {
        setSelectedColor(color);
        setValue("cor", color);
        trigger("cor");
    };

    // Se não há dias disponíveis no evento, permitir criar credencial sem dias específicos
    const hasAvailableDays = Object.values(availableDays).flat().length > 0;

    // Função para extrair informações do shift ID
    const parseShiftId = (shiftId: string) => {
        const parts = shiftId.split('-');
        if (parts.length >= 5) {
            return {
                workDate: `${parts[0]}-${parts[1]}-${parts[2]}`, // YYYY-MM-DD
                workStage: parts[3] as 'montagem' | 'evento' | 'desmontagem',
                workPeriod: parts[4] as 'diurno' | 'noturno'
            };
        }
        // Fallback para dias simples (backward compatibility)
        const dateISO = shiftId.match(/\d{4}-\d{2}-\d{2}/) ? shiftId : getCurrentDateBR();
        return {
            workDate: dateISO,
            workStage: 'evento' as const,
            workPeriod: 'diurno' as const
        };
    };

    const handleFormSubmit = async (data: FormData) => {
        // Filtrar valores undefined/null do array de dias selecionados
        let cleanSelectedDays = selectedDays.filter(day => day && day.trim().length > 0);
        
        // Se não há dias válidos selecionados e não há dias disponíveis no evento, usar data atual
        let daysToSubmit = cleanSelectedDays;
        if (cleanSelectedDays.length === 0 && !hasAvailableDays) {
            daysToSubmit = [getCurrentDateBR()];
            console.log('🚀 Usando data atual como fallback:', daysToSubmit);
        }
        
        // Extrair informações de shift para cada dia selecionado
        const shiftData = daysToSubmit.map(day => {
            const shiftInfo = parseShiftId(day);
            return {
                shiftId: day,
                workDate: shiftInfo.workDate,
                workStage: shiftInfo.workStage,
                workPeriod: shiftInfo.workPeriod
            };
        });
        
        const formData = {
            ...data,
            days_works: daysToSubmit,
            cor: selectedColor,
            // Adicionar dados de shift ao modelo
            shiftData: shiftData
        };

        // Verificar duplicatas antes de submeter (apenas se há dias para verificar)
        if (daysToSubmit.length > 0) {
            const duplicateCheck = checkDuplicateCredentials(
                existingCredentials,
                formData,
                credential?.id
            );

            if (duplicateCheck.hasDuplicate) {
                setDuplicateError(duplicateCheck.message);
                return;
            }
        }

        onSubmit(formData);
    };

    const validSelectedDays = selectedDays.filter(day => day && day.trim().length > 0);
    const isFormValid = isValid && (!hasAvailableDays || validSelectedDays.length > 0) && !duplicateError;

    // Revalidar o formulário quando os dias válidos mudarem
    React.useEffect(() => {
        if (validSelectedDays.length > 0) {
            setValue("days_works", validSelectedDays);
            trigger("days_works");
        }
    }, [validSelectedDays.length, setValue, trigger]);
    
    // Debug para entender por que o botão não habilita
    console.log('🔍 Debug isFormValid:', {
        isValid: isValid,
        selectedDays: selectedDays,
        selectedDaysLength: selectedDays.length,
        validSelectedDays: validSelectedDays,
        validSelectedDaysLength: validSelectedDays.length,
        duplicateError: duplicateError,
        hasAvailableDays: hasAvailableDays,
        isFormValid: isFormValid,
        availableDaysCount: Object.values(availableDays).flat().length,
        buttonShouldBeEnabled: !isLoading && isFormValid
    });

    if (isLoadingEvent) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando dados do evento...</p>
                </div>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-center">
                    <p className="text-red-600">Erro ao carregar dados do evento</p>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            <Card className="bg-white text-gray-700">
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="nome">Nome da Credencial</Label>
                            <Input
                                id="nome"
                                {...register("nome")}
                                placeholder="Ex: Organizador, Staff, VIP"
                            />
                            {errors.nome && (
                                <p className="text-sm text-red-500">{errors.nome.message}</p>
                            )}
                            {duplicateError && (
                                <p className="text-sm text-red-500">{duplicateError}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cor">Cor</Label>
                            <div className="flex items-center space-x-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-12 h-10 p-1 border-2"
                                            style={{ backgroundColor: selectedColor }}
                                        >
                                            <Palette className="h-4 w-4 text-white" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-4 bg-white text-gray-800">
                                        <div className="space-y-3">
                                            <HexColorPicker
                                                color={selectedColor}
                                                onChange={handleColorChange}
                                                className="w-full"
                                            />
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    value={selectedColor}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                                                            handleColorChange(value);
                                                        }
                                                    }}
                                                    placeholder="#000000"
                                                    className="flex-1 text-sm font-mono"
                                                />
                                            </div>
                                            <div className="grid grid-cols-8 gap-1">
                                                {[
                                                    "#FF0000", "#FF4500", "#FF8C00", "#FFD700",
                                                    "#32CD32", "#00CED1", "#1E90FF", "#9370DB",
                                                    "#FF69B4", "#FF1493", "#DC143C", "#B22222",
                                                    "#228B22", "#008000", "#006400", "#2F4F4F",
                                                    "#696969", "#808080", "#A9A9A9", "#C0C0C0",
                                                    "#D3D3D3", "#DCDCDC", "#F5F5F5", "#FFFFFF",
                                                    "#000000", "#2F2F2F", "#4F4F4F", "#6F6F6F",
                                                    "#8F8F8F", "#AFAFAF", "#CFCFCF", "#EFEFEF"
                                                ].map((color) => (
                                                    <button
                                                        key={color}
                                                        type="button"
                                                        className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                                                        style={{ backgroundColor: color }}
                                                        onClick={() => handleColorChange(color)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <Input
                                    {...register("cor")}
                                    value={selectedColor}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setSelectedColor(value);
                                        setValue("cor", value);
                                        trigger("cor");
                                    }}
                                    placeholder="#000000"
                                    className="flex-1"
                                />
                            </div>
                            {errors.cor && (
                                <p className="text-sm text-red-500">{errors.cor.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Dias de Trabalho</Label>
                        {overlapInfo.hasOverlap && (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                <p className="text-sm text-yellow-800">
                                    ⚠️ {overlapInfo.message}
                                </p>
                            </div>
                        )}
                        <div className="space-y-4">
                            {Object.keys(availableDays).length === 0 || Object.values(availableDays).flat().length === 0 ? (
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                                    <p className="text-sm text-blue-800">
                                        ℹ️ Nenhum dia específico configurado para este evento. 
                                        A credencial será criada com a data atual ({getCurrentDateBR()}) como padrão.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {Object.entries(availableDays).map(([stage, days]) => {
                                        const stageInfo = getStageInfo(stage);
                                        const IconComponent = stageInfo.icon;

                                        return (
                                            <div key={stage} className={`p-4 rounded-lg border ${stageInfo.bgColor}`}>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <IconComponent className={`h-5 w-5 ${stageInfo.color}`} />
                                                    <h3 className={`font-semibold ${stageInfo.color}`}>
                                                        {stageInfo.name}
                                                    </h3>
                                                    <span className="text-sm text-gray-500">
                                                        ({days.length} dia{days.length !== 1 ? 's' : ''})
                                                    </span>
                                                </div>
                                                {days.length > 0 ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {days.map((day) => (
                                                            <Badge
                                                                key={day}
                                                                variant={selectedDays.includes(day) ? "default" : "outline"}
                                                                className={`cursor-pointer ${selectedDays.includes(day) ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`}
                                                                onClick={() => handleDayToggle(day)}
                                                            >
                                                                {day}
                                                                {selectedDays.includes(day) && (
                                                                    <X className="ml-1 h-3 w-3" />
                                                                )}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-500 italic">
                                                        Nenhum dia configurado para esta etapa
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {errors.days_works && (
                                        <p className="text-sm text-red-500">{errors.days_works.message}</p>
                                    )}
                                    {selectedDays.length === 0 && !errors.days_works && (
                                        <p className="text-sm text-amber-600">
                                            Selecione pelo menos um dia de trabalho
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                            <input
                                id="is_active"
                                type="checkbox"
                                {...register("isActive")}
                                className="accent-blue-600 w-4 h-4"
                            />
                            <Label htmlFor="is_active">Credencial ativa</Label>
                        </div>
                        {errors.isActive && (
                            <p className="text-sm text-red-500">{errors.isActive.message}</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    disabled={isLoading || (!isFormValid && Object.values(availableDays).flat().length === 0)}
                    className={isLoading || (!isFormValid && Object.values(availableDays).flat().length === 0) ? "opacity-50 cursor-not-allowed" : ""}
                >
                    {isLoading ? "Salvando..." : credential ? "Atualizar" : "Criar"}
                </Button>
            </div>
        </form>
    );
}; 