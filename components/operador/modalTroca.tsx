import { useState, useEffect } from "react";

interface ModalTrocaProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    onConfirm: (antigo: string, novo: string) => void;
    error?: string | null;
    radiosDisponiveis?: string[];
}

export default function ModalTroca({ isOpen, setIsOpen, onConfirm, error, radiosDisponiveis = [] }: ModalTrocaProps) {
    const [radioSelecionado, setRadioSelecionado] = useState("");
    const [novoRadio, setNovoRadio] = useState("");
    const [erroLocal, setErroLocal] = useState<string | null>(null);

    // Resetar campos quando modal abrir/fechar
    useEffect(() => {
        if (isOpen) {
            setRadioSelecionado("");
            setNovoRadio("");
            setErroLocal(null);
        }
    }, [isOpen]);

    const handleConfirmar = () => {
        // Validações
        if (!radioSelecionado) {
            setErroLocal("Selecione um rádio para trocar");
            return;
        }

        if (!novoRadio.trim()) {
            setErroLocal("Digite o número do novo rádio");
            return;
        }

        if (novoRadio.trim() === radioSelecionado) {
            setErroLocal("O novo rádio não pode ser igual ao atual");
            return;
        }

        if (radiosDisponiveis.includes(novoRadio.trim())) {
            setErroLocal("Este número de rádio já existe");
            return;
        }

        setErroLocal(null);
        onConfirm(radioSelecionado, novoRadio.trim());
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg flex flex-col gap-4 w-[500px] max-w-[90vw] max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-[#6f0a5e]">🔄 Troca de Rádio</h2>
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="text-gray-500 hover:text-gray-700 text-xl"
                    >
                        ×
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Seção: Selecionar Rádio Atual */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h3 className="text-lg font-semibold text-blue-800 mb-2">
                            📻 Selecione o Rádio para Trocar
                        </h3>
                        <p className="text-sm text-blue-600 mb-3">
                            Escolha qual rádio você deseja trocar:
                        </p>
                        
                        {radiosDisponiveis.length > 0 ? (
                            <>
                                <select
                                    value={radioSelecionado}
                                    onChange={(e) => setRadioSelecionado(e.target.value)}
                                    className="w-full p-3 border border-blue-300 rounded-lg bg-white text-blue-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
                                >
                                    <option value="">-- Selecione um rádio --</option>
                                    {radiosDisponiveis.map((radio) => (
                                        <option key={radio} value={radio}>
                                            Rádio {radio}
                                        </option>
                                    ))}
                                </select>
                                
                                {/* Visualização dos rádios disponíveis */}
                                <div className="bg-white p-3 rounded-lg border border-blue-200">
                                    <p className="text-xs text-blue-600 mb-2 font-medium">Rádios disponíveis:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {radiosDisponiveis.map((radio) => (
                                            <span
                                                key={radio}
                                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    radio === radioSelecionado
                                                        ? 'bg-blue-500 text-white'
                                                        : 'bg-blue-100 text-blue-700'
                                                }`}
                                            >
                                                {radio}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-red-500 text-sm p-3 bg-red-50 rounded-lg">
                                Nenhum rádio disponível para troca
                            </div>
                        )}
                    </div>

                    {/* Seção: Novo Rádio */}
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h3 className="text-lg font-semibold text-green-800 mb-2">
                            🆕 Novo Número do Rádio
                        </h3>
                        <p className="text-sm text-green-600 mb-3">
                            Digite o número do novo rádio:
                        </p>
                        <input
                            type="text"
                            className="w-full p-3 border border-green-300 rounded-lg bg-white text-green-800 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            placeholder="Ex: 99"
                            value={novoRadio}
                            onChange={(e) => setNovoRadio(e.target.value)}
                        />
                    </div>

                    {/* Resumo da Troca */}
                    {radioSelecionado && novoRadio && (
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                            <h3 className="text-lg font-semibold text-purple-800 mb-2">
                                📋 Resumo da Troca
                            </h3>
                            <div className="flex items-center justify-center gap-4 text-purple-700">
                                <span className="bg-red-100 px-3 py-1 rounded-full text-sm font-medium">
                                    Rádio {radioSelecionado}
                                </span>
                                <span className="text-xl">→</span>
                                <span className="bg-green-100 px-3 py-1 rounded-full text-sm font-medium">
                                    Rádio {novoRadio}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Mensagens de Erro */}
                    {(error || erroLocal) && (
                        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                            <p className="text-red-700 text-sm">
                                {error || erroLocal}
                            </p>
                        </div>
                    )}
                </div>

                {/* Botões */}
                <div className="flex gap-3 pt-4">
                    <button 
                        onClick={() => setIsOpen(false)} 
                        className="flex-1 bg-gray-400 text-white px-4 py-3 rounded-lg hover:bg-gray-500 transition-all cursor-pointer font-medium"
                    >
                        ❌ Cancelar
                    </button>
                    <button 
                        onClick={handleConfirmar}
                        disabled={!radioSelecionado || !novoRadio.trim()}
                        className="flex-1 bg-[#6f0a5e] text-white px-4 py-3 rounded-lg hover:bg-[#58084b] transition-all cursor-pointer font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        ✅ Confirmar Troca
                    </button>
                </div>
            </div>
        </div>
    );
}