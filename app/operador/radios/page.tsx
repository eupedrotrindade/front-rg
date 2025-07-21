"use client"
import Header from "@/components/operador/header"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import Retirada from "@/components/operador/retirada"
import ModalRetirada from "@/components/operador/modalRetirada"
import { Retirada as RetiradaType } from "./types"
import { useState } from "react"
import Image from "next/image"
import ModalDevTotal from "@/components/operador/modalDevTotal"
import ModalDevParcial from "@/components/operador/modalDevParcial"
import ModalTroca from "@/components/operador/modalTroca"

export default function Radios() {
    const [isOpen, setIsOpen] = useState(false)
    const [dados, setDados] = useState<RetiradaType[]>([
        {
          nome: 'PRODUÇÃO- PABLO',
          retirada: '14/06/2025, 17:06:20',
          devolucao: '15/06/2025, 07:21:31',
          contato: '1234567890',
          radios: ['04', '11', '46', '47'],
          status: true,
        },
        {
          nome: 'PRODUÇÃO- CARLOS ( CARLITO )',
          retirada: '14/06/2025, 17:07:02',
          devolucao: '15/06/2025, 02:42:11',
          contato: '',
          radios: ['05'],
          status: true,
        },
        {
          nome: 'SAMPAIO- SEGURANÇA',
          retirada: '14/06/2025, 17:08:01',
          devolucao: '15/06/2025, 07:25:45',
          contato: 'email@email.com',
          radios: ['08', '17', '23', '37', '38', '53', '54', '61'],
          status: false,
        },
      ])
    const [isModalDevTotalOpen, setIsModalDevTotalOpen] = useState(false)
    const [isModalDevParcialOpen, setIsModalDevParcialOpen] = useState(false)
    const [retiradaSelecionada, setRetiradaSelecionada] = useState<RetiradaType | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [search, setSearch] = useState("")
    const [showOnlyPendentes, setShowOnlyPendentes] = useState(false)
    const [allDados, setAllDados] = useState<RetiradaType[]>([...dados]) // backup do original
    const [isModalTrocaOpen, setIsModalTrocaOpen] = useState(false);
    const [errorTroca, setErrorTroca] = useState<string | null>(null);

    // Atualize allDados ao adicionar nova retirada
    const handleAddRetirada = (novaRetirada: RetiradaType) => {
        setDados(prev => [...prev, novaRetirada])
        setAllDados(prev => [...prev, novaRetirada])
    }

    // Função para devolução total
    const handleDevTotal = (retirada: RetiradaType) => {
        setDados(prev => prev.map(item =>
            item.nome === retirada.nome && item.retirada === retirada.retirada
                ? { ...item, status: true, devolucao: new Date().toLocaleString('pt-BR') }
                : item
        ))
    }

    // Função para devolução parcial
    const handleDevParcial = (retirada: RetiradaType, radiosDevolvidos: string[]) => {
        setDados(prev => prev.map(item =>
            item.nome === retirada.nome && item.retirada === retirada.retirada
                ? {
                    ...item,
                    devolvidos: [...(item.devolvidos || []), ...radiosDevolvidos.filter(r => !(item.devolvidos || []).includes(r))]
                }
                : item
        ))
    }

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

    const openTroca = (retirada: RetiradaType) => {
        setRetiradaSelecionada(retirada);
        setIsModalTrocaOpen(true);
        setErrorTroca(null);
    };

    const onConfirmTroca = (antigo: string, novo: string) => {
        if (!retiradaSelecionada) return;
        if (!retiradaSelecionada.radios.includes(antigo)) {
            setErrorTroca(`Rádio ${antigo} não registrado nesta retirada.`);
            return;
        }
        setErrorTroca(null);
        setDados(prev => prev.map(item =>
            item.nome === retiradaSelecionada.nome && item.retirada === retiradaSelecionada.retirada
                ? {
                    ...item,
                    trocas: [...(item.trocas || []), { antigo, novo }]
                }
                : item
        ));
        setIsModalTrocaOpen(false);
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
            <ModalRetirada isOpen={isOpen} setIsOpen={setIsOpen} onAddRetirada={handleAddRetirada}/>
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
        </div>
    )
}