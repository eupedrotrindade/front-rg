/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import type React from "react"

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import axios from "axios"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import * as XLSX from "xlsx"
import { saveAs } from "file-saver"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import apiClient from "@/lib/api-client"
import { formatCpf, isValidCpf } from "@/lib/utils"
import { toast } from "sonner"
import Image from "next/image"
import { Loader2, Filter, Download, Upload, Plus, Search, Check, Clock, User, Calendar, X } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useEventParticipantsByEvent } from "@/features/eventos/api/query/use-event-participants-by-event"
import type { EventParticipant } from "@/features/eventos/types"
import { createEventParticipant } from "@/features/eventos/actions/create-event-participant"
import {
    updateEventParticipant,
    checkInEventParticipant,
    checkOutEventParticipant,
} from "@/features/eventos/actions/update-event-participant"
import { useEventWristbandsByEvent } from "@/features/eventos/api/query/use-event-wristbands"
import { useEventWristbandModels } from "@/features/eventos/api/query/use-event-wristband-models"
import { useEventos } from "@/features/eventos/api/query/use-eventos"

export default function Painel() {
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const [filtro, setFiltro] = useState({ nome: "", cpf: "", pulseira: "", empresa: "", funcao: "" });
    const [colunasExtras, setColunasExtras] = useState<string[]>([]);
    const [selectedParticipant, setSelectedParticipant] = useState<EventParticipant | null>(null);
    const [modalAberto, setModalAberto] = useState(false);
    const [nomeEvento, setNomeEvento] = useState<string>("");
    const [loading, setLoading] = useState(false);

    // Estados para popups de check-in/check-out
    const [popupCheckin, setPopupCheckin] = useState(false);
    const [popupCheckout, setPopupCheckout] = useState(false);
    const [codigoPulseira, setCodigoPulseira] = useState("");
    const [participantAction, setParticipantAction] = useState<EventParticipant | null>(null);
    const [novaPulseira, setNovaPulseira] = useState("");

    // Estados para adicionar novo staff
    const [popupNovoStaff, setPopupNovoStaff] = useState(false);
    const [novoStaff, setNovoStaff] = useState({
        name: "",
        cpf: "",
        funcao: "",
        empresa: "",
        tipo_credencial: "",
        cadastrado_por: "",
        daysWork: [] as string[]
    });

    const [operadorLogado, setOperadorLogado] = useState(false);
    const [authChecked, setAuthChecked] = useState(false);
    const [operadorInfo, setOperadorInfo] = useState<{ nome: string; cpf: string } | null>(null);

    // Adicione os estados para os filtros pesquisáveis
    const [filteredEmpresas, setFilteredEmpresas] = useState<string[]>([]);
    const [filteredFuncoes, setFilteredFuncoes] = useState<string[]>([]);
    const [empresaSelectOpen, setEmpresaSelectOpen] = useState(false);
    const [empresaSearch, setEmpresaSearch] = useState("");
    const [funcaoSelectOpen, setFuncaoSelectOpen] = useState(false);
    const [funcaoSearch, setFuncaoSearch] = useState("");

    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Estados para importação e duplicados
    const [duplicadosDialogOpen, setDuplicadosDialogOpen] = useState(false);
    const [duplicadosEncontrados, setDuplicadosEncontrados] = useState<EventParticipant[]>([]);
    const [registrosUnicos, setRegistrosUnicos] = useState<EventParticipant[]>([]);
    const [importDialogLoading, setImportDialogLoading] = useState(false);
    const [resumoDialogOpen, setResumoDialogOpen] = useState(false);
    const [resumoImportacao, setResumoImportacao] = useState<{ importados: EventParticipant[]; barrados: EventParticipant[]; falhados?: { item: EventParticipant; motivo: string }[] }>({ importados: [], barrados: [], falhados: [] });

    // Estado para filtro avançado e ordenação
    const [filtroAvancadoOpen, setFiltroAvancadoOpen] = useState(false);
    const [filtroAvancado, setFiltroAvancado] = useState<Partial<EventParticipant>>({});
    const [ordenacao, setOrdenacao] = useState<{ campo: string; direcao: 'asc' | 'desc' }>({ campo: 'name', direcao: 'asc' });
    const [preLoading, setPreLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

    // Estado para tabs de dias do evento
    const [selectedDay, setSelectedDay] = useState<string>('all');

    // Estados para carrossel dos dias
    const [scrollPosition, setScrollPosition] = useState(0);
    const [showLeftArrow, setShowLeftArrow] = useState(true);
    const [showRightArrow, setShowRightArrow] = useState(true);
    const tabsContainerRef = useRef<HTMLDivElement>(null);

    // Hooks de navegação e parâmetros
    const params = useParams();
    const router = useRouter();

    // Hooks de dados - TODOS DEVEM SER CHAMADOS ANTES DE QUALQUER LÓGICA CONDICIONAL
    const eventId = params?.id as string;
    const { data: evento, isLoading: eventosLoading } = useEventos({ id: eventId });
    const {
        data: participantsData = [],
        isLoading: participantsLoading,
        isError: participantsError,
        error: participantsErrorObj,
    } = useEventParticipantsByEvent({ eventId });
    const { data: wristbands = [] } = useEventWristbandsByEvent(params?.id as string);
    const { data: wristbandModels = [] } = useEventWristbandModels();

    // Memoized values
    const wristbandMap = useMemo(() => {
        const map: Record<string, string> = {};
        wristbands.forEach(w => {
            map[w.id] = w.code;
        });
        return map;
    }, [wristbands]);

    const wristbandModelMap = useMemo(() => {
        const map: Record<string, typeof wristbandModels[0]> = {};
        wristbandModels.forEach((model: any) => {
            map[model.id] = model;
        });
        return map;
    }, [wristbandModels]);

    useEffect(() => {
        const operadorRaw = localStorage.getItem("operador");
        setOperadorLogado(!!operadorRaw);
        if (operadorRaw) {
            try {
                const operador = JSON.parse(operadorRaw);
                setOperadorInfo({ nome: operador.nome, cpf: operador.cpf });
            } catch {
                setOperadorInfo(null);
            }
        } else {
            setOperadorInfo(null);
        }
        setAuthChecked(true);
    }, []);

    // Configurar colunas extras quando os dados mudarem
    useEffect(() => {
        if (!eventId) {
            router.push("/");
            return;
        }
        if (participantsError) {
            console.error("❌ Erro ao carregar colaboradores:", participantsErrorObj);
            setColunasExtras([]);
            return;
        }
        if (!participantsData || participantsData.length === 0) {
            setColunasExtras([]);
            return;
        }

        // Configurar colunas extras (mantém a lógica original)
        if (participantsData.length > 0) {
            const chaves = Object.keys(participantsData[0]);
            const indexEmpresa = chaves.indexOf("empresa");
            const indexPulseira = chaves.indexOf("pulseira_codigo");
            if (indexEmpresa !== -1 && indexPulseira !== -1) {
                const extras = chaves.slice(indexEmpresa + 1, indexPulseira);
                setColunasExtras(extras);
            }
        }
    }, [eventId]);

    // Função para atualizar cadastrado_por quando o popup abrir
    const atualizarCadastradoPor = useCallback(() => {
        if (operadorInfo) {
            const operadorRaw = localStorage.getItem("operador");
            if (operadorRaw) {
                try {
                    const operador = JSON.parse(operadorRaw);
                    const cadastradoPor = `${operador.nome}-${operador.cpf}-${operador.id}`;
                    setNovoStaff((prev) => ({ ...prev, cadastrado_por: cadastradoPor }));
                } catch { }
            }
        }
    }, [operadorInfo]);

    // Função para validar se uma data está dentro dos períodos permitidos do evento
    const isDateWithinEventPeriods = useCallback((dateStr: string): boolean => {
        if (!evento || Array.isArray(evento)) return false;

        let inputDate: Date;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
            const [day, month, year] = dateStr.split('/');
            inputDate = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day));
        } else {
            inputDate = new Date(dateStr);
        }

        if (isNaN(inputDate.getTime())) return false;

        const eventPeriods = [
            { start: evento.setupStartDate, end: evento.setupEndDate },
            { start: evento.preparationStartDate, end: evento.preparationEndDate },
            { start: evento.finalizationStartDate, end: evento.finalizationEndDate },
            { start: evento.finalizationStartDate, end: evento.finalizationEndDate }
        ];

        return eventPeriods.some(period => {
            if (!period.start || !period.end) return false;
            const startDate = new Date(period.start);
            const endDate = new Date(period.end);
            return inputDate >= startDate && inputDate <= endDate;
        });
    }, [evento]);

    // Função para validar e processar os dias de trabalho
    const validateAndProcessDaysWork = useCallback((inputValue: string): string[] => {
        const days = inputValue.split(',').map(day => day.trim()).filter(day => day);
        const validDays: string[] = [];
        const invalidDays: string[] = [];

        days.forEach(day => {
            if (isDateWithinEventPeriods(day)) {
                let formattedDate: string;
                if (/^\d{2}\/\d{2}\/\d{4}$/.test(day)) {
                    formattedDate = day;
                } else {
                    const date = new Date(day);
                    if (!isNaN(date.getTime())) {
                        formattedDate = date.toLocaleDateString('pt-BR');
                    } else {
                        formattedDate = day;
                    }
                }
                validDays.push(formattedDate);
            } else {
                invalidDays.push(day);
            }
        });

        if (invalidDays.length > 0) {
            toast.error(`Datas inválidas removidas: ${invalidDays.join(', ')}. Apenas datas dentro dos períodos do evento são permitidas.`);
        }

        return validDays;
    }, [isDateWithinEventPeriods]);

    // Função para obter as datas permitidas para exibição
    const getPermittedDatesInfo = useCallback((): string => {
        if (!evento || Array.isArray(evento)) return "Carregando...";

        const periods = [];
        if (evento.setupStartDate && evento.setupEndDate) {
            periods.push(`Montagem: ${new Date(evento.setupStartDate).toLocaleDateString('pt-BR')} - ${new Date(evento.setupEndDate).toLocaleDateString('pt-BR')}`);
        }
        if (evento.preparationStartDate && evento.preparationEndDate) {
            periods.push(`Preparação: ${new Date(evento.preparationStartDate).toLocaleDateString('pt-BR')} - ${new Date(evento.preparationEndDate).toLocaleDateString('pt-BR')}`);
        }
        if (evento.finalizationStartDate && evento.finalizationEndDate) {
            periods.push(`Finalização: ${new Date(evento.finalizationStartDate).toLocaleDateString('pt-BR')} - ${new Date(evento.finalizationEndDate).toLocaleDateString('pt-BR')}`);
        }

        return periods.length > 0 ? periods.join(' | ') : "Nenhum período definido";
    }, [evento]);

    // Função para gerar tabs dos dias do evento
    const getEventDays = useCallback((): Array<{ id: string; label: string; date: string; type: string }> => {
        if (!evento || Array.isArray(evento)) return [];

        const days: Array<{ id: string; label: string; date: string; type: string }> = [];

        // Adicionar dia "Todos"
        days.push({ id: 'all', label: 'TODOS', date: '', type: 'all' });

        // Adicionar dias de montagem
        if (evento.setupStartDate && evento.setupEndDate) {
            const startDate = new Date(evento.setupStartDate);
            const endDate = new Date(evento.setupEndDate);
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const dateStr = date.toLocaleDateString('pt-BR');
                days.push({
                    id: dateStr,
                    label: `${dateStr} (MONTAGEM)`,
                    date: dateStr,
                    type: 'setup'
                });
            }
        }

        // Adicionar dias de preparação/evento
        if (evento.preparationStartDate && evento.preparationEndDate) {
            const startDate = new Date(evento.preparationStartDate);
            const endDate = new Date(evento.preparationEndDate);
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const dateStr = date.toLocaleDateString('pt-BR');
                days.push({
                    id: dateStr,
                    label: `${dateStr} (EVENTO)`,
                    date: dateStr,
                    type: 'preparation'
                });
            }
        }

        // Adicionar dias de finalização
        if (evento.finalizationStartDate && evento.finalizationEndDate) {
            const startDate = new Date(evento.finalizationStartDate);
            const endDate = new Date(evento.finalizationEndDate);
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const dateStr = date.toLocaleDateString('pt-BR');
                days.push({
                    id: dateStr,
                    label: `${dateStr} (DESMONTAGEM)`,
                    date: dateStr,
                    type: 'finalization'
                });
            }
        }

        return days;
    }, [evento]);

    // Função para filtrar colaboradores por dia selecionado
    const getColaboradoresPorDia = useCallback((dia: string): EventParticipant[] => {
        if (dia === 'all') {
            return participantsData;
        }

        return participantsData.filter((colab: EventParticipant) => {
            if (!colab.daysWork || colab.daysWork.length === 0) {
                return false; // Se não tem dias de trabalho definidos, não aparece em nenhum dia específico
            }
            return colab.daysWork.includes(dia);
        });
    }, [participantsData]);

    // Funções para controlar o carrossel dos dias
    const scrollToLeft = useCallback(() => {
        if (tabsContainerRef.current) {
            const container = tabsContainerRef.current;
            const scrollAmount = container.clientWidth * 0.8;
            container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        }
    }, []);

    const scrollToRight = useCallback(() => {
        if (tabsContainerRef.current) {
            const container = tabsContainerRef.current;
            const scrollAmount = container.clientWidth * 0.8;
            container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    }, []);



    // Função para obter a cor da tab baseada no tipo de dia
    const getTabColor = useCallback((type: string, isActive: boolean) => {
        if (isActive) {
            switch (type) {
                case 'setup':
                    return 'border-yellow-500 text-yellow-600 bg-yellow-50';
                case 'preparation':
                    return 'border-blue-500 text-blue-600 bg-blue-50';
                case 'finalization':
                    return 'border-purple-500 text-purple-600 bg-purple-50';
                default:
                    return 'border-purple-500 text-purple-600 bg-purple-50';
            }
        } else {
            switch (type) {
                case 'setup':
                    return 'hover:text-yellow-700 hover:border-yellow-300';
                case 'preparation':
                    return 'hover:text-blue-700 hover:border-blue-300';
                case 'finalization':
                    return 'hover:text-purple-700 hover:border-purple-300';
                default:
                    return 'hover:text-gray-700 hover:border-gray-300';
            }
        }
    }, []);

    // Função para categorizar dias de trabalho por fase do evento
    const categorizeDaysWork = useCallback((participant: EventParticipant) => {
        if (!participant.daysWork || participant.daysWork.length === 0 || !evento || Array.isArray(evento)) {
            return { setup: [], preparation: [], finalization: [] };
        }

        const categorized = {
            setup: [] as string[],
            preparation: [] as string[],
            finalization: [] as string[]
        };

        participant.daysWork.forEach(day => {
            // Normalizar a data do dia para o início do dia
            const dayDate = new Date(day.split('/').reverse().join('-'));
            dayDate.setHours(0, 0, 0, 0);

            // Verificar se o dia está no período de montagem
            if (evento.setupStartDate && evento.setupEndDate) {
                const startDate = new Date(evento.setupStartDate);
                const endDate = new Date(evento.setupEndDate);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(0, 0, 0, 0);

                if (dayDate >= startDate && dayDate <= endDate) {
                    categorized.setup.push(day);
                    return;
                }
            }

            // Verificar se o dia está no período de preparação/evento
            if (evento.preparationStartDate && evento.preparationEndDate) {
                const startDate = new Date(evento.preparationStartDate);
                const endDate = new Date(evento.preparationEndDate);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(0, 0, 0, 0);

                if (dayDate >= startDate && dayDate <= endDate) {
                    categorized.preparation.push(day);
                    return;
                }
            }

            // Verificar se o dia está no período de finalização
            if (evento.finalizationStartDate && evento.finalizationEndDate) {
                const startDate = new Date(evento.finalizationStartDate);
                const endDate = new Date(evento.finalizationEndDate);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(0, 0, 0, 0);

                if (dayDate >= startDate && dayDate <= endDate) {
                    categorized.finalization.push(day);
                    return;
                }
            }
        });

        return categorized;
    }, [evento]);

    // Função para gerar lista de datas disponíveis a partir dos períodos do evento
    const getAvailableDates = useCallback((phase?: string): string[] => {
        if (!evento || Array.isArray(evento)) return [];

        const availableDates: string[] = [];

        // Se uma fase específica foi solicitada, retornar apenas as datas dessa fase
        if (phase) {
            let startDate: string | undefined;
            let endDate: string | undefined;

            switch (phase) {
                case "preparacao":
                    startDate = evento.preparationStartDate;
                    endDate = evento.preparationEndDate;
                    break;
                case "montagem":
                    startDate = evento.setupStartDate;
                    endDate = evento.setupEndDate;
                    break;
                case "finalizacao":
                    startDate = evento.finalizationStartDate;
                    endDate = evento.finalizationEndDate;
                    break;
                default:
                    return [];
            }

            if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                // Normalizar as datas para o início do dia
                start.setHours(0, 0, 0, 0);
                end.setHours(0, 0, 0, 0);
                const currentDate = new Date(start);

                while (currentDate <= end) {
                    const formattedDate = currentDate.toLocaleDateString('pt-BR');
                    availableDates.push(formattedDate);
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            }

            return availableDates.sort();
        }

        // Se nenhuma fase foi especificada, retornar todas as datas
        const periods = [];

        if (evento.setupStartDate && evento.setupEndDate) {
            periods.push({ start: evento.setupStartDate, end: evento.setupEndDate });
        }
        if (evento.preparationStartDate && evento.preparationEndDate) {
            periods.push({ start: evento.preparationStartDate, end: evento.preparationEndDate });
        }
        if (evento.finalizationStartDate && evento.finalizationEndDate) {
            periods.push({ start: evento.finalizationStartDate, end: evento.finalizationEndDate });
        }

        periods.forEach(period => {
            const startDate = new Date(period.start);
            const endDate = new Date(period.end);
            // Normalizar as datas para o início do dia
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);
            const currentDate = new Date(startDate);

            while (currentDate <= endDate) {
                const formattedDate = currentDate.toLocaleDateString('pt-BR');
                availableDates.push(formattedDate);
                currentDate.setDate(currentDate.getDate() + 1);
            }
        });

        return availableDates.sort();
    }, [evento]);

    // Função para verificar se há períodos definidos
    const hasDefinedPeriods = useCallback((): boolean => {
        if (!evento || Array.isArray(evento)) return false;
        return !!(evento.setupStartDate && evento.setupEndDate) ||
            !!(evento.preparationStartDate && evento.preparationEndDate) ||
            !!(evento.finalizationStartDate && evento.finalizationEndDate);
    }, [evento]);

    // Função para alternar seleção de data
    const toggleDateSelection = useCallback((date: string) => {
        setNovoStaff(prev => {
            const currentDates = [...prev.daysWork];
            const dateIndex = currentDates.indexOf(date);
            if (dateIndex > -1) {
                currentDates.splice(dateIndex, 1);
            } else {
                currentDates.push(date);
            }
            return { ...prev, daysWork: currentDates.sort() };
        });
    }, []);

    // Early returns APÓS todos os hooks serem chamados
    if (eventosLoading) {
        return (
            <div className="min-h-screen bg-gray-50 text-gray-600 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="animate-spin w-8 h-8 text-purple-600 mx-auto mb-4" />
                    <p className="text-gray-600">Carregando evento...</p>
                </div>
            </div>
        );
    }

    if (!evento) {
        return (
            <div className="min-h-screen bg-gray-50 text-gray-600 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600">Evento não encontrado</p>
                </div>
            </div>
        );
    }

    console.log("evento", evento);

    const handleBusca = (valor: string) => {
        setFiltro({ ...filtro, nome: valor });
    };

    // Atualizar função de filtragem para considerar filtro avançado, ordenação e dia selecionado
    const filtrarColaboradores = (): EventParticipant[] => {
        // Primeiro filtrar por dia selecionado
        let filtrados: EventParticipant[] = getColaboradoresPorDia(selectedDay);

        // Depois aplicar filtros de busca
        filtrados = filtrados.filter((colab: EventParticipant) => {
            // Filtro rápido (nome/cpf/pulseira)
            const nomeMatch = colab.name?.toLowerCase().includes(filtro.nome.toLowerCase());
            const cpfSemPontuacao = colab.cpf?.replace(/\D/g, "");
            const buscaSemPontuacao = filtro.nome.replace(/\D/g, "");
            const cpfMatch = (
                colab.cpf === filtro.nome ||
                (cpfSemPontuacao && buscaSemPontuacao && cpfSemPontuacao === buscaSemPontuacao) ||
                (buscaSemPontuacao.length >= 3 && cpfSemPontuacao?.includes(buscaSemPontuacao))
            );
            const pulseiraMatch = colab.wristbandId?.toLowerCase() === filtro.nome.toLowerCase();
            const empresaMatch = filtro.empresa ? colab.company === filtro.empresa : true;
            const funcaoMatch = filtro.funcao ? colab.role === filtro.funcao : true;

            let match = (nomeMatch || cpfMatch || pulseiraMatch) && empresaMatch && funcaoMatch;

            // Filtro avançado
            Object.entries(filtroAvancado).forEach(([campo, valor]) => {
                const colabValue = (colab as any)[campo];
                if (valor && String(valor).trim() !== "") {
                    if (colabValue === undefined || String(colabValue).toLowerCase() !== String(valor).toLowerCase()) {
                        match = false;
                    }
                }
            });

            return match;
        });

        // Ordenação
        if (ordenacao.campo) {
            type EventParticipantKey = keyof EventParticipant;
            const campoOrdenacao = ordenacao.campo as EventParticipantKey;
            filtrados = filtrados.sort((a: EventParticipant, b: EventParticipant) => {
                let aVal = a[campoOrdenacao] ?? '';
                let bVal = b[campoOrdenacao] ?? '';

                if (ordenacao.campo === 'empresa') {
                    aVal = typeof aVal === 'string' ? aVal.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim() : '';
                    bVal = typeof bVal === 'string' ? bVal.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim() : '';
                }

                if (typeof aVal === 'string' && typeof bVal === 'string') {
                    if (ordenacao.direcao === 'asc') return aVal.localeCompare(bVal);
                    else return bVal.localeCompare(aVal);
                }
                return 0;
            });
        }

        return filtrados;
    };

    const empresasUnicas = [...new Set(participantsData.map((c: EventParticipant) => c.company))];
    const funcoesUnicas = [...new Set(participantsData.map((c: EventParticipant) => c.role))];
    const tiposCredencialUnicos = [...new Set(participantsData.map((c: EventParticipant) => c.wristbandId).filter(Boolean))];

    const empresasUnicasFiltradas = Array.from(new Set(empresasUnicas)).filter(
        (e): e is string => typeof e === "string" && !!e && e.trim() !== ""
    );
    const funcoesUnicasFiltradas = Array.from(new Set(funcoesUnicas)).filter(
        (f): f is string => typeof f === "string" && !!f && f.trim() !== ""
    );
    const tiposCredencialUnicosFiltrados = Array.from(new Set(tiposCredencialUnicos)).filter(
        (tipo): tipo is string => typeof tipo === "string" && !!tipo && tipo.trim() !== ""
    );

    const abrirPopup = (colaborador: EventParticipant) => {
        setSelectedParticipant(colaborador);
        setModalAberto(true);
    };

    const fecharPopup = () => {
        setSelectedParticipant(null);
        setModalAberto(false);
    };

    // Função para determinar qual botão mostrar
    const getBotaoAcao = (colaborador: EventParticipant) => {
        if (!colaborador.checkIn) {
            return "checkin";
        } else if (colaborador.checkIn && !colaborador.checkOut) {
            return "checkout";
        }
        return null; // Não mostra botão se já fez checkout
    };

    // Função para abrir popup de check-in
    const abrirCheckin = (colaborador: EventParticipant) => {
        setParticipantAction(colaborador);
        setCodigoPulseira("");
        setPopupCheckin(true);
    };

    // Função para abrir popup de check-out
    const abrirCheckout = (colaborador: EventParticipant) => {
        setParticipantAction(colaborador);
        setPopupCheckout(true);
    };

    // Função para registrar ações do operador
    const registerOperatorAction = async (acao: Record<string, unknown>) => {
        if (!operadorInfo) return;
        try {
            await apiClient.post("/event-histories", {
                eventId: params?.id as string,
                action: acao.action,
                performedBy: operadorInfo.nome,
                performedByCpf: operadorInfo.cpf,
                details: acao.details,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error("Erro ao registrar ação:", error);
        }
    };

    // Função para salvar nova pulseira
    const salvarNovaPulseira = async (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== "Enter" || !participantAction || !novaPulseira.trim()) return;
        setLoading(true);
        try {
            await updateEventParticipant(participantAction.id, {
                wristbandId: novaPulseira.trim(),
            });
            toast.success("Pulseira atualizada com sucesso!");
            setNovaPulseira("");
            setParticipantAction(null);
            setModalAberto(false);
            await registerOperatorAction({
                action: "UPDATE_WRISTBAND",
                details: `Pulseira alterada para: ${novaPulseira.trim()}`,
            });
        } catch (error) {
            toast.error("Erro ao atualizar pulseira.");
        }
        setLoading(false);
    };

    // Função para formatar CPF
    const formatCPF = (cpf: string): string => {
        if (!cpf) return "";
        const digits = cpf.replace(/\D/g, "");
        if (digits.length !== 11) return cpf;
        return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    };

    // Função utilitária para capitalizar cada palavra
    const capitalizeWords = (str: string): string =>
        str.replace(/(\b\w)/g, (char) => char);

    // Função para adicionar novo staff
    const adicionarNovoStaff = async () => {
        if (!novoStaff.name.trim() || !novoStaff.cpf.trim() || !novoStaff.funcao.trim() ||
            !novoStaff.empresa.trim() || !novoStaff.tipo_credencial?.trim() || !novoStaff.cadastrado_por?.trim()) {
            toast.error("Todos os campos são obrigatórios!");
            return;
        }

        const cpfNovo = novoStaff.cpf.replace(/\D/g, "");
        const cpfExistente = participantsData.some(c => c.cpf && c.cpf.replace(/\D/g, "") === cpfNovo);
        if (cpfExistente) {
            toast.error("Já existe um staff cadastrado com este CPF.");
            return;
        }

        setLoading(true);
        try {
            await createEventParticipant({
                eventId: params?.id as string,
                wristbandId: novoStaff.tipo_credencial,
                name: novoStaff.name,
                cpf: novoStaff.cpf,
                role: novoStaff.funcao,
                company: novoStaff.empresa,
                validatedBy: operadorInfo?.nome || undefined,
                daysWork: novoStaff.daysWork,
            });
            toast.success("Novo staff adicionado com sucesso!");
            setNovoStaff({
                name: "",
                cpf: "",
                funcao: "",
                empresa: "",
                tipo_credencial: "",
                cadastrado_por: "",
                daysWork: []
            });
            setPopupNovoStaff(false);
        } catch (error) {
            toast.error("Erro ao adicionar staff.");
        }
        setLoading(false);
    };

    const sair = () => {
        setPreLoading(true);
        localStorage.removeItem("staff_tabela");
        localStorage.removeItem("nome_evento");
        setTimeout(() => {
            window.location.href = "/operador/eventos";
        }, 500);
    };

    // Função para exportar para Excel
    const exportarParaExcel = () => {
        const ws = XLSX.utils.json_to_sheet(filtrarColaboradores());
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Colaboradores");
        const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        saveAs(new Blob([wbout], { type: "application/octet-stream" }), `colaboradores_${nomeEvento}.xlsx`);
    };

    // Função para baixar modelo Excel
    const baixarModeloExcel = () => {
        const ids = participantsData.map(c => Number(c.id) || 0).filter(n => !isNaN(n));
        const maxId = ids.length > 0 ? Math.max(...ids) : 0;
        const proximoId = maxId + 1;

        const modelo = [
            { id: proximoId, name: "", cpf: "", role: "", company: "", wristbandId: "" }
        ];
        const ws = XLSX.utils.json_to_sheet(modelo);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Modelo");
        const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        saveAs(new Blob([wbout], { type: "application/octet-stream" }), `modelo_colaboradores.xlsx`);
    };

    // Função para exportar barrados para CSV
    const exportarBarradosCSV = () => {
        const headers = ["Nome", "CPF", "Função", "Empresa", "Tipo Credencial"];
        const csvContent = [
            headers.join(","),
            ...resumoImportacao.barrados.map((item) =>
                [item.name, item.cpf, item.role, item.company, item.wristbandId || ""].map(f => `"${f}"`).join(",")
            ),
        ].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `colaboradores-barrados-${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
    };

    // Função para importar registros únicos
    const importarRegistrosUnicos = async () => {
        if (registrosUnicos.length === 0) return;
        setImportDialogLoading(true);
        const importados: EventParticipant[] = [];
        const falhados: { item: EventParticipant; motivo: string }[] = [];
        const BATCH_SIZE = 50;
        let loteAtual = 0;

        for (let i = 0; i < registrosUnicos.length; i += BATCH_SIZE) {
            const lote = registrosUnicos.slice(i, i + BATCH_SIZE);
            loteAtual++;
            setResumoImportacao(prev => ({ ...prev, progresso: `Enviando lote ${loteAtual} de ${Math.ceil(registrosUnicos.length / BATCH_SIZE)}` }));

            await Promise.all(lote.map(async (reg) => {
                try {
                    await createEventParticipant({
                        eventId: params?.id as string,
                        wristbandId: reg.wristbandId || "",
                        name: reg.name,
                        cpf: reg.cpf,
                        role: reg.role,
                        company: reg.company,
                        validatedBy: operadorInfo?.nome || undefined,
                        daysWork: reg.daysWork,
                    });
                    importados.push(reg);
                } catch (error) {
                    falhados.push({ item: reg, motivo: "Erro na criação" });
                }
            }));
        }

        setResumoImportacao({ importados, barrados: duplicadosEncontrados, falhados });
        setDuplicadosDialogOpen(false);
        setImportDialogLoading(false);
        setResumoDialogOpen(true);
    };

    const importarDoExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length || !operadorInfo) return;

        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onload = async (evt) => {
            const data = evt.target?.result;
            if (!data) return;

            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const json: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet);

            if (json.length > 500) {
                toast.error("O limite máximo para importação é de 500 registros por vez. Por favor, divida o arquivo e tente novamente.");
                return;
            }

            // Preencher cadastrado_por corretamente
            const operadorRaw = localStorage.getItem("operador");
            let operadorId = "";
            if (operadorRaw) {
                try {
                    const operador = JSON.parse(operadorRaw);
                    operadorId = operador.id;
                } catch { }
            }

            const cadastradoPor = `${operadorInfo.nome}-${operadorInfo.cpf}-${operadorId} [VIA EXCEL]`;

            // Validação e formatação
            const obrigatorios = ["name", "cpf", "role", "company", "wristbandId"];
            const registrosValidos: EventParticipant[] = [];
            const registrosInvalidos: { item: EventParticipant; motivo: string }[] = [];

            json.forEach((item) => {
                const staff = { ...item, cadastrado_por: cadastradoPor } as unknown as EventParticipant;

                // Checar obrigatórios
                for (const campo of obrigatorios) {
                    const valor = (staff as Record<string, unknown>)[campo];
                    if (!valor || String(valor).trim() === "") {
                        registrosInvalidos.push({ item: staff, motivo: `Campo obrigatório ausente: ${campo}` });
                        return;
                    }
                }

                // Validar CPF
                const cpfLimpo = String(staff.cpf).replace(/\D/g, "");
                if (!isValidCpf(cpfLimpo)) {
                    registrosInvalidos.push({ item: staff, motivo: "CPF inválido" });
                    return;
                }

                // Formatar CPF
                staff.cpf = formatCpf(cpfLimpo);
                registrosValidos.push(staff);
            });

            // Detectar duplicados por CPF (no sistema E no arquivo)
            const cpfsExistentes = participantsData.map(c => String(c.cpf).replace(/\D/g, ""));
            const cpfsArquivo: string[] = [];
            const duplicados: EventParticipant[] = [];
            const unicos: EventParticipant[] = [];

            registrosValidos.forEach(reg => {
                const cpfAtual = String(reg.cpf).replace(/\D/g, "");
                // Duplicado no sistema
                if (cpfsExistentes.includes(cpfAtual)) {
                    duplicados.push(reg);
                    return;
                }
                // Duplicado no próprio arquivo
                if (cpfsArquivo.includes(cpfAtual)) {
                    duplicados.push(reg);
                    return;
                }
                cpfsArquivo.push(cpfAtual);
                unicos.push(reg);
            });

            if (duplicados.length > 0) {
                setDuplicadosEncontrados(duplicados);
                setRegistrosUnicos(unicos);
                setDuplicadosDialogOpen(true);
                setLoading(false);
                setResumoImportacao({ importados: [], barrados: duplicados, falhados: registrosInvalidos });
                return;
            }

            // Importação em lotes
            setLoading(true);
            const BATCH_SIZE = 50;
            const importados: EventParticipant[] = [];
            const falhados: { item: EventParticipant; motivo: string }[] = [...registrosInvalidos];
            let loteAtual = 0;

            for (let i = 0; i < unicos.length; i += BATCH_SIZE) {
                const lote = unicos.slice(i, i + BATCH_SIZE);
                loteAtual++;
                setResumoImportacao(prev => ({ ...prev, progresso: `Enviando lote ${loteAtual} de ${Math.ceil(unicos.length / BATCH_SIZE)}` }));

                await Promise.all(lote.map(async (reg) => {
                    try {
                        await axios.post(
                            `https://app.producoesrg.com.br/api/v2/tables/eventos/records`,
                            { ...reg, status: "PENDENTE" },
                            {
                                headers: {
                                    "xc-token": "k-OqMk2ZujIQRVfqapwCWSYBZ6w5JBcrUoI34mXn",
                                    "Content-Type": "application/json"
                                }
                            }
                        );
                        importados.push(reg);
                    } catch (error) {
                        falhados.push({ item: reg, motivo: "Erro na criação" });
                    }
                }));
            }

            setResumoImportacao({ importados, barrados: duplicados, falhados });
            setLoading(false);
            setResumoDialogOpen(true);
        };

        reader.readAsArrayBuffer(file);
        e.target.value = "";
    };

    const handleOpenImportDialog = () => setImportDialogOpen(true);
    const handleProceedImport = () => {
        setImportDialogOpen(false);
        fileInputRef.current?.click();
    };

    const countFiltrosAtivos = () => {
        let count = 0;
        if (filtro.nome) count++;
        if (filtro.empresa) count++;
        if (filtro.funcao) count++;
        Object.values(filtroAvancado).forEach(val => {
            if (val && String(val).trim() !== "") count++;
        });
        return count;
    };

    // Função para confirmar check-in
    const confirmarCheckin = async () => {
        if (!participantAction || !codigoPulseira.trim()) return;
        setLoading(true);
        try {
            await checkInEventParticipant(participantAction.id, {
                validatedBy: operadorInfo?.nome || "",
                performedBy: operadorInfo?.nome || "",
                notes: undefined,
            });
            toast.success("Check-in realizado com sucesso!");
            setPopupCheckin(false);
            setParticipantAction(null);
            setCodigoPulseira("");
        } catch (error) {
            toast.error("Erro ao realizar check-in.");
        }
        setLoading(false);
    };

    // Função para confirmar check-out
    const confirmarCheckout = async () => {
        if (!participantAction) return;
        setLoading(true);
        try {
            await checkOutEventParticipant(participantAction.id, {
                validatedBy: operadorInfo?.nome || "",
                performedBy: operadorInfo?.nome || "",
                notes: undefined,
            });
            toast.success("Check-out realizado com sucesso!");
            setPopupCheckout(false);
            setParticipantAction(null);
        } catch (error) {
            toast.error("Erro ao realizar check-out.");
        }
        setLoading(false);
    };



    // Função para gerar iniciais do nome
    const getInitials = (nome: string) => nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <div className="min-h-screen bg-fuchsia-100">
            {preLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <Loader2 className="animate-spin w-16 h-16 text-purple-600" />
                </div>
            )}

            {!authChecked ? (
                <div className="flex justify-center items-center min-h-screen">
                    <Loader2 className="animate-spin w-16 h-16 text-purple-600" />
                </div>
            ) : !operadorLogado ? (
                <div className="bg-red-50 text-red-700 p-4 text-center font-medium border-b border-red-200">
                    Você precisa estar logado como operador para adicionar ou editar staff.
                </div>
            ) : (
                <>
                    {/* Header */}
                    <header className="bg-white shadow-sm border-b border-gray-200">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex justify-between items-center h-16">
                                <div className="flex items-center">
                                    <Image
                                        src="/images/logo-rg.png"
                                        width={120}
                                        height={40}
                                        className="h-8 w-auto"
                                        alt="Logo"
                                    />
                                </div>

                                <div className="flex-1 max-w-lg mx-8">
                                    <h1 className="text-xl font-semibold text-gray-900 text-center">
                                        {Array.isArray(evento) ? "Evento" : (evento?.name || "Evento")}
                                    </h1>
                                </div>

                                <div className="flex items-center space-x-4">
                                    {operadorInfo && (
                                        <div className="text-sm text-gray-600 text-right">
                                            <div className="font-medium">{operadorInfo.nome}</div>
                                            <div className="text-xs">{operadorInfo.cpf}</div>
                                        </div>
                                    )}
                                    <div className="text-sm text-gray-600">
                                        <span className="font-medium">
                                            {selectedDay === 'all'
                                                ? participantsData.length
                                                : getColaboradoresPorDia(selectedDay).length
                                            }
                                        </span> colaboradores
                                        {selectedDay !== 'all' && (
                                            <span className="text-xs text-gray-500 ml-1">
                                                (dia {selectedDay})
                                            </span>
                                        )}
                                    </div>
                                    <Button
                                        onClick={sair}
                                        variant="outline"
                                        size="sm"
                                        className="text-gray-600 hover:text-gray-900 bg-transparent"
                                    >
                                        Trocar evento
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Main Content */}
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        {/* Action Bar */}
                        <div className="mb-8">
                            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                                <div className="flex flex-wrap gap-3">
                                    <Button
                                        onClick={exportarParaExcel}
                                        variant="outline"
                                        size="sm"
                                        className="btn-brand-green"
                                        disabled={loading}
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Exportar Excel
                                    </Button>

                                    <Button
                                        onClick={handleOpenImportDialog}
                                        variant="outline"
                                        size="sm"
                                        className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 bg-white shadow-sm transition-all duration-200"
                                        disabled={loading || !operadorLogado}
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        Importar Excel
                                    </Button>

                                    <Button
                                        onClick={baixarModeloExcel}
                                        variant="outline"
                                        size="sm"
                                        className="text-violet-600 border-violet-200 hover:bg-violet-50 hover:border-violet-300 bg-white shadow-sm transition-all duration-200"
                                        disabled={loading}
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Modelo Excel
                                    </Button>

                                    <Button
                                        onClick={() => setFiltroAvancadoOpen(true)}
                                        variant="outline"
                                        size="sm"
                                        className="text-gray-600 border-gray-200 hover:bg-gray-50 text-gray-600 hover:border-gray-300 bg-white shadow-sm transition-all duration-200"
                                        disabled={loading}
                                    >
                                        <Filter className="w-4 h-4 mr-2" />
                                        Filtros
                                        {countFiltrosAtivos() > 0 && (
                                            <span className="ml-2 bg-purple-100 text-purple-800 text-xs rounded-full px-2 py-0.5 font-medium">
                                                {countFiltrosAtivos()}
                                            </span>
                                        )}
                                    </Button>
                                </div>

                                <Button
                                    onClick={() => {
                                        if (operadorLogado) {
                                            setPopupNovoStaff(true);
                                            atualizarCadastradoPor();
                                        }
                                    }}
                                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                                    disabled={loading || !operadorLogado}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Adicionar Colaborador
                                </Button>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="mb-8">
                            <div className="relative max-w-md">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    type="text"
                                    placeholder="Procure pelo colaborador, pessoa gestora ou matrícula"
                                    value={filtro.nome}
                                    onChange={(e) => handleBusca(e.target.value)}
                                    className="pl-10 bg-white border-gray-200 focus:border-purple-500 focus:ring-purple-500 shadow-sm transition-all duration-200"
                                />
                            </div>
                        </div>

                        {/* Tabs dos dias do evento com carrossel */}
                        <div className="mb-8">
                            <div className="border-b border-gray-200 bg-white rounded-t-lg relative">
                                {/* Botão de navegação esquerda */}
                                <button
                                    onClick={scrollToLeft}
                                    className="absolute left-0 top-0 bottom-0 z-10 flex items-center justify-center w-8 bg-white border-r border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors duration-200"
                                >
                                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>

                                {/* Container dos tabs com scroll */}
                                <nav
                                    ref={tabsContainerRef}
                                    className="-mb-px flex space-x-2 px-6 overflow-x-auto scrollbar-hide"
                                >
                                    {getEventDays().map((day) => {
                                        const colaboradoresNoDia = getColaboradoresPorDia(day.id).length;
                                        const isActive = selectedDay === day.id;

                                        return (
                                            <button
                                                key={day.id}
                                                onClick={() => setSelectedDay(day.id)}
                                                className={`border-b-2 py-3 px-3 text-xs font-medium transition-colors duration-200 whitespace-nowrap rounded-t-lg flex-shrink-0 ${isActive
                                                    ? getTabColor(day.type, true)
                                                    : `border-transparent text-gray-500 ${getTabColor(day.type, false)}`
                                                    }`}
                                            >
                                                {day.label} ({colaboradoresNoDia})
                                            </button>
                                        );
                                    })}
                                </nav>

                                {/* Botão de navegação direita */}
                                <button
                                    onClick={scrollToRight}
                                    className="absolute right-0 top-0 bottom-0 z-10 flex items-center justify-center w-8 bg-white border-l border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors duration-200"
                                >
                                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600">
                                        <TableHead className="px-6 py-4 text-left text-xs font-semibold  uppercase tracking-wider">
                                            Colaborador
                                        </TableHead>
                                        <TableHead className="px-6 py-4 text-left text-xs font-semibold  uppercase tracking-wider hidden md:table-cell">
                                            Departamento
                                        </TableHead>
                                        <TableHead className="px-6 py-4 text-left text-xs font-semibold  uppercase tracking-wider hidden md:table-cell">
                                            Pessoa Gestora
                                        </TableHead>
                                        <TableHead className="px-6 py-4 text-left text-xs font-semibold  uppercase tracking-wider">
                                            CPF
                                        </TableHead>
                                        <TableHead className="px-6 py-4 text-left text-xs font-semibold  uppercase tracking-wider">
                                            Ações
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="bg-white divide-y divide-gray-100 text-gray-600">
                                    {filtrarColaboradores().length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="px-6 py-16 text-center text-gray-500">
                                                <div className="flex flex-col items-center">
                                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                                        <User className="w-8 h-8 text-gray-400" />
                                                    </div>
                                                    <p className="text-lg font-semibold text-gray-700 mb-2">
                                                        {selectedDay === 'all'
                                                            ? 'Nenhum colaborador encontrado'
                                                            : `Nenhum colaborador encontrado para ${selectedDay}`
                                                        }
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {selectedDay === 'all'
                                                            ? 'Tente ajustar os filtros ou adicionar novos colaboradores'
                                                            : 'Adicione colaboradores com dias de trabalho definidos ou ajuste os filtros'
                                                        }
                                                    </p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filtrarColaboradores().map((colab: EventParticipant, index: number) => {
                                            const botaoTipo = getBotaoAcao(colab);
                                            const wristband = wristbands.find(w => w.id === colab.wristbandId);
                                            const wristbandModel = wristband ? wristbandModelMap[wristband.wristbandModelId] : undefined;

                                            return (
                                                <TableRow
                                                    key={index}
                                                    className={`hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 cursor-pointer transition-all duration-200 ${selectedDay !== 'all' && colab.daysWork && colab.daysWork.includes(selectedDay)
                                                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500'
                                                        : ''
                                                        }`}
                                                    onClick={() => abrirPopup(colab)}
                                                >
                                                    <TableCell className="px-6 py-4 whitespace-nowrap text-gray-600">
                                                        <div className="flex items-center">
                                                            <div className="flex-shrink-0 h-12 w-12">
                                                                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md">
                                                                    <span className="text-sm font-bold text-white">
                                                                        {getInitials(colab.name)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="ml-4">
                                                                <div className="text-sm font-semibold text-gray-900">
                                                                    {colab.name}
                                                                </div>
                                                                <div className="text-sm text-gray-600">
                                                                    {colab.role}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
                                                        <div className="space-y-1">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                {colab.company}
                                                            </span>
                                                            {colab.daysWork && colab.daysWork.length > 0 && (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {colab.daysWork.slice(0, 2).map((day, idx) => (
                                                                        <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                                            {day}
                                                                        </span>
                                                                    ))}
                                                                    {colab.daysWork.length > 2 && (
                                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                                                            +{colab.daysWork.length - 2}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden md:table-cell">
                                                        <p className="text-gray-600"> {colab.validatedBy || '-'}</p>
                                                    </TableCell>
                                                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                                                        <p className="text-gray-600"> {colab.cpf}</p>
                                                    </TableCell>
                                                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                        <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                                                            {botaoTipo === "checkin" && (
                                                                <Button
                                                                    onClick={() => abrirCheckin(colab)}
                                                                    size="sm"
                                                                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                                                                    disabled={loading}
                                                                >
                                                                    <Check className="w-4 h-4 mr-1" />
                                                                    Check-in
                                                                </Button>
                                                            )}
                                                            {botaoTipo === "checkout" && (
                                                                <Button
                                                                    onClick={() => abrirCheckout(colab)}
                                                                    size="sm"
                                                                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                                                                    disabled={loading}
                                                                >
                                                                    <Clock className="w-4 h-4 mr-1" />
                                                                    Check-out
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={importarDoExcel}
                        className="hidden"
                        disabled={loading || !operadorLogado}
                    />

                    {/* MODAL DETALHES DO COLABORADOR */}
                    <Dialog open={modalAberto} onOpenChange={setModalAberto}>
                        <DialogContent className="max-w-2xl bg-gradient-to-br from-white to-gray-50 border-0 shadow-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader className="pb-6">
                                <DialogTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                                        <User className="w-5 h-5 text-white" />
                                    </div>
                                    Detalhes do Colaborador
                                </DialogTitle>
                            </DialogHeader>

                            {selectedParticipant && (
                                <div className="space-y-8">
                                    {/* Informações principais */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                                <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Nome</label>
                                                <p className="text-lg font-semibold text-gray-900 mt-1">{selectedParticipant.name}</p>
                                            </div>
                                            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                                <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">CPF</label>
                                                <p className="text-lg font-mono text-gray-900 mt-1">{selectedParticipant.cpf}</p>
                                            </div>
                                            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                                <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Função</label>
                                                <p className="text-lg font-semibold text-gray-900 mt-1">{selectedParticipant.role}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                                <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Empresa</label>
                                                <p className="text-lg font-semibold text-gray-900 mt-1">{selectedParticipant.company}</p>
                                            </div>
                                            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                                <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Tipo de Credencial</label>
                                                <p className="text-lg font-semibold text-gray-900 mt-1">
                                                    {(() => {
                                                        const wristband = wristbands.find(w => w.id === selectedParticipant.wristbandId);
                                                        const wristbandModel = wristband ? wristbandModelMap[wristband.wristbandModelId] : undefined;
                                                        return wristbandModel?.credentialType || selectedParticipant.wristbandId || '-';
                                                    })()}
                                                </p>
                                            </div>
                                            {selectedParticipant.daysWork && selectedParticipant.daysWork.length > 0 && (
                                                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Dias de Trabalho</label>
                                                    <div className="mt-2 space-y-2">
                                                        {(() => {
                                                            const categorized = categorizeDaysWork(selectedParticipant);
                                                            return (
                                                                <>
                                                                    {categorized.setup.length > 0 && (
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                                                            <span className="text-sm font-medium text-gray-700">Montagem:</span>
                                                                            <span className="text-sm text-gray-600">{categorized.setup.join(', ')}</span>
                                                                        </div>
                                                                    )}
                                                                    {categorized.preparation.length > 0 && (
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                                                            <span className="text-sm font-medium text-gray-700">Preparo:</span>
                                                                            <span className="text-sm text-gray-600">{categorized.preparation.join(', ')}</span>
                                                                        </div>
                                                                    )}
                                                                    {categorized.finalization.length > 0 && (
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                                                                            <span className="text-sm font-medium text-gray-700">Finalização:</span>
                                                                            <span className="text-sm text-gray-600">{categorized.finalization.join(', ')}</span>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Campo para nova pulseira */}
                                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                                            Nova Pulseira (pressione Enter para salvar)
                                        </label>
                                        <Input
                                            type="text"
                                            value={novaPulseira}
                                            onChange={(e) => setNovaPulseira(e.target.value)}
                                            onKeyPress={salvarNovaPulseira}
                                            placeholder="Digite o código da nova pulseira"
                                            disabled={loading}
                                            className="max-w-md bg-white border-blue-300 focus:border-purple-500 focus:ring-purple-500 shadow-sm text-gray-600"
                                        />
                                    </div>

                                    {/* Status de check-in/out */}
                                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-6">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Status de Acesso</h3>
                                        <div className="grid grid-cols-1  gap-4">
                                            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                                <label className="font-semibold text-gray-600 text-sm">Código Pulseira</label>
                                                <p className="text-lg font-mono text-gray-900 mt-1">{selectedParticipant.wristbandId || '-'}</p>
                                            </div>
                                            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                                <label className="font-semibold text-gray-600 text-sm">Check-in</label>
                                                <p className="text-lg font-semibold text-gray-900 mt-1">{selectedParticipant.checkIn || '-'}</p>
                                            </div>
                                            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                                <label className="font-semibold text-gray-600 text-sm">Check-out</label>
                                                <p className="text-lg font-semibold text-gray-900 mt-1">{selectedParticipant.checkOut || '-'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Botões de ação */}
                                    <div className="flex gap-4 pt-6">
                                        {getBotaoAcao(selectedParticipant) === "checkin" && (
                                            <Button
                                                onClick={() => {
                                                    fecharPopup();
                                                    abrirCheckin(selectedParticipant);
                                                }}
                                                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                                                disabled={loading}
                                            >
                                                <Check className="w-4 h-4 mr-2" />
                                                Check-in
                                            </Button>
                                        )}
                                        {getBotaoAcao(selectedParticipant) === "checkout" && (
                                            <Button
                                                onClick={() => {
                                                    fecharPopup();
                                                    abrirCheckout(selectedParticipant);
                                                }}
                                                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 w-full"
                                                disabled={loading}
                                            >
                                                <Clock className="w-4 h-4 mr-2" />
                                                Check-out
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>

                    {/* MODAL CHECK-IN */}
                    <Dialog open={popupCheckin} onOpenChange={setPopupCheckin}>
                        <DialogContent className="max-w-md bg-gradient-to-br from-white to-green-50 border-0 shadow-2xl">
                            <DialogHeader className="pb-6">
                                <DialogTitle className="text-center text-xl font-bold text-gray-900 flex items-center justify-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                                        <Check className="w-5 h-5 text-white" />
                                    </div>
                                    Check-in
                                </DialogTitle>
                                <DialogDescription className="text-center text-gray-600">
                                    Digite o código da pulseira para confirmar o check-in
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6">
                                {participantAction && (
                                    <div className="text-center p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                                        <p className="font-bold text-gray-900 text-lg">{participantAction.name}</p>
                                        <p className="text-sm text-gray-600 mt-1">{participantAction.role}</p>
                                    </div>
                                )}

                                <Input
                                    type="text"
                                    value={codigoPulseira}
                                    onChange={(e) => setCodigoPulseira(e.target.value)}
                                    placeholder="Código da pulseira (opcional)"
                                    className="text-center text-lg bg-white border-green-300 focus:border-green-500 focus:ring-green-500 shadow-sm text-gray-600"
                                    autoFocus
                                    disabled={loading}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            confirmarCheckin();
                                        }
                                    }}
                                />

                                <div className="flex gap-4">
                                    <Button
                                        onClick={() => {
                                            setPopupCheckin(false);
                                            setParticipantAction(null);
                                            setCodigoPulseira("");
                                        }}
                                        variant="outline"
                                        className="flex-1 bg-white border-gray-300 hover:bg-gray-50 text-gray-600 hover:border-gray-400 shadow-sm"
                                        disabled={loading}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        onClick={confirmarCheckin}
                                        className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Processando...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4 mr-2" />
                                                Confirmar Check-in
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* MODAL CHECK-OUT */}
                    <Dialog open={popupCheckout} onOpenChange={setPopupCheckout}>
                        <DialogContent className="max-w-md bg-gradient-to-br from-white to-red-50 border-0 shadow-2xl">
                            <DialogHeader className="pb-6">
                                <DialogTitle className="text-center text-xl font-bold text-gray-900 flex items-center justify-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                                        <Clock className="w-5 h-5 text-white" />
                                    </div>
                                    Check-out
                                </DialogTitle>
                                <DialogDescription className="text-center text-gray-600">
                                    Confirme o check-out do colaborador
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6">
                                {participantAction && (
                                    <div className="text-center p-6 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg">
                                        <p className="font-bold text-gray-900 text-lg">{participantAction.name}</p>
                                        <p className="text-sm text-gray-600 mt-1">{participantAction.role}</p>
                                        <p className="text-xs text-red-600 mt-3 font-medium">
                                            Deseja realmente fazer o check-out?
                                        </p>
                                    </div>
                                )}

                                <div className="flex gap-4">
                                    <Button
                                        onClick={() => {
                                            setPopupCheckout(false);
                                            setParticipantAction(null);
                                        }}
                                        variant="outline"
                                        className="flex-1 bg-white border-gray-300 hover:bg-gray-50 text-gray-600 hover:border-gray-400 shadow-sm"
                                        disabled={loading}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        onClick={confirmarCheckout}
                                        className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Processando...
                                            </>
                                        ) : (
                                            <>
                                                <Clock className="w-4 h-4 mr-2" />
                                                Confirmar Check-out
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* MODAL ADICIONAR NOVO STAFF */}
                    <Dialog open={popupNovoStaff} onOpenChange={setPopupNovoStaff}>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-purple-50 border-0 shadow-2xl">
                            <DialogHeader className="pb-6">
                                <DialogTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                                        <Plus className="w-5 h-5 text-white" />
                                    </div>
                                    Adicionar Novo Colaborador
                                </DialogTitle>
                                <DialogDescription className="text-gray-600">
                                    Preencha os dados do novo colaborador
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                                            Nome completo *
                                        </label>
                                        <Input
                                            type="text"
                                            value={novoStaff.name}
                                            onChange={(e) => setNovoStaff({ ...novoStaff, name: capitalizeWords(e.target.value) })}
                                            placeholder="Digite o nome completo"
                                            disabled={loading || !operadorLogado}
                                            className="bg-gray-50 text-gray-600 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                                        />
                                    </div>

                                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                                            CPF *
                                        </label>
                                        <Input
                                            type="text"
                                            value={novoStaff.cpf}
                                            onChange={(e) => setNovoStaff({ ...novoStaff, cpf: formatCPF(e.target.value) })}
                                            placeholder="000.000.000-00"
                                            disabled={loading || !operadorLogado}
                                            className="bg-gray-50 text-gray-600 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                                        />
                                    </div>

                                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                                            Função *
                                        </label>
                                        <Input
                                            type="text"
                                            value={novoStaff.funcao}
                                            onChange={(e) => setNovoStaff({ ...novoStaff, funcao: capitalizeWords(e.target.value) })}
                                            placeholder="Digite a função"
                                            disabled={loading || !operadorLogado}
                                            className="bg-gray-50 text-gray-600 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                                        />
                                    </div>

                                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                                            Empresa *
                                        </label>
                                        <Input
                                            type="text"
                                            value={novoStaff.empresa}
                                            onChange={(e) => setNovoStaff({ ...novoStaff, empresa: capitalizeWords(e.target.value) })}
                                            placeholder="Digite a empresa"
                                            disabled={loading || !operadorLogado}
                                            className="bg-gray-50 text-gray-600 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                                        />
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                                        Tipo de Credencial *
                                    </label>
                                    <Select
                                        value={novoStaff.tipo_credencial || ""}
                                        onValueChange={(value) => setNovoStaff({ ...novoStaff, tipo_credencial: value.toUpperCase() })}
                                        disabled={tiposCredencialUnicosFiltrados.length === 0 || loading || !operadorLogado}
                                    >
                                        <SelectTrigger className="bg-gray-50 text-gray-600 border-gray-300 focus:border-purple-500 focus:ring-purple-500">
                                            <SelectValue placeholder="Selecione o tipo de credencial" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tiposCredencialUnicosFiltrados.map((tipo, idx) => {
                                                const wristband = wristbands.find(w => w.id === tipo);
                                                const wristbandModel = wristband ? wristbandModelMap[wristband.wristbandModelId] : undefined;
                                                return (
                                                    <SelectItem key={idx} value={tipo}>
                                                        {wristbandModel?.credentialType || tipo}
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
                                    <label className="block text-sm font-semibold text-gray-700 mb-4">
                                        <Calendar className="w-4 h-4 inline mr-2" />
                                        Dias de Trabalho
                                    </label>
                                    {hasDefinedPeriods() ? (
                                        <div className="space-y-4">
                                            <p className="text-sm text-gray-600 bg-white p-3 rounded-lg border border-gray-200">
                                                <strong>Selecione as datas dos períodos do evento:</strong>
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                {/* Preparação */}
                                                <div>
                                                    <p className="text-xs font-semibold text-blue-700 mb-2">Preparação</p>
                                                    <div className="flex flex-col gap-2">
                                                        {getAvailableDates("preparacao").map((date) => (
                                                            <Button
                                                                key={date}
                                                                type="button"
                                                                variant={novoStaff.daysWork.includes(date) ? "default" : "outline"}
                                                                size="sm"
                                                                onClick={() => toggleDateSelection(date)}
                                                                disabled={loading || !operadorLogado}
                                                                className={`text-xs transition-all duration-200 ${novoStaff.daysWork.includes(date)
                                                                    ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 shadow-md"
                                                                    : "bg-white text-gray-700 border-gray-300 hover:bg-purple-50 hover:border-purple-300 shadow-sm"
                                                                    }`}
                                                            >
                                                                {date}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>
                                                {/* Montagem */}
                                                <div>
                                                    <p className="text-xs font-semibold text-green-700 mb-2">Montagem</p>
                                                    <div className="flex flex-col gap-2">
                                                        {getAvailableDates("montagem").map((date) => (
                                                            <Button
                                                                key={date}
                                                                type="button"
                                                                variant={novoStaff.daysWork.includes(date) ? "default" : "outline"}
                                                                size="sm"
                                                                onClick={() => toggleDateSelection(date)}
                                                                disabled={loading || !operadorLogado}
                                                                className={`text-xs transition-all duration-200 ${novoStaff.daysWork.includes(date)
                                                                    ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 shadow-md"
                                                                    : "bg-white text-gray-700 border-gray-300 hover:bg-purple-50 hover:border-purple-300 shadow-sm"
                                                                    }`}
                                                            >
                                                                {date}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>
                                                {/* Finalização */}
                                                <div>
                                                    <p className="text-xs font-semibold text-purple-700 mb-2">Finalização</p>
                                                    <div className="flex flex-col gap-2">
                                                        {getAvailableDates("finalizacao").map((date) => (
                                                            <Button
                                                                key={date}
                                                                type="button"
                                                                variant={novoStaff.daysWork.includes(date) ? "default" : "outline"}
                                                                size="sm"
                                                                onClick={() => toggleDateSelection(date)}
                                                                disabled={loading || !operadorLogado}
                                                                className={`text-xs transition-all duration-200 ${novoStaff.daysWork.includes(date)
                                                                    ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 shadow-md"
                                                                    : "bg-white text-gray-700 border-gray-300 hover:bg-purple-50 hover:border-purple-300 shadow-sm"
                                                                    }`}
                                                            >
                                                                {date}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            {novoStaff.daysWork.length > 0 && (
                                                <div className="bg-gradient-to-r from-purple-100 to-purple-200 border border-purple-300 rounded-lg p-4">
                                                    <p className="text-sm text-purple-800 font-medium">
                                                        <strong>Datas selecionadas:</strong> {novoStaff.daysWork.join(', ')}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <Input
                                                type="text"
                                                value={novoStaff.daysWork.join(', ')}
                                                onChange={(e) => setNovoStaff({ ...novoStaff, daysWork: validateAndProcessDaysWork(e.target.value) })}
                                                placeholder="Datas de trabalho (formato: DD/MM/AAAA, separadas por vírgula)"
                                                disabled={loading || !operadorLogado}
                                                className="bg-white border-blue-300 focus:border-purple-500 focus:ring-purple-500"
                                            />
                                            <p className="text-sm text-gray-600 bg-white p-3 rounded-lg border border-gray-200">
                                                <strong>Períodos permitidos:</strong> {getPermittedDatesInfo()}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-gray-100 p-4 rounded-lg border border-gray-200">
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                                        Cadastrado por
                                    </label>
                                    <Input
                                        type="text"
                                        value={novoStaff.cadastrado_por}
                                        readOnly
                                        className="bg-gray-200 text-gray-600 cursor-not-allowed border-gray-300"
                                        disabled
                                    />
                                </div>

                                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
                                    <p className="text-sm text-amber-800 font-medium">
                                        <strong>Atenção:</strong> Todos os campos marcados com * são obrigatórios
                                    </p>
                                </div>

                                <div className="flex gap-4 pt-6">
                                    <Button
                                        onClick={() => {
                                            setPopupNovoStaff(false);
                                            setNovoStaff({
                                                name: "",
                                                cpf: "",
                                                funcao: "",
                                                empresa: "",
                                                tipo_credencial: "",
                                                cadastrado_por: "",
                                                daysWork: []
                                            });
                                        }}
                                        variant="outline"
                                        className="flex-1 bg-white border-gray-300 hover:bg-gray-50 text-gray-600 hover:border-gray-400 shadow-sm"
                                        disabled={loading}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        onClick={adicionarNovoStaff}
                                        className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                                        disabled={loading || !operadorLogado}
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Salvando...
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="w-4 h-4 mr-2" />
                                                Adicionar Colaborador
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* DIALOG IMPORTAÇÃO */}
                    <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                        <DialogContent className="max-w-lg bg-gradient-to-br from-white to-blue-50 border-0 shadow-2xl">
                            <DialogHeader className="pb-6">
                                <DialogTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                                        <Upload className="w-5 h-5 text-white" />
                                    </div>
                                    Importação em Massa
                                </DialogTitle>
                                <DialogDescription className="text-gray-600">
                                    Instruções para importar colaboradores via Excel
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6">
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                                    <h4 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                        Requisitos do arquivo:
                                    </h4>
                                    <ul className="text-sm text-blue-800 space-y-2">
                                        <li className="flex items-start gap-2">
                                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
                                            Formato: Excel (.xlsx ou .xls)
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
                                            Colunas obrigatórias: <code className="bg-blue-100 px-2 py-1 rounded text-xs font-mono">name</code>, <code className="bg-blue-100 px-2 py-1 rounded text-xs font-mono">cpf</code>, <code className="bg-blue-100 px-2 py-1 rounded text-xs font-mono">role</code>, <code className="bg-blue-100 px-2 py-1 rounded text-xs font-mono">company</code>, <code className="bg-blue-100 px-2 py-1 rounded text-xs font-mono">wristbandId</code>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
                                            Limite máximo: 500 registros por importação
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
                                            O campo <code className="bg-blue-100 px-2 py-1 rounded text-xs font-mono">cadastrado_por</code> será preenchido automaticamente
                                        </li>
                                    </ul>
                                </div>

                                <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-6">
                                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <span className="w-2 h-2 bg-gray-50 text-gray-6000 rounded-full"></span>
                                        Exemplo de linha:
                                    </h4>
                                    <div className="bg-white border border-gray-300 rounded-lg p-4 text-xs font-mono text-gray-700 shadow-sm">
                                        1, João da Silva, 123.456.789-00, Segurança, RG Produções, STAFF
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <Button
                                        onClick={() => setImportDialogOpen(false)}
                                        variant="outline"
                                        className="flex-1 bg-white border-gray-300 hover:bg-gray-50 text-gray-600 hover:border-gray-400 shadow-sm"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        onClick={handleProceedImport}
                                        className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        Selecionar Arquivo
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* DIALOG DUPLICADOS */}
                    <Dialog open={duplicadosDialogOpen} onOpenChange={setDuplicadosDialogOpen}>
                        <DialogContent className="max-w-lg bg-gradient-to-br from-white to-amber-50 border-0 shadow-2xl">
                            <DialogHeader className="pb-6">
                                <DialogTitle className="text-amber-700 text-xl font-bold flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center">
                                        <X className="w-5 h-5 text-white" />
                                    </div>
                                    Registros Duplicados Encontrados
                                </DialogTitle>
                                <DialogDescription className="text-gray-600">
                                    Alguns CPFs já existem no sistema
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6">
                                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-gray-50 to-gray-100">
                                    <p className="text-sm font-semibold text-gray-900 mb-3">CPFs duplicados:</p>
                                    <ul className="space-y-2">
                                        {duplicadosEncontrados.map((d, i) => (
                                            <li key={i} className="text-sm text-gray-700 flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                                <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                    <X className="w-3 h-3 text-red-500" />
                                                </div>
                                                <span className="font-medium">{d.name}</span>
                                                <span className="text-gray-500 font-mono">- {d.cpf}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                                    <p className="text-sm text-blue-800 font-medium">
                                        <strong>{registrosUnicos.length}</strong> registros únicos podem ser importados.
                                    </p>
                                </div>

                                <div className="flex gap-4">
                                    <Button
                                        onClick={() => setDuplicadosDialogOpen(false)}
                                        variant="outline"
                                        className="flex-1 bg-white border-gray-300 hover:bg-gray-50 text-gray-600 hover:border-gray-400 shadow-sm"
                                        disabled={importDialogLoading}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        onClick={importarRegistrosUnicos}
                                        className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                                        disabled={registrosUnicos.length === 0 || importDialogLoading}
                                    >
                                        {importDialogLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Importando...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4 mr-2" />
                                                Importar Únicos ({registrosUnicos.length})
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* DIALOG RESUMO IMPORTAÇÃO */}
                    <Dialog open={resumoDialogOpen} onOpenChange={setResumoDialogOpen}>
                        <DialogContent className="max-w-2xl bg-gradient-to-br from-white to-green-50 border-0 shadow-2xl">
                            <DialogHeader className="pb-6">
                                <DialogTitle className="text-green-700 text-xl font-bold flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                                        <Check className="w-5 h-5 text-white" />
                                    </div>
                                    Resumo da Importação
                                </DialogTitle>
                                <DialogDescription className="text-gray-600">
                                    Veja o resultado da importação dos colaboradores
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-8">
                                {/* Importados com sucesso */}
                                <div>
                                    <h4 className="font-semibold text-green-700 mb-4 flex items-center gap-3">
                                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                            <Check className="w-3 h-3 text-green-600" />
                                        </div>
                                        Importados com sucesso ({resumoImportacao.importados.length})
                                    </h4>
                                    <div className="max-h-32 overflow-y-auto border border-green-200 rounded-lg p-4 bg-gradient-to-r from-green-50 to-emerald-50">
                                        {resumoImportacao.importados.length === 0 ? (
                                            <p className="text-sm text-gray-600">Nenhum registro importado</p>
                                        ) : (
                                            <ul className="space-y-2">
                                                {resumoImportacao.importados.map((item, i) => (
                                                    <li key={i} className="text-sm text-green-800 bg-white p-2 rounded border border-green-200 shadow-sm">
                                                        {item.name} - {item.cpf}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>

                                {/* Barrados por duplicidade */}
                                {resumoImportacao.barrados.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-amber-700 mb-4 flex items-center gap-3">
                                            <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center">
                                                <X className="w-3 h-3 text-amber-600" />
                                            </div>
                                            Barrados por duplicidade ({resumoImportacao.barrados.length})
                                        </h4>
                                        <div className="max-h-32 overflow-y-auto border border-amber-200 rounded-lg p-4 bg-gradient-to-r from-amber-50 to-orange-50">
                                            <ul className="space-y-2">
                                                {resumoImportacao.barrados.map((item, i) => (
                                                    <li key={i} className="text-sm text-amber-800 bg-white p-2 rounded border border-amber-200 shadow-sm">
                                                        {item.name} - {item.cpf}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={exportarBarradosCSV}
                                            className="mt-3 text-amber-700 border-amber-300 hover:bg-amber-50 bg-white shadow-sm"
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            Baixar CSV dos barrados
                                        </Button>
                                    </div>
                                )}

                                {/* Falharam na importação */}
                                {resumoImportacao.falhados && resumoImportacao.falhados.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-red-700 mb-4 flex items-center gap-3">
                                            <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                                                <X className="w-3 h-3 text-red-600" />
                                            </div>
                                            Falharam na importação ({resumoImportacao.falhados.length})
                                        </h4>
                                        <div className="max-h-32 overflow-y-auto border border-red-200 rounded-lg p-4 bg-gradient-to-r from-red-50 to-pink-50">
                                            <ul className="space-y-2">
                                                {resumoImportacao.falhados.map((f, i) => (
                                                    <li key={i} className="text-sm text-red-800 bg-white p-2 rounded border border-red-200 shadow-sm">
                                                        {f.item.name} - {f.item.cpf}
                                                        <span className="text-red-600 ml-2">({f.motivo})</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end pt-6">
                                    <Button
                                        onClick={() => setResumoDialogOpen(false)}
                                        className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                                    >
                                        Fechar
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* DIALOG FILTRO AVANÇADO */}
                    <Dialog open={filtroAvancadoOpen} onOpenChange={setFiltroAvancadoOpen}>
                        <DialogContent className="max-w-lg bg-gradient-to-br from-white to-purple-50 border-0 shadow-2xl">
                            <DialogHeader className="pb-6">
                                <DialogTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                                        <Filter className="w-5 h-5 text-white" />
                                    </div>
                                    Filtros Avançados
                                </DialogTitle>
                                <DialogDescription className="text-gray-600">
                                    Configure filtros personalizados para a busca
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">Nome</label>
                                        <Input
                                            placeholder="Filtrar por nome"
                                            value={filtroAvancado.name || ''}
                                            onChange={e => setFiltroAvancado({ ...filtroAvancado, name: e.target.value })}
                                            className="bg-gray-50 text-gray-600 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                                        />
                                    </div>

                                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">CPF</label>
                                        <Input
                                            placeholder="Filtrar por CPF"
                                            value={filtroAvancado.cpf || ''}
                                            onChange={e => setFiltroAvancado({ ...filtroAvancado, cpf: e.target.value })}
                                            className="bg-gray-50 text-gray-600 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                                        />
                                    </div>

                                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">Função</label>
                                        <Input
                                            placeholder="Filtrar por função"
                                            value={filtroAvancado.role || ''}
                                            onChange={e => setFiltroAvancado({ ...filtroAvancado, role: e.target.value })}
                                            list="funcoes"
                                            className="bg-gray-50 text-gray-600 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                                        />
                                        <datalist id="funcoes">
                                            {funcoesUnicasFiltradas.map((funcao) => (
                                                <option key={funcao} value={funcao} />
                                            ))}
                                        </datalist>
                                    </div>

                                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">Empresa</label>
                                        <Input
                                            placeholder="Filtrar por empresa"
                                            value={filtroAvancado.company || ''}
                                            onChange={e => setFiltroAvancado({ ...filtroAvancado, company: e.target.value })}
                                            list="empresas"
                                            className="bg-gray-50 text-gray-600 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                                        />
                                        <datalist id="empresas">
                                            {empresasUnicasFiltradas.map((empresa) => (
                                                <option key={empresa} value={empresa} />
                                            ))}
                                        </datalist>
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">Tipo de Credencial</label>
                                    <Input
                                        placeholder="Filtrar por tipo de credencial"
                                        value={filtroAvancado.wristbandId || ''}
                                        onChange={e => setFiltroAvancado({ ...filtroAvancado, wristbandId: e.target.value })}
                                        className="bg-gray-50 text-gray-600 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                                    />
                                </div>

                                {/* Ordenação */}
                                <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Ordenação</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Campo</label>
                                            <Select
                                                value={ordenacao.campo}
                                                onValueChange={campo => setOrdenacao({ ...ordenacao, campo })}
                                            >
                                                <SelectTrigger className="bg-white border-gray-300 focus:border-purple-500 focus:ring-purple-500">
                                                    <SelectValue placeholder="Campo" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="name">Nome</SelectItem>
                                                    <SelectItem value="cpf">CPF</SelectItem>
                                                    <SelectItem value="role">Função</SelectItem>
                                                    <SelectItem value="company">Empresa</SelectItem>
                                                    <SelectItem value="wristbandId">Credencial</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Direção</label>
                                            <Select
                                                value={ordenacao.direcao}
                                                onValueChange={direcao => setOrdenacao({ ...ordenacao, direcao: direcao as 'asc' | 'desc' })}
                                            >
                                                <SelectTrigger className="bg-white border-gray-300 focus:border-purple-500 focus:ring-purple-500">
                                                    <SelectValue placeholder="Direção" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="asc">A-Z</SelectItem>
                                                    <SelectItem value="desc">Z-A</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-6">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setFiltroAvancado({});
                                            setOrdenacao({ campo: 'name', direcao: 'asc' });
                                        }}
                                        className="flex-1 bg-white border-gray-300 hover:bg-gray-50 text-gray-600 hover:border-gray-400 shadow-sm"
                                    >
                                        Limpar Filtros
                                    </Button>
                                    <Button
                                        onClick={() => setFiltroAvancadoOpen(false)}
                                        className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                                    >
                                        Aplicar Filtros
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </>
            )}
        </div>
    );
}
