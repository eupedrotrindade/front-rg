import { useState } from "react";

interface ModalTrocaProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    onConfirm: (antigo: string, novo: string) => void;
    error?: string | null;
}

export default function ModalTroca({ isOpen, setIsOpen, onConfirm, error }: ModalTrocaProps) {
    const [antigo, setAntigo] = useState("");
    const [novo, setNovo] = useState("");

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg flex flex-col gap-4 w-[600px]">
                <h2 className="text-2xl font-bold text-[#6f0a5e]">Troca de Rádio</h2>
                <p className="text-gray-600">Digite o número do rádio a ser trocado:</p>
                <input
                    type="text"
                    className="text-black border border-gray-300 rounded-md p-2"
                    placeholder="Ex: 01"
                    value={antigo}
                    onChange={e => setAntigo(e.target.value)}
                />
                <p className="text-gray-600">Digite o número do novo rádio:</p>
                <input
                    type="text"
                    className="text-black border border-gray-300 rounded-md p-2"
                    placeholder="Ex: 99"
                    value={novo}
                    onChange={e => setNovo(e.target.value)}
                />
                {error && <span className="text-red-500 text-sm">{error}</span>}
                <div className="flex justify-between gap-4">
                    <button onClick={() => setIsOpen(false)} className="bg-gray-400 text-black px-4 py-2 rounded-[5px] w-[50%] hover:bg-gray-500 transition-all cursor-pointer" type="button">Cancelar</button>
                    <button onClick={() => onConfirm(antigo, novo)} className="bg-[#6f0a5e] text-white px-4 py-2 rounded-[5px] w-[50%] hover:bg-[#58084b] transition-all cursor-pointer" type="button">Confirmar</button>
                </div>
            </div>
        </div>
    )
}