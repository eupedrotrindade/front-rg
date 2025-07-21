/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import axios from "axios";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import apiClient from "@/lib/api-client";
import { v4 as uuidv4 } from "uuid";
import { formatCpf, isValidCpf } from "@/lib/utils";
import { toast } from "sonner";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { getEventParticipantsByEvent } from "@/features/eventos/actions/get-event-participant";
import { useParams, useRouter } from "next/navigation";
import { useEventParticipantsByEvent } from "@/features/eventos/api/query/use-event-participants-by-event";
import { EventParticipant } from "@/features/eventos/types";
import { createEventParticipant } from "@/features/eventos/actions/create-event-participant";
import { updateEventParticipant, checkInEventParticipant, checkOutEventParticipant } from "@/features/eventos/actions/update-event-participant";
import { deleteEventParticipant } from "@/features/eventos/actions/delete-event-participant";
import { useEventWristbandsByEvent } from "@/features/eventos/api/query/use-event-wristbands";
import { useEventWristbandModels } from "@/features/eventos/api/query/use-event-wristband-models";

export default function Painel() {
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const [participants, setParticipants] = useState<EventParticipant[]>([]);
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
        cadastrado_por: ""
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
    const [ordenacao, setOrdenacao] = useState<{ campo: string; direcao: 'asc' | 'desc' }>({ campo: 'nome', direcao: 'asc' });

    const [preLoading, setPreLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

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


    const params = useParams();
    const router = useRouter();




    // Corrigido: não chame hooks dentro de funções ou callbacks!
    // Use o hook useEventParticipantsByEvent no corpo do componente e reaja às mudanças via useEffect

    // 1. Use o hook no corpo do componente (fora de qualquer função/callback)
    const eventId = params?.id as string;
    const {
        data: participantsData = [],
        isLoading: participantsLoading,
        isError: participantsError,
        error: participantsErrorObj,
    } = useEventParticipantsByEvent(eventId);

    const { data: wristbands = [] } = useEventWristbandsByEvent(params?.id as string);
    const wristbandMap = useMemo(() => {
        const map: Record<string, string> = {};
        wristbands.forEach(w => {
            map[w.id] = w.code;
        });
        return map;
    }, [wristbands]);

    const { data: wristbandModels = [] } = useEventWristbandModels();
    const wristbandModelMap = useMemo(() => {
        const map: Record<string, typeof wristbandModels[0]> = {};
        wristbandModels.forEach((model: any) => {
            map[model.id] = model;
        });
        return map;
    }, [wristbandModels]);

    // 2. Atualize os participantes e colunas extras quando os dados mudarem
    useEffect(() => {
        if (!eventId) {
            router.push("/");
            return;
        }

        if (participantsError) {
            // Feedback de erro (pode ser aprimorado com Sonner/toast)
            console.error("❌ Erro ao carregar colaboradores:", participantsErrorObj);
            setParticipants([]);
            setColunasExtras([]);
            return;
        }

        if (!participantsData || participantsData.length === 0) {
            setParticipants([]);
            setColunasExtras([]);
            return;
        }

        setParticipants(participantsData);

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
    }, [eventId, participantsData, participantsError, participantsErrorObj, router]);



    useEffect(() => {
        if (popupNovoStaff && operadorInfo) {
            const operadorRaw = localStorage.getItem("operador");
            if (operadorRaw) {
                try {
                    const operador = JSON.parse(operadorRaw);
                    const cadastradoPor = `${operador.nome}-${operador.cpf}-${operador.id}`;
                    setNovoStaff((prev) => ({ ...prev, cadastrado_por: cadastradoPor }));
                } catch { }
            }
        }
    }, [popupNovoStaff, operadorInfo]);

    const handleBusca = (valor: string) => {
        setFiltro({ ...filtro, nome: valor });
    };

    // Atualizar função de filtragem para considerar filtro avançado e ordenação
    const filtrarColaboradores = (): EventParticipant[] => {
        let filtrados: EventParticipant[] = participants.filter((colab: EventParticipant) => {
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
            // Garantir que o campo de ordenação é uma chave válida de EventParticipant
            type EventParticipantKey = keyof EventParticipant;
            const campoOrdenacao = ordenacao.campo as EventParticipantKey;

            filtrados = filtrados.sort((a: EventParticipant, b: EventParticipant) => {
                let aVal = a[campoOrdenacao] ?? '';
                let bVal = b[campoOrdenacao] ?? '';
                // Melhorar ordenação de empresa: normalizar acentos, caixa e tratar vazios
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

    const empresasUnicas = [...new Set(participants.map((c: EventParticipant) => c.company))];
    const funcoesUnicas = [...new Set(participants.map((c: EventParticipant) => c.role))];
    const tiposCredencialUnicos = [...new Set(participants.map((c: EventParticipant) => c.wristbandId).filter(Boolean))];

    const empresasUnicasFiltradas = Array.from(new Set(empresasUnicas)).filter(
        (e): e is string => typeof e === "string" && !!e && e.trim() !== ""
    );
    const funcoesUnicasFiltradas = Array.from(new Set(funcoesUnicas)).filter(
        (f): f is string => typeof f === "string" && !!f && f.trim() !== ""
    );
    const tiposCredencialUnicosFiltrados = Array.from(new Set(tiposCredencialUnicos)).filter(
        (tipo): tipo is string => typeof tipo === "string" && !!tipo && tipo.trim() !== ""
    );

    console.log("empresasUnicasFiltradas", empresasUnicasFiltradas);
    console.log("funcoesUnicasFiltradas", funcoesUnicasFiltradas);
    console.log('tiposCredencialUnicosFiltrados', tiposCredencialUnicosFiltrados);

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

    // Função utilitária para registrar ação do operador pegando do arquivo realtime
    const registerOperatorAction = async (acao: Record<string, unknown>) => {
        const operadorRaw = localStorage.getItem("operador");
        if (!operadorRaw) return;
        let operador;
        try {
            operador = JSON.parse(operadorRaw);
        } catch {
            return;
        }
        const cpf = operador.cpf;
        if (!cpf) return;
        const operadorAtual = operador;
        const id = operadorAtual.id;
        const acoesAntigas = Array.isArray(operadorAtual.acoes) ? operadorAtual.acoes : [];
        const novaAcao = { ...acao, timestamp: new Date().toISOString() };
        const novasAcoes = [...acoesAntigas, novaAcao];

        try {
            // Atualiza no backend e usa o retorno para atualizar localStorage
            const response = await apiClient.put(`/operadores/${id}`, {
                acoes: novasAcoes
            });
            if (response && response.data) {
                localStorage.setItem("operador", JSON.stringify(response.data));
            } else {
                // fallback caso não venha o operador atualizado
                const operadorAtualizado = { ...operador, acoes: novasAcoes };
                localStorage.setItem("operador", JSON.stringify(operadorAtualizado));
            }
        } catch (error: unknown) {
            let errorMsg = "Erro ao atualizar operador.";
            if (
                typeof error === "object" &&
                error !== null &&
                "response" in error &&
                typeof (error as { response?: unknown }).response === "object" &&
                (error as { response?: { data?: unknown } }).response !== null &&
                "data" in (error as { response?: { data?: unknown } }).response! &&
                typeof ((error as { response: { data?: unknown } }).response.data) === "object" &&
                (error as { response: { data: { message?: string } } }).response.data !== null &&
                "message" in (error as { response: { data: { message?: string } } }).response.data
            ) {
                errorMsg = ((error as { response: { data: { message?: string } } }).response.data.message) || errorMsg;
            } else if (typeof error === "object" && error && "message" in error) {
                errorMsg = (error as { message?: string }).message || errorMsg;
            }
            if (
                typeof error === "object" &&
                error !== null &&
                "response" in error &&
                (error as { response?: { status?: number } }).response?.status === 404
            ) {
                toast.error("Operador não encontrado! " + errorMsg);
            } else {
                toast.error("Erro ao atualizar operador: " + errorMsg);
            }
        }
    };

    // Função para salvar nova pulseira
    const salvarNovaPulseira = async (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && novaPulseira.trim() && selectedParticipant) {
            const participantId = selectedParticipant.id;
            if (!participantId) {
                toast.error("Erro: ID do participante não encontrado.");
                return;
            }
            setLoading(true);
            try {
                await updateEventParticipant(participantId, { wristbandId: novaPulseira.trim() });
                toast.success("Nova pulseira salva com sucesso!");
                setNovaPulseira("");

                // Registrar ação do operador na troca de pulseira
                await registerOperatorAction({
                    type: "troca_pulseira",
                    staffId: participantId,
                    staffName: selectedParticipant.name,
                    wristbandId: novaPulseira.trim() || "",
                    tabela: "eventos", // Assuming 'eventos' is the correct table for this action
                    evento: nomeEvento || "",
                    credencial: selectedParticipant.wristbandId || "",
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                toast.error("Erro ao atualizar pulseira.");
            }
            setLoading(false);
        }
    };

    // Função utilitária para formatar CPF
    const formatCPF = (cpf: string): string => {
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
            alert("Todos os campos são obrigatórios!");
            return;
        }
        const cpfNovo = novoStaff.cpf.replace(/\D/g, "");
        const cpfExistente = participants.some(c => c.cpf && c.cpf.replace(/\D/g, "") === cpfNovo);
        if (cpfExistente) {
            alert("Já existe um staff cadastrado com este CPF.");
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
            });
            toast.success("Novo staff adicionado com sucesso!");
            setNovoStaff({
                name: "",
                cpf: "",
                funcao: "",
                empresa: "",
                tipo_credencial: "",
                cadastrado_por: ""
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
        // Simula um pequeno delay para mostrar o loader (remova se não quiser delay)
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
        // Descobrir o maior Id existente
        const ids = participants.map(c => Number(c.id) || 0).filter(n => !isNaN(n));
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

    // Função para importar apenas registros únicos (sem duplicados), em lotes de 20, registrando falhas
    const importarRegistrosUnicos = async () => {
        setImportDialogLoading(true);
        const importados: EventParticipant[] = [];
        const falhados: { item: EventParticipant; motivo: string }[] = [];
        const loteSize = 20;
        for (let i = 0; i < registrosUnicos.length; i += loteSize) {
            const lote = registrosUnicos.slice(i, i + loteSize);
            await Promise.all(lote.map(async (reg) => {
                try {
                    await createEventParticipant({
                        eventId: params?.id as string,
                        wristbandId: reg.wristbandId,
                        name: reg.name,
                        cpf: reg.cpf,
                        role: reg.role,
                        company: reg.company,
                        validatedBy: operadorInfo?.nome || undefined,
                    });
                    importados.push(reg);
                } catch (err: unknown) {
                    const motivo = "Erro desconhecido ao importar";
                    falhados.push({ item: reg, motivo });
                }
            }));
        }
        setResumoImportacao({ importados, barrados: duplicadosEncontrados, falhados });
        setDuplicadosDialogOpen(false);
        setResumoDialogOpen(true);
        setRegistrosUnicos([]);
        setDuplicadosEncontrados([]);

        setImportDialogLoading(false);
    };

    // Função para importar do Excel (otimizada)
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
                alert("O limite máximo para importação é de 500 registros por vez. Por favor, divida o arquivo e tente novamente.");
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
                    // Usar type assertion para acessar propriedades dinamicamente de forma segura
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
            const cpfsExistentes = participants.map(c => String(c.cpf).replace(/\D/g, ""));
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
                // Adiciona duplicados como barrados no resumo
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
                // Feedback visual de progresso
                setResumoImportacao(prev => ({ ...prev, progresso: `Enviando lote ${loteAtual} de ${Math.ceil(unicos.length / BATCH_SIZE)}` }));
                await Promise.all(lote.map(async (reg) => {
                    try {
                        await axios.post(
                            `https://app.producoesrg.com.br/api/v2/tables/eventos/records`, // Changed from tabelaStaff to 'eventos'
                            { ...reg, status: "PENDENTE" },
                            {
                                headers: {
                                    "xc-token": "k-OqMk2ZujIQRVfqapwCWSYBZ6w5JBcrUoI34mXn",
                                    "Content-Type": "application/json"
                                }
                            }
                        );
                        importados.push(reg);
                    } catch (err: unknown) {
                        let motivo = "Erro desconhecido ao importar";
                        if (
                            err &&
                            typeof err === "object" &&
                            "response" in err &&
                            err.response &&
                            typeof err.response === "object" &&
                            "data" in err.response &&
                            err.response.data &&
                            typeof err.response.data === "object" &&
                            "message" in err.response.data &&
                            typeof err.response.data.message === "string"
                        ) {
                            motivo = err.response.data.message;
                        }
                        falhados.push({ item: reg, motivo });
                    }
                }));
            }
            setResumoImportacao({ importados, barrados: [], falhados });
            setLoading(false);

        };
        reader.readAsArrayBuffer(file);
    };

    const handleOpenImportDialog = () => setImportDialogOpen(true);
    const handleProceedImport = () => {
        setImportDialogOpen(false);
        fileInputRef.current?.click();
    };

    // Função para contar filtros aplicados
    const countFiltrosAtivos = () => {
        let count = 0;
        // Filtros rápidos
        Object.entries(filtro).forEach(([k, v]) => {
            if (v && v.trim() !== "") count++;
        });
        // Filtros avançados
        Object.entries(filtroAvancado).forEach(([k, v]) => {
            if (v && String(v).trim() !== "") count++;
        });
        return count;
    };

    // Função para confirmar check-in
    const confirmarCheckin = async () => {
        if (!participantAction) return;
        setLoading(true);
        try {
            await checkInEventParticipant(participantAction.id, {
                validatedBy: operadorInfo?.nome || "",
                performedBy: operadorInfo?.nome || "",
                notes: codigoPulseira.trim() ? `Pulseira: ${codigoPulseira.trim()}` : undefined,
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

    return (
        <div className="min-h-screen bg-[#ffe7fe] text-[#fff] font-fira flex flex-col">
            {preLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <Loader2 className="animate-spin w-16 h-16 text-fuchsia-700" />
                </div>
            )}
            {!authChecked ? (
                <div className="flex justify-center items-center min-h-screen">
                    <Loader2 className="animate-spin w-16 h-16 text-fuchsia-700" />
                </div>
            ) : !operadorLogado ? (
                <div className="bg-red-100 text-red-700 p-3 text-center font-bold border-b border-red-300">
                    Você precisa estar logado como operador para adicionar ou editar staff.
                </div>
            ) : (
                <>
                    <header className="flex justify-between items-center p-4 border-b border-[#610e5c] ">
                        {/* LOGO ALTERADA: Desktop usa logo-rg-fone.png, Mobile mantém logo-rg.png */}
                        <Image src="/images/logo-rg-fone.png" width={160} height={160} className="w-20 hidden md:block" alt="Logo RG Fone" />
                        <Image src="/images/logo-rg.png" width={160} height={160} className="w-20 md:hidden" alt="Logo RG" />
                        <div className="text-2xl font-bold text-center  flex justify-center items-center" ><p className="p-4 bg-fuchsia-900 opacity-90 rounded-2xl">{nomeEvento}</p></div>
                        <div className="flex items-center gap-4 p-4 bg-fuchsia-900 opacity-90 rounded-2xl">
                            {operadorInfo && (
                                <span className="text-sm font-medium flex flex-col items-end mr-2">
                                    <span>Operador: {operadorInfo.nome}</span>
                                    <span>CPF: {operadorInfo.cpf}</span>
                                </span>
                            )}
                            <span className="text-sm font-medium">
                                Total: {participants.length} registros
                            </span>
                            <button onClick={sair} className="bg-fuchsia-950 text-white px-4 py-2 rounded">Trocar evento</button>
                        </div>
                    </header>

                    <div className="p-4">
                        {/* BOTÕES DE EXCEL E ADICIONAR */}
                        <div className="cursor-pointer mb-4 flex flex-wrap gap-3 items-center">
                            <Button
                                onClick={exportarParaExcel}
                                className="cursor-pointer bg-gradient-to-r from-green-500 to-green-700 text-white px-5 py-2 rounded-lg shadow hover:from-green-600 hover:to-green-800 flex items-center gap-2 transition-all duration-200"
                                disabled={loading}
                            >
                                Exportar para Excel
                            </Button>
                            <Button
                                type="button"
                                className="cursor-pointer bg-gradient-to-r from-blue-500 to-blue-700 text-white px-5 py-2 rounded-lg shadow hover:from-blue-600 hover:to-blue-800 flex items-center gap-2 transition-all duration-200"
                                onClick={handleOpenImportDialog}
                                disabled={loading || !operadorLogado}
                            >
                                Importar do Excel
                            </Button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={importarDoExcel}
                                className="hidden"
                                disabled={loading || !operadorLogado}
                            />
                            <Button
                                onClick={baixarModeloExcel}
                                className="cursor-pointer bg-gradient-to-r from-fuchsia-500 to-fuchsia-700 text-white px-5 py-2 rounded-lg shadow hover:from-fuchsia-600 hover:to-fuchsia-800 flex items-center gap-2 transition-all duration-200"
                                disabled={loading}
                            >
                                Baixar modelo Excel
                            </Button>
                            <Button
                                onClick={() => operadorLogado && setPopupNovoStaff(true)}
                                className="cursor-pointer bg-gradient-to-r from-pink-500 to-pink-700 text-white px-6 py-2 rounded-lg shadow hover:from-pink-600 hover:to-pink-800 flex items-center gap-2 font-semibold uppercase tracking-wide transition-all duration-200"
                                disabled={loading || !operadorLogado}
                            >
                                Adicionar novo staff
                            </Button>
                            <Button
                                onClick={() => setFiltroAvancadoOpen(true)}
                                className="cursor-pointer bg-gradient-to-r from-purple-500 to-purple-700 text-white px-5 py-2 rounded-lg shadow hover:from-purple-600 hover:to-purple-800 flex items-center gap-2 transition-all duration-200"
                                disabled={loading}
                            >
                                Filtro Avançado
                            </Button>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 mb-4">
                            <Input
                                type="text"
                                placeholder="Buscar por nome, CPF ou pulseira"
                                value={filtro.nome}
                                onChange={(e) => handleBusca(e.target.value)}
                                className="w-full md:w-1/2 bg-white text-black border-none"
                            />
                            {countFiltrosAtivos() > 0 && (
                                <div className="flex items-center gap-2">
                                    <Button
                                        className="cursor-pointer bg-gradient-to-r from-gray-400 to-gray-600 text-white px-5 py-2 rounded-lg shadow hover:from-gray-500 hover:to-gray-700 flex items-center gap-2 transition-all duration-200"
                                        onClick={() => {
                                            setFiltro({ nome: "", cpf: "", pulseira: "", empresa: "", funcao: "" });
                                            setFiltroAvancado({});
                                            setEmpresaSearch("");
                                            setFuncaoSearch("");
                                            setFilteredEmpresas([]);
                                            setFilteredFuncoes([]);
                                            setOrdenacao({ campo: 'nome', direcao: 'asc' });
                                        }}
                                    >
                                        Limpar filtros
                                    </Button>
                                    <span className="text-xs bg-white border-black text-gray-700 rounded-full px-2 py-1 font-semibold">{countFiltrosAtivos()}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-4 mb-4">
                            <Button
                                className={`px-4 py-2 rounded ${viewMode === 'table' ? 'bg-fuchsia-700 text-white cursor-pointer' : 'bg-gray-400 text-gray-700 cursor-pointer'}`}
                                onClick={() => setViewMode('table')}
                            >
                                Tabela
                            </Button>
                            <Button
                                className={`px-4 py-2 rounded ${viewMode === 'cards' ? 'bg-fuchsia-700 text-white cursor-pointer' : 'bg-gray-400 text-gray-800 cursor-pointer'}`}
                                onClick={() => setViewMode('cards')}
                            >
                                Cards
                            </Button>
                        </div>

                        {viewMode === 'table' ? (
                            <div>
                                {/* TABELA ORIGINAL */}
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-[#610e5c] text-white">
                                            <TableHead className="px-4 py-2">Nome</TableHead>
                                            <TableHead className="px-4 py-2 hidden md:table-cell">CPF</TableHead>
                                            <TableHead className="px-4 py-2 hidden md:table-cell">Função</TableHead>
                                            <TableHead className="px-4 py-2 hidden md:table-cell">Empresa</TableHead>
                                            <TableHead className="px-4 py-2 hidden md:table-cell">Tipo Credencial</TableHead>
                                            <TableHead className="px-4 py-2 md:hidden">CPF</TableHead>
                                            <TableHead className="px-4 py-2">Ação</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="text-[#610e5c]">
                                        {filtrarColaboradores().length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                                    Nenhum resultado encontrado para os filtros aplicados.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filtrarColaboradores().map((colab: EventParticipant, index: number) => {
                                                const botaoTipo = getBotaoAcao(colab);
                                                const wristband = wristbands.find(w => w.id === colab.wristbandId);
                                                const wristbandModel = wristband ? wristbandModelMap[wristband.wristbandModelId] : undefined;
                                                return (
                                                    <TableRow key={index} className="hover:bg-[#f3e0f3] bg-white rounded-2xl">
                                                        <TableCell
                                                            className="px-4 py-2 cursor-pointer"
                                                            onClick={() => abrirPopup(colab)}
                                                        >
                                                            {colab.name}
                                                        </TableCell>
                                                        <TableCell
                                                            className="px-4 py-2 hidden md:table-cell cursor-pointer"
                                                            onClick={() => abrirPopup(colab)}
                                                        >
                                                            {colab.cpf}
                                                        </TableCell>
                                                        <TableCell
                                                            className="px-4 py-2 hidden md:table-cell cursor-pointer"
                                                            onClick={() => abrirPopup(colab)}
                                                        >
                                                            {colab.role}
                                                        </TableCell>
                                                        <TableCell
                                                            className="px-4 py-2 hidden md:table-cell cursor-pointer"
                                                            onClick={() => abrirPopup(colab)}
                                                        >
                                                            {colab.company}
                                                        </TableCell>
                                                        <TableCell
                                                            className="px-4 py-2 hidden md:table-cell cursor-pointer"
                                                            onClick={() => abrirPopup(colab)}
                                                        >
                                                            {wristbandModel?.credentialType || '-'}
                                                        </TableCell>
                                                        <TableCell
                                                            className="px-4 py-2 md:hidden cursor-pointer"
                                                            onClick={() => abrirPopup(colab)}
                                                        >
                                                            {colab.cpf}
                                                        </TableCell>
                                                        <TableCell className="px-4 py-2">
                                                            {botaoTipo === "checkin" && (
                                                                <Button
                                                                    onClick={() => abrirCheckin(colab)}
                                                                    className="bg-[#0bd310] text-[#fff] px-3 py-1 rounded text-sm hover:bg-[#0aa80e] btn-checkin"
                                                                    disabled={loading}
                                                                    variant="default"
                                                                    size="sm"
                                                                >
                                                                    Check-in
                                                                </Button>
                                                            )}
                                                            {botaoTipo === "checkout" && (
                                                                <Button
                                                                    onClick={() => abrirCheckout(colab)}
                                                                    className="bg-[#f20a1c] text-[#fff] px-3 py-1 rounded text-sm hover:bg-[#e3091a] btn-checkout"
                                                                    disabled={loading}
                                                                    variant="default"
                                                                    size="sm"
                                                                >
                                                                    Check-out
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filtrarColaboradores().length === 0 ? (
                                    <div className="col-span-full text-center py-8 text-gray-500">Nenhum resultado encontrado para os filtros aplicados.</div>
                                ) : (
                                    filtrarColaboradores().map((colab: EventParticipant, index: number) => {
                                        const botaoTipo = getBotaoAcao(colab);
                                        // Gerar iniciais do nome
                                        const getInitials = (nome: string) => nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                                        return (
                                            <div
                                                key={index}
                                                className="relative bg-gradient-to-br from-purple-700 via-purple-800 to-violet-900 rounded-2xl shadow-md p-0 flex flex-col justify-between border border-purple-900 hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                                                onClick={() => abrirPopup(colab)}
                                            >
                                                {/* Header */}
                                                <div className="flex items-start gap-3 p-5 pb-2">
                                                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-700">
                                                        {getInitials(colab.name)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-lg font-bold text-white">{colab.name}</span>
                                                            <span className="inline-block bg-white/20 text-purple-100 text-xs font-semibold rounded px-2 py-1 ml-2">{colab.wristbandId || 'STAFF'}</span>
                                                        </div>
                                                        <div className="text-sm text-gray-500 mt-1">
                                                            {typeof colab.email === 'string' && colab.email && <div>{colab.email}</div>}
                                                            {typeof colab.phone === 'string' && colab.phone && <div>{colab.phone}</div>}
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Tags e ações rápidas */}
                                                <div className="flex items-center gap-2 px-5 py-2">
                                                    {/* Exemplo de tag, pode adaptar para status/filtros se desejar */}
                                                    {/* <span className="bg-blue-100 text-blue-700 text-xs font-semibold rounded px-2 py-1">Frio</span> */}
                                                </div>
                                                {/* Info principais */}
                                                <div className="flex flex-col gap-1 px-5 pb-2 text-sm">
                                                    <div><span className="font-semibold text-purple-100">CPF:</span> <span className="text-white/90">{colab.cpf}</span></div>
                                                    <div><span className="font-semibold text-purple-100">Função:</span> <span className="text-white/90">{colab.role}</span></div>
                                                    <div><span className="font-semibold text-purple-100">Empresa:</span> <span className="text-white/90">{colab.company}</span></div>
                                                </div>
                                                {/* Footer com ações */}
                                                <div className="flex items-center justify-between border-t border-gray-100 bg-purple-900 rounded-b-2xl px-5 py-3 mt-2">
                                                    <div className="flex gap-2">
                                                        {botaoTipo === "checkin" && (
                                                            <Button
                                                                onClick={e => { e.stopPropagation(); abrirCheckin(colab); }}
                                                                className="bg-green-600 hover:bg-green-700 text-white font-semibold rounded shadow px-4 py-1"
                                                                disabled={loading}
                                                                variant="default"
                                                                size="sm"
                                                            >
                                                                Check-in
                                                            </Button>
                                                        )}
                                                        {botaoTipo === "checkout" && (
                                                            <Button
                                                                onClick={e => { e.stopPropagation(); abrirCheckout(colab); }}
                                                                className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded shadow px-4 py-1"
                                                                disabled={loading}
                                                                variant="default"
                                                                size="sm"
                                                            >
                                                                Check-out
                                                            </Button>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-blue-200 font-semibold hover:underline cursor-pointer" onClick={e => { e.stopPropagation(); abrirPopup(colab); }}>Ver detalhes</span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>

                    <footer className="text-center pt-[25px] pb-[25px]">
                        <Image width={160} height={160} src="/images/slogan-rg.png" alt="Slogan RG" className="mx-auto max-w-xs" />
                    </footer>

                    {/* POPUP PRINCIPAL - Detalhes do Colaborador */}
                    {modalAberto && selectedParticipant && (
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-[25px]">
                            <div className="bg-white text-black rounded-lg w-full max-w-2xl p-6 relative">
                                {/* HEADER COM ESPAÇAMENTO MELHORADO */}
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-bold">Credenciamento</h2>
                                    <div className="flex items-center gap-4">
                                        <Image src="/images/logo-rg.png" width={160} height={160} className="w-12" alt="Logo RG" />
                                        <button onClick={fecharPopup} className="text-2xl font-bold">×</button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p><strong>Nome:</strong> {selectedParticipant.name}</p>
                                    <p><strong>CPF:</strong> {selectedParticipant.cpf}</p>
                                    <p><strong>Função:</strong> {selectedParticipant.role}</p>
                                    <p><strong>Empresa:</strong> {selectedParticipant.company}</p>

                                    {/* TIPO DE CREDENCIAL: Busca por diferentes nomes possíveis */}
                                    {Object.keys(selectedParticipant).map((col, idx) => {
                                        if ((col.toLowerCase().includes('wristbandid') || col.toLowerCase().includes('credencial')) &&
                                            !['wristbandid_old', 'credencial_old'].includes(col.toLowerCase()) &&
                                            Object.prototype.hasOwnProperty.call(selectedParticipant, col) &&
                                            (selectedParticipant as any)[col] !== undefined && (selectedParticipant as any)[col] !== null) {
                                            return (
                                                <p key={idx}>
                                                    <strong>Tipo de Credencial:</strong> {String((selectedParticipant as any)[col])}
                                                </p>
                                            );
                                        }
                                        return null;
                                    })}

                                    {/* Outras colunas extras */}
                                    {colunasExtras.map((col, idx) => {
                                        if (typeof col === 'string' && !col.toLowerCase().includes('wristbandid') && !col.toLowerCase().includes('credencial')) {
                                            return (
                                                <p key={idx}>
                                                    <strong>{col.charAt(0).toUpperCase() + col.slice(1).replace(/_/g, ' ')}:</strong> {(selectedParticipant as any)[col] !== undefined && (selectedParticipant as any)[col] !== null ? String((selectedParticipant as any)[col]) : ""}
                                                </p>
                                            );
                                        }
                                        return null;
                                    })}
                                </div>

                                {/* Campo para nova pulseira */}
                                <div className="mt-4 border-t pt-4">
                                    <div className="mb-3">
                                        <label className="block text-sm font-medium mb-1">Nova Pulseira (pressione Enter para salvar):</label>
                                        <input
                                            type="text"
                                            value={novaPulseira}
                                            onChange={(e) => setNovaPulseira(e.target.value)}
                                            onKeyPress={salvarNovaPulseira}
                                            placeholder="Digite o código da nova pulseira"
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#610e5c]"
                                            disabled={loading}
                                        />
                                    </div>
                                </div>

                                {/* Rodapé com informações de pulseira e timestamps */}
                                <div className="mt-4 border-t pt-4 text-sm text-gray-600">
                                    <p><strong>Código Pulseira:</strong> {selectedParticipant.wristbandId}</p>
                                    <p><strong>Check-in:</strong> {selectedParticipant.checkIn}</p>
                                    <p><strong>Check-out:</strong> {selectedParticipant.checkOut}</p>
                                </div>

                                {/* Botões de ação no popup */}
                                <div className="mt-4 flex gap-2">
                                    {/* CORES ALTERADAS: Check-in VERDE */}
                                    {getBotaoAcao(selectedParticipant) === "checkin" && (
                                        <button
                                            onClick={() => {
                                                fecharPopup();
                                                abrirCheckin(selectedParticipant);
                                            }}
                                            className="bg-[#0bd310] text-[#fff] px-4 py-2 rounded hover:bg-[#0aa80e]"
                                            disabled={loading}
                                        >
                                            Check-in
                                        </button>
                                    )}
                                    {/* CORES ALTERADAS: Check-out VERMELHO */}
                                    {getBotaoAcao(selectedParticipant) === "checkout" && (
                                        <button
                                            onClick={() => {
                                                fecharPopup();
                                                abrirCheckout(selectedParticipant);
                                            }}
                                            className="bg-[#f20a1c] text-[#fff] px-4 py-2 rounded hover:bg-[#e3091a]"
                                            disabled={loading}
                                        >
                                            Check-out
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* POPUP CHECK-IN */}
                    {popupCheckin && (
                        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 px-4">
                            <div className="bg-zinc-700 text-black rounded-lg w-full max-w-md p-6">
                                <h2 className="text-xl font-bold mb-2 text-center">Digite o código da pulseira</h2>

                                {/* NOVO: Tipo de Credencial no popup check-in */}
                                {participantAction && Object.keys(participantAction).map((col, idx) => {
                                    if ((col.toLowerCase().includes('wristbandid') || col.toLowerCase().includes('credencial')) &&
                                        !['wristbandid_old', 'credencial_old'].includes(col.toLowerCase()) &&
                                        Object.prototype.hasOwnProperty.call(participantAction, col) &&
                                        (participantAction as any)[col] !== undefined && (participantAction as any)[col] !== null) {
                                        return (
                                            <p key={idx} className="text-center text-gray-600 mb-4">
                                                <strong>Tipo de Credencial:</strong> {String((participantAction as any)[col])}
                                            </p>
                                        );
                                    }
                                    return null;
                                })}

                                <input
                                    type="text"
                                    value={codigoPulseira}
                                    onChange={(e) => setCodigoPulseira(e.target.value)}
                                    placeholder="Código da pulseira (opcional)"
                                    className="w-full px-4 py-3 border border-gray-300 rounded mb-4 text-center text-lg"
                                    autoFocus
                                    disabled={loading}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            confirmarCheckin();
                                        }
                                    }}
                                />

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setPopupCheckin(false);
                                            setParticipantAction(null);
                                            setCodigoPulseira("");
                                        }}
                                        className="flex-1 bg-gray-500 text-white py-3 rounded hover:bg-gray-600"
                                        disabled={loading}
                                    >
                                        Cancelar
                                    </button>
                                    {/* COR ALTERADA: Botão check-in VERDE */}
                                    <button
                                        onClick={() => confirmarCheckin()}
                                        className="flex-1 bg-[#0bd310] text-[#fff] py-3 rounded hover:bg-[#0aa80e]"
                                        disabled={loading}
                                        type="button"
                                    >
                                        {loading ? "Salvando..." : "Confirmar Check-in"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* POPUP CHECK-OUT */}
                    {popupCheckout && (
                        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 px-4">
                            <div className="bg-zinc-700 text-black rounded-lg w-full max-w-md p-6">
                                <h2 className="text-xl font-bold mb-4 text-center">Confirmar Check-out</h2>

                                <p className="text-center mb-6 text-gray-700">
                                    Deseja realmente fazer o check-out de <strong>{participantAction?.name}</strong>?
                                </p>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setPopupCheckout(false);
                                            setParticipantAction(null);
                                        }}
                                        className="flex-1 bg-gray-500 text-white py-3 rounded hover:bg-gray-600"
                                        disabled={loading}
                                    >
                                        Cancelar
                                    </button>
                                    {/* COR ALTERADA: Botão check-out VERMELHO */}
                                    <button
                                        onClick={confirmarCheckout}
                                        className="flex-1 bg-[#f20a1c] text-[#fff] py-3 rounded hover:bg-[#e3091a]"
                                        disabled={loading}
                                    >
                                        {loading ? "Processando..." : "Confirmar Check-out"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* POPUP ADICIONAR NOVO STAFF */}
                    {popupNovoStaff && (
                        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 px-4">
                            <div className="bg-zinc-700 text-black rounded-lg w-full max-w-md p-6">
                                <h2 className="text-xl font-bold mb-4 text-center">Adicionar Novo Staff</h2>
                                <div className="space-y-4">
                                    <Input
                                        type="text"
                                        value={novoStaff.name}
                                        onChange={(e) => setNovoStaff({ ...novoStaff, name: capitalizeWords(e.target.value) })}
                                        placeholder="Nome completo *"
                                        className="w-full"
                                        disabled={loading || !operadorLogado}
                                    />
                                    <Input
                                        type="text"
                                        value={novoStaff.cpf}
                                        onChange={(e) => setNovoStaff({ ...novoStaff, cpf: formatCPF(e.target.value) })}
                                        placeholder="CPF *"
                                        className="w-full"
                                        disabled={loading || !operadorLogado}
                                    />
                                    <Input
                                        type="text"
                                        value={novoStaff.funcao}
                                        onChange={(e) => setNovoStaff({ ...novoStaff, funcao: capitalizeWords(e.target.value) })}
                                        placeholder="Função *"
                                        className="w-full"
                                        disabled={loading || !operadorLogado}
                                    />
                                    <Input
                                        type="text"
                                        value={novoStaff.empresa}
                                        onChange={(e) => setNovoStaff({ ...novoStaff, empresa: capitalizeWords(e.target.value) })}
                                        placeholder="Empresa *"
                                        className="w-full"
                                        disabled={loading || !operadorLogado}
                                    />
                                    <Select
                                        value={novoStaff.tipo_credencial || ""}
                                        onValueChange={(value) => setNovoStaff({ ...novoStaff, tipo_credencial: value.toUpperCase() })}
                                        disabled={tiposCredencialUnicosFiltrados.length === 0 || loading || !operadorLogado}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Selecione o tipo de credencial *" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tiposCredencialUnicosFiltrados.map((tipo, idx) => {
                                                const wristband = wristbands.find(w => w.id === tipo);
                                                const wristbandModel = wristband ? wristbandModelMap[wristband.wristbandModelId] : undefined;
                                                return (
                                                    <SelectItem key={idx} value={tipo}>{wristbandModel?.credentialType || tipo}</SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                    <div className="space-y-1">
                                        <label className="block text-sm font-medium text-gray-700">Cadastrado por</label>
                                        <Input
                                            type="text"
                                            value={novoStaff.cadastrado_por}
                                            readOnly
                                            className="w-full opacity-70 cursor-not-allowed bg-gray-500"
                                            style={{ pointerEvents: 'none' }}
                                        />
                                    </div>
                                </div>
                                <p className="text-sm text-gray-500 mt-2 text-center">* Todos os campos são obrigatórios</p>
                                <div className="flex gap-3 mt-6">
                                    <Button
                                        onClick={() => {
                                            setPopupNovoStaff(false);
                                            setNovoStaff({
                                                name: "",
                                                cpf: "",
                                                funcao: "",
                                                empresa: "",
                                                tipo_credencial: "",
                                                cadastrado_por: ""
                                            });
                                        }}
                                        className="flex-1 bg-gray-500 text-white py-3 rounded hover:bg-gray-600"
                                        disabled={loading}
                                        variant="secondary"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        onClick={adicionarNovoStaff}
                                        className="flex-1 bg-[#610e5c] text-white py-3 rounded hover:bg-[#4a0b47]"
                                        disabled={loading || !operadorLogado}
                                        variant="default"
                                    >
                                        {loading ? "Salvando..." : "Confirmar"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Dialog explicativo da importação */}
                    <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                        <DialogContent className="">
                            <DialogHeader>
                                <DialogTitle>Importação em Massa de Colaboradores</DialogTitle>
                                <DialogDescription>
                                    <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
                                        <li>O arquivo deve ser Excel (.xlsx ou .xls).</li>
                                        <li>Colunas obrigatórias: <b>name</b>, <b>cpf</b>, <b>role</b>, <b>company</b>, <b>wristbandId</b>.</li>
                                        <li>O campo <b>cadastrado_por</b> será preenchido automaticamente.</li>
                                        <li>Recomenda-se baixar o modelo para garantir o formato correto.</li>
                                        <li>Exemplo de linha:<br />
                                            <span className="bg-zinc-600 text-xs px-2 py-1 rounded inline-block mt-1">1, João da Silva, 123.456.789-00, Segurança, RG Produções, STAFF</span>
                                        </li>
                                        <li>Após importar, os colaboradores serão adicionados em massa e aparecerão na tabela.</li>
                                    </ul>
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex justify-end mt-4">
                                <button
                                    type="button"
                                    className="bg-blue-700 text-white px-4 py-2 rounded text-sm"
                                    onClick={handleProceedImport}
                                >
                                    Prosseguir com Importação
                                </button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Dialog de duplicados na importação do Excel */}
                    <Dialog open={duplicadosDialogOpen} onOpenChange={setDuplicadosDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Registros Duplicados Encontrados</DialogTitle>
                            </DialogHeader>
                            <div className="max-h-[200px] overflow-y-auto">
                                <p>Os seguintes CPFs já existem no sistema:</p>
                                <ul className="list-disc pl-5 my-2">
                                    {duplicadosEncontrados.map((d, i) => (
                                        <li key={i}>{d.name} - {d.cpf}</li>
                                    ))}
                                </ul>
                                <p>O que deseja fazer?</p>
                            </div>
                            <div className="flex gap-2 mt-4">
                                <Button
                                    onClick={importarRegistrosUnicos}
                                    disabled={registrosUnicos.length === 0 || importDialogLoading}
                                >
                                    Importar apenas registros não duplicados
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setDuplicadosDialogOpen(false)}
                                    disabled={importDialogLoading}
                                >
                                    Cancelar
                                </Button>
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                                Para corrigir, edite o arquivo Excel e tente novamente.
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Dialog de resumo da importação */}
                    <Dialog open={resumoDialogOpen} onOpenChange={setResumoDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Resumo da Importação</DialogTitle>
                            </DialogHeader>
                            <div>
                                <p className="mb-2">Importação finalizada. Veja abaixo o status de cada registro:</p>
                                <div className="mb-4">
                                    <b>Importados ({resumoImportacao.importados.length}):</b>
                                    <div className="max-h-[200px] overflow-y-auto">
                                        <ul className="list-disc pl-5 my-1">
                                            {resumoImportacao.importados.map((item, i) => (
                                                <li key={i}>{item.name} - {item.cpf}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <b>Barrados por duplicidade ({resumoImportacao.barrados.length}):</b>
                                    <div className="max-h-[200px] overflow-y-auto">
                                        <ul className="list-disc pl-5 my-1">
                                            {resumoImportacao.barrados.map((item, i) => (
                                                <li key={i}>{item.name} - {item.cpf}</li>
                                            ))}
                                        </ul>
                                    </div>
                                    {resumoImportacao.barrados.length > 0 && (
                                        <Button variant="outline" size="sm" onClick={exportarBarradosCSV} className="mt-2">
                                            Baixar CSV dos barrados
                                        </Button>
                                    )}
                                </div>
                                {resumoImportacao.falhados && resumoImportacao.falhados.length > 0 && (
                                    <div className="mb-4">
                                        <b>Falharam na importação ({resumoImportacao.falhados.length}):</b>
                                        <div className="max-h-[200px] overflow-y-auto">
                                            <ul className="list-disc pl-5 my-1">
                                                {resumoImportacao.falhados.map((f, i) => (
                                                    <li key={i}>{f.item.name} - {f.item.cpf} <span className="text-red-600">({f.motivo})</span></li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end">
                                <Button onClick={() => setResumoDialogOpen(false)}>
                                    Fechar
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* DIALOG DE FILTRO AVANÇADO */}
                    <Dialog open={filtroAvancadoOpen} onOpenChange={setFiltroAvancadoOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Filtro Avançado</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3">
                                <Input
                                    placeholder="Nome"
                                    value={filtroAvancado.name || ''}
                                    onChange={e => setFiltroAvancado({ ...filtroAvancado, name: e.target.value })}
                                />
                                <Input
                                    placeholder="CPF"
                                    value={filtroAvancado.cpf || ''}
                                    onChange={e => setFiltroAvancado({ ...filtroAvancado, cpf: e.target.value })}
                                />
                                <Input
                                    placeholder="Função"
                                    value={filtroAvancado.role || ''}
                                    onChange={e => setFiltroAvancado({ ...filtroAvancado, role: e.target.value })}
                                    list="funcoes"
                                />
                                <datalist id="funcoes">
                                    {
                                        funcoesUnicasFiltradas.map((funcao) => {
                                            return (
                                                <option key={funcao} value={funcao} />
                                            )
                                        })
                                    }
                                </datalist>
                                <Input list="empresas" placeholder="Empresa" value={filtroAvancado.company || ''} onChange={e => setFiltroAvancado({ ...filtroAvancado, company: e.target.value })} />
                                <datalist id="empresas">
                                    {
                                        empresasUnicasFiltradas.map((empresa) => {
                                            return (
                                                <option key={empresa} value={empresa} />
                                            )
                                        })
                                    }
                                </datalist>
                                <Input
                                    placeholder="Tipo de Credencial"
                                    value={filtroAvancado.wristbandId || ''}
                                    onChange={e => setFiltroAvancado({ ...filtroAvancado, wristbandId: e.target.value })}
                                />
                                {/* Ordenação */}
                                <div className="flex gap-2 items-center">
                                    <label className="text-sm">Ordenar por:</label>
                                    <select
                                        value={ordenacao.campo}
                                        onChange={e => setOrdenacao({ ...ordenacao, campo: e.target.value })}
                                        className="border rounded px-2 py-1"
                                    >
                                        <option value="name">Nome</option>
                                        <option value="cpf">CPF</option>
                                        <option value="role">Função</option>
                                        <option value="company">Empresa</option>
                                        <option value="wristbandId">Tipo de Credencial</option>
                                    </select>
                                    <select
                                        value={ordenacao.direcao}
                                        onChange={e => setOrdenacao({ ...ordenacao, direcao: e.target.value as 'asc' | 'desc' })}
                                        className="border rounded px-2 py-1"
                                    >
                                        <option value="asc">Crescente (A-Z)</option>
                                        <option value="desc">Decrescente (Z-A)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-4 justify-end">
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setFiltroAvancado({});
                                        setOrdenacao({ campo: 'name', direcao: 'asc' });
                                    }}
                                >
                                    Limpar
                                </Button>
                                <Button
                                    onClick={() => setFiltroAvancadoOpen(false)}
                                >
                                    Aplicar
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </>
            )}
        </div>
    );
}
