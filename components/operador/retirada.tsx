import type { Retirada as RetiradaType } from "@/app/(workspaces)/eventos/[id]/radios/types"
import { useState } from "react"

interface RetiradaProps extends RetiradaType {
    onOpenDevTotal: () => void;
    onOpenDevParcial: () => void;
    onOpenTroca: () => void;
}

export default function Retirada({ nome, retirada, devolucao, contato, radios, status, historico = [], codes_devolvidos = [], codes_trocados = [], onOpenDevTotal, onOpenDevParcial, onOpenTroca }: RetiradaProps) {
    const [showRadiosPopup, setShowRadiosPopup] = useState(false);
    const [showHistorico, setShowHistorico] = useState(false);

    return (
        <tr className="hover:bg-purple-50 transition">
            <td className="px-4 py-3">
                <div className="font-semibold">{nome}</div>
                <div className="text-xs text-gray-500">
                    Retirada: {retirada}
                </div>
                <div className="text-xs text-green-600">
                    Dev. Total: {devolucao}
                </div>
            </td>
            <td className="px-4 py-3">{contato === "" ? "-" : contato}</td>
            <td className="px-4 py-3">
                {/* Radios em linha para telas md+ */}
                <div className="hidden md:block">
                    <div>
                        {radios.map(radio => {
                            const isDevolvido = codes_devolvidos.includes(radio);
                            const isTrocado = codes_trocados.includes(radio);
                            return (
                                <span
                                    key={radio}
                                    className={`mr-2 ${isTrocado ? "text-red-600 line-through" : ""} ${isDevolvido ? "text-green-600 font-semibold" : ""}`}
                                >
                                    {radio}
                                    {isDevolvido && <span className="text-green-600 ml-1">✓</span>}
                                    {isTrocado && <span className="text-red-600 ml-1">🔄</span>}
                                </span>
                            );
                        })}
                    </div>
                    {codes_trocados && codes_trocados.length > 0 && (
                        <div className="mt-1">
                            <span className="text-blue-600 text-xs">Rádios trocados:</span>
                            {codes_trocados.map((code, idx) => (
                                <span key={code + idx} className="mr-2 text-blue-600">
                                    {code} 🔄
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                {/* Botão para popup em telas pequenas */}
                <div className="block md:hidden">
                    <button
                        className="bg-[#6f0a5e] text-white px-3 py-2 rounded-md text-sm"
                        onClick={() => setShowRadiosPopup(true)}
                    >
                        Ver rádios
                    </button>
                    {showRadiosPopup && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                            <div className="bg-white rounded-lg p-6 max-w-xs w-full relative">
                                <button
                                    className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
                                    onClick={() => setShowRadiosPopup(false)}
                                >
                                    &times;
                                </button>
                                <h3 className="text-lg font-bold mb-2 text-[#6f0a5e]">Rádios</h3>
                                <div>
                                    {radios.map(radio => {
                                        const isDevolvido = codes_devolvidos.includes(radio);
                                        const isTrocado = codes_trocados.includes(radio);
                                        return (
                                            <span
                                                key={radio}
                                                className={`mr-2 ${isTrocado ? "text-red-600 line-through" : ""} ${isDevolvido ? "text-green-600 font-semibold" : ""}`}
                                            >
                                                {radio}
                                                {isDevolvido && <span className="text-green-600 ml-1">✓</span>}
                                                {isTrocado && <span className="text-red-600 ml-1">🔄</span>}
                                            </span>
                                        );
                                    })}
                                </div>
                                {codes_trocados && codes_trocados.length > 0 && (
                                    <div className="mt-2">
                                        <span className="text-blue-600 text-xs">Rádios trocados:</span>
                                        {codes_trocados.map((code, idx) => (
                                            <span key={code + idx} className="mr-2 text-blue-600">
                                                {code} 🔄
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </td>
            <td className="px-4 py-3">
                <div className="max-h-20 overflow-y-auto">
                    {historico.length > 0 ? (
                        historico.map((entry, idx) => (
                            <div key={idx} className="text-xs text-gray-600 mb-1">
                                {entry}
                            </div>
                        ))
                    ) : (
                        <span className="text-gray-400 text-xs">Sem histórico</span>
                    )}
                </div>
            </td>
            <td className="px-4 py-3 flex flex-col md:flex-row gap-2 items-center whitespace-nowrap">
                {
                    status ? <span className="text-green-600 text-sm font-semibold">✓ Finalizado</span>
                        :
                        <div className="flex flex-col md:flex-row gap-2 w-full">
                            <button onClick={onOpenTroca} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-all cursor-pointer w-full md:w-auto">Troca</button>
                            <button onClick={onOpenDevParcial} className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 transition-all cursor-pointer w-full md:w-auto">Dev. Parcial</button>
                            <button
                                onClick={onOpenDevTotal}
                                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-all cursor-pointer w-full md:w-auto"
                            >
                                Dev. Total
                            </button>
                        </div>
                }
                <button className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-all cursor-pointer w-full md:w-auto mt-2 md:mt-0" onClick={() => setShowHistorico(true)}>Histórico</button>

            </td>
        </tr>
    )
}