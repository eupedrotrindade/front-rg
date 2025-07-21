import type { Retirada } from "@/app/operador/radios/types"
import { useState } from "react"
import ModalDevTotal from "./modalDevTotal"

interface RetiradaProps extends Retirada {
    handleDevTotal: () => void;
}

export default function Retirada({ nome, retirada, devolucao, contato, radios, status, handleDevTotal }: RetiradaProps) {
    const [isModalOpen, setIsModalOpen] = useState(false)

    return (
        <>
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
                <td className="px-4 py-3">
                    {
                        contato === "" ? "-" : contato
                    }
                </td>
                <td className="px-4 py-3 text-purple-700 font-medium">
                    {radios.join(',')}
                </td>
                <td className="px-4 py-3 flex gap-2">
                    {
                        status ? <span className="text-green-600 text-sm font-semibold">✓ Finalizado</span>
                        :
                        <div className="flex gap-2">
                            <button className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-all cursor-pointer">Troca</button>
                            <button className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 transition-all cursor-pointer">Dev. Parcial</button>
                            <button 
                                onClick={() => setIsModalOpen(true)}
                                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-all cursor-pointer"
                            >
                                Dev. Total
                            </button>
                        </div>
                    }
                    <button className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-all cursor-pointer">Histórico</button>
                </td>
            </tr>
            <ModalDevTotal 
                isOpen={isModalOpen}
                setIsOpen={setIsModalOpen}
                handleDevTotal={() => {
                    handleDevTotal();
                    setIsModalOpen(false);
                }}
            />
        </>
    )
}