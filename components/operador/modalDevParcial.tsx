import { useState } from "react";

interface ModalDevParcialProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    onConfirm: (radios: string) => void;
    error?: string | null;
}

export default function ModalDevParcial({ isOpen, setIsOpen, onConfirm, error }: ModalDevParcialProps) {
    const [input, setInput] = useState("");

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg flex flex-col gap-4 w-[600px]">
                <h2 className="text-2xl font-bold text-[#6f0a5e]">Devolução Parcial</h2>
                <p className="text-gray-600">
                    Digite o número dos rádios que serão devolvidos:
                </p>
                <input
                    type="text"
                    className="text-black border border-gray-300 rounded-md p-2"
                    placeholder="Ex: 01,02,03"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                />
                {error && <span className="text-red-500 text-sm">{error}</span>}
                <div className="flex justify-between gap-4">
                    <button onClick={() => setIsOpen(false)} className="bg-gray-400 text-black px-4 py-2 rounded-[5px] w-[50%] hover:bg-gray-500 transition-all cursor-pointer" type="button">Cancelar</button>
                    <button onClick={() => onConfirm(input)} className="bg-[#6f0a5e] text-white px-4 py-2 rounded-[5px] w-[50%] hover:bg-[#58084b] transition-all cursor-pointer" type="button">Confirmar</button>
                </div>
            </div>
        </div>
    )
}