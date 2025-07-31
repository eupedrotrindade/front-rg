/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"


import Retirada from "@/components/operador/retirada"
import ModalRetirada from "@/components/operador/modalRetirada"
import { Retirada as RetiradaType } from "./types"
import { useState } from "react"
import Image from "next/image"
import ModalDevParcial from "@/components/operador/modalDevParcial"
import ModalTroca from "@/components/operador/modalTroca"
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { useRadios, useCreateRadio, useUpdateRadio } from "@/features/radio/api";
import React from "react";
import { useParams } from "next/navigation";
import EventLayout from "@/components/dashboard/dashboard-layout"
import { useEventos } from "@/features/eventos/api/query"

export default function Radios() {
    const [isOpen, setIsOpen] = useState(false)
    const params = useParams();
    const eventId = params.id as string;
    const { data: eventos = [] } = useEventos()
    const evento = Array.isArray(eventos) ? eventos.find(e => e.id === eventId) : null
    const { data: radiosData, isLoading, error: radiosError } = useRadios({
        eventId
    });
    const createRadioMutation = useCreateRadio();
    const updateRadioMutation = useUpdateRadio();
    const [dados, setDados] = useState<RetiradaType[]>([]);
    const [allDados, setAllDados] = useState<RetiradaType[]>([]);
    const [isModalDevTotalOpen, setIsModalDevTotalOpen] = useState(false)
    const [isModalDevParcialOpen, setIsModalDevParcialOpen] = useState(false)
    const [retiradaSelecionada, setRetiradaSelecionada] = useState<RetiradaType | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [search, setSearch] = useState("")
    const [showOnlyPendentes, setShowOnlyPendentes] = useState(false)
    const [isModalTrocaOpen, setIsModalTrocaOpen] = useState(false);
    const [errorTroca, setErrorTroca] = useState<string | null>(null);
    // Carregar dados do backend ao montar
    React.useEffect(() => {
        console.log('radiosData completo:', radiosData);

        // radiosData já é um array de rádios, não possui a propriedade 'data'
        const radiosArray = Array.isArray(radiosData) ? radiosData : [];
        console.log('Array de rádios:', radiosArray);

        if (radiosArray.length > 0) {
            // Cada rádio é uma linha individual
            const retiradas = radiosArray.map((radio: any) => {
                // Converter histórico para array se vier como string
                let historico = radio.historico || [];
                if (typeof historico === 'string') {
                    try {
                        historico = JSON.parse(historico);
                    } catch {
                        historico = [];
                    }
                }

                // Debug: log do histórico
                console.log('Radio ID:', radio.id, 'Historico:', historico, 'Tipo:', typeof historico);

                return {
                    nome: `Rádio ${radio.codes?.join(', ') || 'N/A'}`,
                    retirada: radio.created_at || '',
                    devolucao: radio.updated_at || '',
                    contato: '',
                    radios: radio.codes || [],
                    status: radio.status === 'disponivel',
                    historico: Array.isArray(historico) ? historico : [],
                    codes_devolvidos: radio.codes_devolvidos || [],
                    codes_trocados: radio.codes_trocados || [],
                    id: radio.id,
                };
            });

            setDados(retiradas);
            setAllDados(retiradas);
        }
    }, [radiosData]);

    // Função para registrar ação do operador
    async function registerOperatorAction(acao: Record<string, unknown>) {
        const operadorRaw = localStorage.getItem("operador");
        if (!operadorRaw) return;
        let operador;
        try {
            operador = JSON.parse(operadorRaw);
        } catch {
            return;
        }
        const id = operador.id;
        const acoesAntigas = Array.isArray(operador.acoes) ? operador.acoes : [];
        const novaAcao = { ...acao, timestamp: new Date().toISOString() };
        const novasAcoes = [...acoesAntigas, novaAcao];
        try {
            const response = await apiClient.put(`/operadores/${id}`, { acoes: novasAcoes });
            if (response && response.data) {
                localStorage.setItem("operador", JSON.stringify(response.data));
            } else {
                localStorage.setItem("operador", JSON.stringify({ ...operador, acoes: novasAcoes }));
            }
        } catch (error) {
            toast.error("Erro ao registrar ação do operador.");
        }
    }

    // Adicionar nova retirada
    const handleAddRetirada = async ({ codes, status, last_retirada_id, nome_radio, contato }: {
        codes: string[];
        status: string;
        last_retirada_id: string | null;
        nome_radio: string;
        contato: string;
    }) => {
        try {
            await createRadioMutation.mutateAsync({
                codes,
                status: status as "disponivel" | "retirado" | "manutencao",
                event_id: eventId, // Usar o eventId da URL
                last_retirada_id,
            });
            toast.success("Nova retirada registrada!");
            registerOperatorAction({
                type: "nova_retirada_radio",
                nome: nome_radio,
                contato,
                radios: codes,
                status,
                event_id: eventId,
                last_retirada_id,
                timestamp: new Date().toISOString(),
            });
        } catch (err) {
            toast.error("Erro ao registrar retirada.");
        }
    };

    // Devolução total
    const handleDevTotal = async (retirada: RetiradaType) => {
        try {
            const historicoEntry = `${new Date().toLocaleString()} - Devolução total`;

            await updateRadioMutation.mutateAsync({
                id: retirada.id,
                radio: {
                    status: "disponivel",
                    updated_at: new Date().toISOString(),
                    historico: [...(retirada.historico || []), historicoEntry]
                },
            });

            toast.success("Devolução total registrada!");
            registerOperatorAction({
                type: "devolucao_total_radio",
                nome: retirada.nome,
                contato: retirada.contato,
                radios: retirada.radios,
                timestamp: new Date().toISOString(),
            });
        } catch (err) {
            toast.error("Erro ao registrar devolução.");
        }
    };

    // Devolução parcial (simplificada)
    const handleDevParcial = async (retirada: RetiradaType, radiosDevolvidos: string[]) => {
        try {
            const historicoEntry = `${new Date().toLocaleString()} - Devolução parcial: ${radiosDevolvidos.join(', ')}`;

            // Debug: log do histórico atual e novo entry
            console.log('Historico atual:', retirada.historico);
            console.log('Novo entry:', historicoEntry);
            console.log('Novo historico:', [...(retirada.historico || []), historicoEntry]);

            // Adicionar rádios devolvidos à nova coluna
            const novosCodesDevolvidos = [...(retirada.codes_devolvidos || []), ...radiosDevolvidos];

            await updateRadioMutation.mutateAsync({
                id: retirada.id,
                radio: {
                    updated_at: new Date().toISOString(),
                    historico: [...(retirada.historico || []), historicoEntry],
                    codes_devolvidos: novosCodesDevolvidos
                },
            });

            toast.success("Devolução parcial registrada!");
            registerOperatorAction({
                type: "devolucao_parcial_radio",
                nome: retirada.nome,
                contato: retirada.contato,
                radiosDevolvidos,
                radiosOriginais: retirada.radios,
                timestamp: new Date().toISOString(),
            });
        } catch (err) {
            console.error('Erro na devolução parcial:', err);
            toast.error("Erro ao registrar devolução parcial.");
        }
    };



    const openDevTotal = (retirada: RetiradaType) => {
        setRetiradaSelecionada(retirada)
        setIsModalDevTotalOpen(true)
    }

    const openDevParcial = (retirada: RetiradaType) => {
        setRetiradaSelecionada(retirada)
        setIsModalDevParcialOpen(true)
        setError(null)
    }

    const onConfirmParcial = (input: string) => {
        if (!retiradaSelecionada) return
        const radiosInput = input.split(",").map(r => r.trim()).filter(Boolean)
        const notFound = radiosInput.filter(r => !retiradaSelecionada.radios.includes(r))
        if (notFound.length > 0) {
            setError(`Rádio(s) não registrado(s): ${notFound.join(", ")}`)
            return
        }
        setError(null)

        // Adicionar os rádios devolvidos ao array de codes_devolvidos
        const novosCodesDevolvidos = [...(retiradaSelecionada.codes_devolvidos || []), ...radiosInput];

        // Atualizar o item selecionado com os novos devolvidos
        setRetiradaSelecionada({
            ...retiradaSelecionada,
            codes_devolvidos: novosCodesDevolvidos
        });

        handleDevParcial(retiradaSelecionada, radiosInput)
        setIsModalDevParcialOpen(false)
    }

    // Troca de rádio
    const openTroca = (retirada: RetiradaType) => {
        setRetiradaSelecionada(retirada);
        setIsModalTrocaOpen(true);
        setErrorTroca(null);
    };

    // Troca simplificada
    const onConfirmTroca = async (antigo: string, novo: string) => {
        if (!retiradaSelecionada) return;

        try {
            // Verificar se o novo rádio já está sendo usado em outros registros
            const todosRadios = allDados.flatMap(item => item.radios);
            const todosRadiosTrocados = allDados.flatMap(item => item.codes_trocados || []);
            const todosRadiosDevolvidos = allDados.flatMap(item => item.codes_devolvidos || []);

            const rádiosEmUso = [...todosRadios, ...todosRadiosTrocados, ...todosRadiosDevolvidos];

            if (rádiosEmUso.includes(novo)) {
                setErrorTroca(`O rádio ${novo} já está sendo usado em outro registro.`);
                return;
            }

            const historicoEntry = `${new Date().toLocaleString()} - Troca: ${antigo} → ${novo}`;

            // Adicionar rádio antigo aos trocados e novo aos codes
            const novosCodesTrocados = [...(retiradaSelecionada.codes_trocados || []), antigo];
            const novosCodes = [...(retiradaSelecionada.radios.filter((r: string) => r !== antigo), novo)];

            await updateRadioMutation.mutateAsync({
                id: retiradaSelecionada.id,
                radio: {
                    codes: novosCodes,
                    codes_trocados: novosCodesTrocados,
                    updated_at: new Date().toISOString(),
                    historico: [...(retiradaSelecionada.historico || []), historicoEntry]
                },
            });

            toast.success("Troca registrada!");
            registerOperatorAction({
                type: "troca_radio",
                nome: retiradaSelecionada.nome,
                contato: retiradaSelecionada.contato,
                radioAntigo: antigo,
                radioNovo: novo,
                radiosOriginais: retiradaSelecionada.radios,
                timestamp: new Date().toISOString(),
            });
            setIsModalTrocaOpen(false);
        } catch (err) {
            setErrorTroca("Erro ao registrar troca.");
            toast.error("Erro ao registrar troca.");
        }
    };

    // Filtro de busca
    const searchRetirada = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value)
        const filtered = allDados.filter(item =>
            item.nome.toLowerCase().includes(e.target.value.toLowerCase()) ||
            item.radios.some(radio => radio.toLowerCase().includes(e.target.value.toLowerCase()))
        )
        setDados(filtered)
    }

    const handlePendentesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setShowOnlyPendentes(e.target.checked)
        if (e.target.checked) {
            setDados(allDados.filter(item => !item.status))
        } else {
            if (search) {
                setDados(allDados.filter(item =>
                    item.nome.toLowerCase().includes(search.toLowerCase()) ||
                    item.radios.some(radio => radio.toLowerCase().includes(search.toLowerCase()))
                ))
            } else {
                setDados(allDados)
            }
        }
    }

    return (
        <EventLayout eventId={String(params.id)} eventName={evento?.name || ""}>


            <div className="w-full bg-transparent py-2 px-2 mt-4">
                <div className="max-w-7xl mx-auto bg-white rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-4 md:px-6 py-4 md:py-6 shadow">
                    <div className="flex flex-col md:flex-row gap-2 md:gap-4 w-full md:w-auto">
                        <button
                            className="cursor-pointer bg-[#6f0a5e] hover:bg-[#58084b] text-white font-semibold px-6 md:px-8 py-3 md:py-4 rounded-lg shadow transition-all text-base md:text-lg w-full md:w-auto"
                            onClick={() => setIsOpen(true)}
                        >
                            NOVA RETIRADA
                        </button>
                        <input
                            onChange={(e) => searchRetirada(e)}
                            type="text"
                            placeholder="Buscar por Nome/Empresa ou Número do rádio"
                            className="border border-gray-300 rounded-lg px-4 md:px-5 py-2 md:py-3 text-base text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6f0a5e] w-full md:w-[340px] max-w-full transition bg-white"
                        />
                    </div>
                    <label className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-base cursor-pointer select-none transition w-full md:w-auto justify-center md:justify-start">
                        <input type="checkbox" className="accent-orange-500 w-5 h-5" checked={showOnlyPendentes} onChange={handlePendentesChange} />
                        <span className="text-orange-600 font-semibold">Apenas pendentes</span>
                    </label>
                </div>
            </div>

            <div className="w-full bg-transparent py-2 px-2">
                <div className="max-w-7xl mx-auto flex justify-end gap-4">
                    <span className="text-base text-gray-600">
                        Total: <span className="text-gray-600 font-bold">{dados.length} registros</span>
                    </span>
                    <span className="text-orange-500">Pendentes: {dados.filter(item => !item.status).length}</span>
                </div>
            </div>

            <div className="w-full bg-transparent py-2 px-2 mt-4">
                <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow overflow-x-auto">
                    <table className="min-w-full text-sm text-left">
                        <thead className="bg-[#6f0a5e] text-white text-xs uppercase">
                            <tr>
                                <th className="px-4 py-3">Nome/Empresa</th>
                                <th className="px-4 py-3">Contato</th>
                                <th className="px-4 py-3">Número dos Rádios</th>
                                <th className="px-4 py-3">Histórico</th>
                                <th className="px-4 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white text-gray-800 divide-y divide-purple-200">
                            {!dados || dados.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-3 text-center">Nenhuma retirada encontrada</td>
                                </tr>
                            ) : (
                                dados.map((item, idx) => (
                                    <Retirada
                                        key={idx}
                                        id={item.id}
                                        nome={item.nome}
                                        retirada={item.retirada}
                                        devolucao={item.devolucao}
                                        contato={item.contato}
                                        radios={item.radios}
                                        status={item.status}
                                        historico={item.historico || []}
                                        codes_devolvidos={item.codes_devolvidos || []}
                                        codes_trocados={item.codes_trocados || []}

                                        onOpenDevTotal={() => openDevTotal(item)}
                                        onOpenDevParcial={() => openDevParcial(item)}
                                        onOpenTroca={() => openTroca(item)}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <ModalRetirada
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                onAddRetirada={handleAddRetirada as any}
            />

            <ModalDevParcial
                isOpen={isModalDevParcialOpen}
                setIsOpen={setIsModalDevParcialOpen}
                onConfirm={onConfirmParcial}
                error={error}
            />
            <ModalTroca
                isOpen={isModalTrocaOpen}
                setIsOpen={setIsModalTrocaOpen}
                onConfirm={onConfirmTroca}
                error={errorTroca}
                radiosDisponiveis={retiradaSelecionada?.radios || []}
            />
            <div className="flex flex-col items-center justify-center gap-6 py-4">
                <button className="bg-[#6f0a5e] text-white px-4 py-2 rounded-md hover:bg-[#58084b] transition-all cursor-pointer">EXPORTAR RELATÓRIO PDF</button>
                <Image src="/images/slogan-rg.png" alt="Logo rg" width={300} height={300} />
            </div>
            {isLoading && (
                <div className="text-center py-8">Carregando rádios...</div>
            )}
            {radiosError && (
                <div className="text-center py-8 text-red-500">Erro ao carregar rádios</div>
            )}

        </EventLayout>
    )
}