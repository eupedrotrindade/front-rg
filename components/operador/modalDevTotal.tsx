interface ModalDevTotalProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    handleDevTotal: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const ModalDevTotal = ({ isOpen, setIsOpen, handleDevTotal }: ModalDevTotalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg flex flex-col gap-4 w-[600px]">
                <h2 className="text-2xl font-bold text-[#6f0a5e]">Confirmar Devolução Total</h2>
                <p className="text-gray-600">
                    Deseja confirmar a devolução total do rádio?
                </p>
                <div className="flex justify-between gap-4">
                    <button onClick={() => setIsOpen(false)} className="bg-gray-400 text-black px-4 py-2 rounded-[5px] w-[50%] hover:bg-gray-500 transition-all cursor-pointer" type="button">Cancelar</button>
                    <button onClick={handleDevTotal} className="bg-[#6f0a5e] text-white px-4 py-2 rounded-[5px] w-[50%] hover:bg-[#58084b] transition-all cursor-pointer" type="button">Confirmar</button>
                </div>
            </div>
        </div>
    )
}