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

    const handleAddRetirada = (novaRetirada: RetiradaType) => {
        setDados(prev => [...prev, novaRetirada])
    }

    // Função para devolução total
    const handleDevTotal = (retirada: RetiradaType) => {
        setDados(prev => prev.map(item =>
            item.nome === retirada.nome && item.retirada === retirada.retirada
                ? { ...item, status: true, devolucao: new Date().toLocaleString('pt-BR') }
                : item
        ))
    }

    return (
        <div className="bg-[#fde6fb] min-h-screen">
            <Header />
            <div className="w-full bg-[#ffe7fe] py-2 px-2 mt-4">
                <div className="max-w-7xl mx-auto bg-white rounded-2xl flex items-center justify-between gap-4 px-6 py-6 shadow">
                    <button
                        className="cursor-pointer bg-[#6f0a5e] hover:bg-[#58084b] text-white font-semibold px-8 py-4 rounded-lg shadow transition-all text-lg"
                        onClick={() => setIsOpen(true)}
                    >
                        NOVA RETIRADA
                    </button>

                    <div className="flex items-center gap-4 flex-1 justify-end">
                        <input
                            type="text"
                            placeholder="Buscar por Nome/Empresa ou Número do rádio"
                            className="border border-gray-300 rounded-lg px-5 py-3 text-base text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6f0a5e] w-[340px] max-w-full transition bg-white"
                        />
                        <label className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-base cursor-pointer select-none transition">
                            <input type="checkbox" className="accent-orange-500 w-5 h-5" />
                            <span className="text-orange-600 font-semibold">Apenas pendentes</span>
                        </label>
                    </div>
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
                <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow overflow-hidden">
                    <table className="w-full text-sm text-left">
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
                                    handleDevTotal={() => handleDevTotal(item)}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="flex flex-col items-center justify-center gap-6 py-4">
                <button className="bg-[#6f0a5e] text-white px-4 py-2 rounded-md hover:bg-[#58084b] transition-all cursor-pointer">EXPORTAR RELATÓRIO PDF</button>
                <Image src="/images/slogan-rg.png" alt="Logo rg" width={300} height={300} />
            </div>
            <ModalRetirada isOpen={isOpen} setIsOpen={setIsOpen} onAddRetirada={handleAddRetirada}/>
        </div>
    )
}