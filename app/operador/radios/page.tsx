/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import Header from "@/components/operador/header"

import Retirada from "@/components/operador/retirada"
import ModalRetirada from "@/components/operador/modalRetirada"
import { Retirada as RetiradaType } from "./types"
import { useState } from "react"
import Image from "next/image"
import ModalDevTotal from "@/components/operador/modalDevTotal"
import ModalDevParcial from "@/components/operador/modalDevParcial"
import ModalTroca from "@/components/operador/modalTroca"
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { useRadios, useCreateRadio, useUpdateRadio } from "@/features/radio/api";
import React from "react";

export default function Radios() {
    const [isOpen, setIsOpen] = useState(false)
    const { data: radiosData, isLoading, error: radiosError } = useRadios();
    const createRadioMutation = useCreateRadio();
    const updateRadioMutation = useUpdateRadio();
    const [dados, setDados] = useState<RetiradaType[]>([]);
    const [allDados, setAllDados] = useState<RetiradaType[]>([]); // backup do original
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
        if (radiosData) {
            // Adaptar Radio para RetiradaType se necessário
            const adaptados = radiosData.map(r => ({
                nome: r.codes ? r.codes.join(', ') : '',
                retirada: r.created_at || '',
                devolucao: r.updated_at || '',
                contato: '',
                radios: r.codes || [],
                status: r.status === 'retirado' ? false : true,
                id: r.id,
            }));
            setDados(adaptados);
            setAllDados(adaptados);
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

    // Adicionar nova retirada (criar vários rádios com campos extras)
    const handleAddRetirada = async ({ codes, status, event_id, last_retirada_id, nome }: {
        codes: string[];
        status: string;
        event_id: string;
        last_retirada_id: string | null;
        nome: string;
        contato: string;
    }) => {
        try {
            await createRadioMutation.mutateAsync({
                codes,
                status: status as "disponivel" | "retirado" | "manutencao",
                event_id,
                last_retirada_id,
            });
            toast.success("Nova retirada registrada!");
            registerOperatorAction({
                type: "nova_retirada_radio",
                nome,
                radios: codes,
                status,
                event_id,
                last_retirada_id,
                timestamp: new Date().toISOString(),
            });
        } catch (err) {
            toast.error("Erro ao registrar retirada.");
        }
    };

    // Devolução total (atualizar status do rádio)
    const handleDevTotal = async (retirada: RetiradaType) => {
        try {
            const radioId = radiosData?.find(r => Array.isArray(r.codes) && r.codes.includes(retirada.radios[0]))?.id;
            if (!radioId) throw new Error("Rádio não encontrado");
            await updateRadioMutation.mutateAsync({
                id: radioId,
                radio: { status: "disponivel", updated_at: new Date().toISOString() },
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

    // Devolução parcial (atualizar status do rádio para cada rádio devolvido)
    const handleDevParcial = async (retirada: RetiradaType, radiosDevolvidos: string[]) => {
        try {
            for (const code of radiosDevolvidos) {
                const radioId = radiosData?.find(r => Array.isArray(r.codes) && r.codes.includes(code))?.id;
                if (radioId) {
                    await updateRadioMutation.mutateAsync({
                        id: radioId,
                        radio: { status: "disponivel", updated_at: new Date().toISOString() },
                    });
                }
            }
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
        handleDevParcial(retiradaSelecionada, radiosInput)
        setIsModalDevParcialOpen(false)
    }

    // Troca de rádio (abrir modal)
    const openTroca = (retirada: RetiradaType) => {
        setRetiradaSelecionada(retirada);
        setIsModalTrocaOpen(true);
        setErrorTroca(null);
    };

    // Troca de rádio (atualizar código do rádio antigo para novo)
    const onConfirmTroca = async (antigo: string, novo: string) => {
        if (!retiradaSelecionada) return;
        try {
            const radioId = radiosData?.find(r => Array.isArray(r.codes) && r.codes.includes(antigo))?.id;
            if (!radioId) throw new Error("Rádio antigo não encontrado");
            await updateRadioMutation.mutateAsync({
                id: radioId,
                radio: { codes: [novo], updated_at: new Date().toISOString() },
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
        <div className="bg-[#fde6fb] min-h-screen">
            <Header />
            <div className="w-full bg-[#ffe7fe] py-2 px-2 mt-4">
                <div className="max-w-7xl mx-auto bg-white rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-4 md:px-6 py-4 md:py-6 shadow">
                    {/* Botão Nova Retirada */}
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

            <div className="w-full bg-[#ffe7fe] py-2 px-2">
                <div className="max-w-7xl mx-auto flex justify-end gap-4">
                    <span className="text-base text-gray-600">
                        Total: <span className="text-gray-600 font-bold">{dados.length} registros</span>
                    </span>
                    <span className="text-orange-500">Pendentes: {dados.filter(item => !item.status).length}</span>
                </div>
            </div>

            <div className="w-full bg-[#ffe7fe] py-2 px-2 mt-4">
                <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow overflow-x-auto">
                    <table className="min-w-full text-sm text-left">
                        <thead className="bg-[#6f0a5e] text-white text-xs uppercase">
                            <tr>
                                <th className="px-4 py-3">Nome/Empresa</th>
                                <th className="px-4 py-3">Contato</th>
                                <th className="px-4 py-3">Número dos Rádios</th>
                                <th className="px-4 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white text-gray-800 divide-y divide-purple-200">
                            {dados.map((item, idx) => (
                                <Retirada
                                    key={idx}
                                    nome={item.nome}
                                    retirada={item.retirada}
                                    devolucao={item.devolucao}
                                    contato={item.contato}
                                    radios={item.radios}
                                    status={item.status}
                                    devolvidos={item.devolvidos || []}
                                    trocas={item.trocas || []}
                                    onOpenDevTotal={() => openDevTotal(item)}
                                    onOpenDevParcial={() => openDevParcial(item)}
                                    onOpenTroca={() => openTroca(item)}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <ModalRetirada
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                onAddRetirada={handleAddRetirada as any}
            />
            <ModalDevTotal
                isOpen={isModalDevTotalOpen}
                setIsOpen={setIsModalDevTotalOpen}
                handleDevTotal={() => {
                    if (retiradaSelecionada) handleDevTotal(retiradaSelecionada)
                    setIsModalDevTotalOpen(false)
                }}
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
        </div>
    )
}