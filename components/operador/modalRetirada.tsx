import type { Retirada } from "@/app/operador/radios/types"
import { useState } from "react"

interface ModalRetiradaProps {
    isOpen: boolean;
    setIsOpen: Function;
    onAddRetirada: (novaRetirada: Retirada) => void;
}

export default function ModalRetirada({ isOpen, setIsOpen, onAddRetirada }: ModalRetiradaProps) {
    const [formData, setFormData] = useState({
        nome: '',
        contato: '',
        radios: ''
    })

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!formData.nome.trim() || !formData.radios.trim()) {
            alert('Por favor, preencha todos os campos obrigatórios')
            return
        }

        const radiosArray = formData.radios
            .split(',')
            .map(radio => radio.trim())
            .filter(radio => radio !== '')

        if (radiosArray.length === 0) {
            alert('Por favor, insira pelo menos um número de rádio')
            return
        }

        const novaRetirada: Retirada = {
            nome: formData.nome.trim(),
            contato: formData.contato.trim(),
            radios: radiosArray,
            retirada: new Date().toLocaleString('pt-BR'),
            devolucao: '', 
            status: false
        }

        onAddRetirada(novaRetirada)

        setFormData({
            nome: '',
            contato: '',
            radios: ''
        })
        setIsOpen(false)
    }

    const handleCancel = () => {
        setFormData({
            nome: '',
            contato: '',
            radios: ''
        })
        setIsOpen(false)
    }

    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg flex flex-col gap-4 w-[600px]">
                <h2 className="text-2xl font-bold text-[#6f0a5e]">Nova Retirada de Rádio</h2>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="text-[#6f0a5e] font-medium" htmlFor="nome">Nome/Empresa *</label>
                        <input 
                            className="border border-gray-300 rounded-md p-3 text-black w-full mt-1 focus:outline-none focus:ring-2 focus:ring-[#6f0a5e]" 
                            type="text" 
                            id="nome" 
                            name="nome"
                            value={formData.nome}
                            onChange={handleInputChange}
                            placeholder="Digite o nome da empresa" 
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="text-[#6f0a5e] font-medium" htmlFor="contato">Contato (Opcional)</label>
                        <input 
                            className="border border-gray-300 rounded-md p-3 text-black w-full mt-1 focus:outline-none focus:ring-2 focus:ring-[#6f0a5e]" 
                            type="text" 
                            id="contato" 
                            name="contato"
                            value={formData.contato}
                            onChange={handleInputChange}
                            placeholder="Telefone, email, etc" 
                        />
                    </div>
                    
                    <div>
                        <label className="text-[#6f0a5e] font-medium" htmlFor="radios">Número dos Rádios *</label>
                        <input 
                            className="border border-gray-300 rounded-md p-3 text-black w-full mt-1 focus:outline-none focus:ring-2 focus:ring-[#6f0a5e]" 
                            type="text" 
                            id="radios" 
                            name="radios"
                            value={formData.radios}
                            onChange={handleInputChange}
                            placeholder="Ex: 01, 02, 03" 
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">Separe os números por vírgula</p>
                    </div>
                    
                    <div className="flex gap-4 mt-4">
                        <button 
                            onClick={handleCancel}
                            className="cursor-pointer bg-gray-400 text-black px-4 py-3 rounded-md w-[50%] hover:bg-gray-500 transition-all" 
                            type="button"
                        >
                            Cancelar
                        </button>
                        <button 
                            className="cursor-pointer bg-[#6f0a5e] text-white px-4 py-3 rounded-md w-[50%] hover:bg-[#58084b] transition-all" 
                            type="submit"
                        >
                            Salvar
                        </button>
                    </div>
                </form>
            </div>   
        </div>
    )
}