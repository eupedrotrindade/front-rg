'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { User, DoorOpen, Search, X, Loader2, LogOut, AlertCircle } from 'lucide-react'
import { useOperators } from '@/features/operadores/api/query/use-operators'
import type { Operator } from '@/features/operadores/types'

const formatCPF = (cpf: string): string => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
}

interface UserSelectorModalProps {
    isOpen: boolean
    onClose: () => void
}

const UserSelectorModal = ({ isOpen, onClose }: UserSelectorModalProps) => {
    const router = useRouter()
    const [selectedUser, setSelectedUser] = useState<string>('')
    const [searchTerm, setSearchTerm] = useState('')
    const [currentOperator, setCurrentOperator] = useState<Operator | null>(null)
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

    // Use the same hook as the operators page
    const { data: allOperators = [], isLoading: loading, error } = useOperators()

    // Check if there's already a logged in operator
    useEffect(() => {
        if (isOpen) {
            const operadorRaw = localStorage.getItem('operador')
            if (operadorRaw) {
                try {
                    const operator = JSON.parse(operadorRaw)
                    setCurrentOperator(operator)
                } catch (error) {
                    console.error('Erro ao parsear operador do localStorage:', error)
                    localStorage.removeItem('operador')
                }
            }
        }
    }, [isOpen])

    // Filter operators based on search
    const filteredOperators = useMemo(() => {
        if (!searchTerm.trim()) return allOperators

        return allOperators.filter(operator => 
            operator.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            operator.cpf.includes(searchTerm.replace(/\D/g, ''))
        )
    }, [allOperators, searchTerm])

    const handleUserSelect = (userId: string) => {
        setSelectedUser(userId)
    }

    const performLogin = (operatorToLogin: Operator) => {
        // Preservar ações antigas se existirem
        const operadorRaw = localStorage.getItem("operador")
        let acoesAntigas = []
        if (operadorRaw) {
            try {
                const operadorAntigo = JSON.parse(operadorRaw)
                if (Array.isArray(operadorAntigo.acoes)) {
                    acoesAntigas = operadorAntigo.acoes
                }
            } catch { }
        }

        const operadorParaSalvar = { ...operatorToLogin }
        if (!Array.isArray(operatorToLogin.acoes) && acoesAntigas.length > 0) {
            operadorParaSalvar.acoes = acoesAntigas
        }

        // Salvar no localStorage (mesmo comportamento da página de login)
        localStorage.setItem("operador", JSON.stringify(operadorParaSalvar))

        // Disparar evento customizado para notificar outras partes do sistema
        window.dispatchEvent(new CustomEvent("operador-updated", { detail: operadorParaSalvar }))

        console.log('Login automático realizado:', operatorToLogin.nome, formatCPF(operatorToLogin.cpf))
        
        // Redirecionar para eventos do operador
        router.push('/operador/eventos')
        onClose()
    }

    const handleLogin = () => {
        if (selectedUser) {
            const selectedOperator = allOperators.find(op => op.id === selectedUser)
            if (selectedOperator) {
                // Se já tem alguém logado, verificar se é o mesmo
                if (currentOperator) {
                    if (currentOperator.id === selectedOperator.id) {
                        // Mesmo operador, ir direto para eventos
                        router.push('/operador/eventos')
                        onClose()
                        return
                    } else {
                        // Operador diferente, mostrar confirmação de logout
                        setShowLogoutConfirm(true)
                        return
                    }
                }
                
                // Nenhum operador logado, fazer login direto
                performLogin(selectedOperator)
            }
        }
    }

    const handleLogout = () => {
        localStorage.removeItem('operador')
        setCurrentOperator(null)
        setShowLogoutConfirm(false)
        
        // Disparar evento de logout
        window.dispatchEvent(new CustomEvent("operador-logout"))
    }

    const handleConfirmNewLogin = () => {
        const selectedOperator = allOperators.find(op => op.id === selectedUser)
        if (selectedOperator) {
            handleLogout()
            setTimeout(() => {
                performLogin(selectedOperator)
            }, 100)
        }
        setShowLogoutConfirm(false)
    }

    const handleGoToEvents = () => {
        router.push('/operador/eventos')
        onClose()
    }

    const clearFilters = () => {
        setSearchTerm('')
        setSelectedUser('')
    }

    const handleClose = () => {
        setSearchTerm('')
        setSelectedUser('')
        setCurrentOperator(null)
        setShowLogoutConfirm(false)
        onClose()
    }

    return (
        <>
            <Dialog open={isOpen && !showLogoutConfirm} onOpenChange={handleClose}>
                <DialogContent className="w-full max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <DoorOpen className="w-5 h-5" />
                            Selecionar Usuário para Credenciamento
                        </DialogTitle>
                    </DialogHeader>

                    {/* Operador Atual Logado */}
                    {currentOperator && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <User className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-blue-900">Operador Ativo</p>
                                        <p className="text-sm text-blue-700 truncate">{currentOperator.nome}</p>
                                        <p className="text-xs text-blue-600">{formatCPF(currentOperator.cpf)}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleGoToEvents}
                                        className="text-blue-600 border-blue-300 hover:bg-blue-50 flex-1 sm:flex-initial"
                                    >
                                        <DoorOpen className="w-4 h-4 mr-1" />
                                        <span className="sm:inline">Ir para Eventos</span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleLogout}
                                        className="text-red-600 border-red-300 hover:bg-red-50 flex-1 sm:flex-initial"
                                    >
                                        <LogOut className="w-4 h-4 mr-1" />
                                        <span className="sm:inline">Desconectar</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                
                {/* Search and Filter Section */}
                <div className="space-y-3 py-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            type="text"
                            placeholder="Pesquisar usuário..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-10"
                        />
                        {searchTerm && (
                            <button
                                onClick={clearFilters}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    
                    <div className="text-sm text-gray-600">
                        Digite o nome ou CPF do operador para pesquisar
                    </div>
                </div>
                
                {/* Results count */}
                {!loading && !error && filteredOperators.length > 0 && (
                    <div className="text-sm text-gray-500 px-1">
                        {filteredOperators.length} operador{filteredOperators.length !== 1 ? 'es' : ''} encontrado{filteredOperators.length !== 1 ? 's' : ''}
                    </div>
                )}
                
                <div className="space-y-3 py-2 max-h-48 sm:max-h-64 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                            <span className="ml-2 text-gray-500">Carregando operadores...</span>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-red-500">
                            <X className="w-8 h-8 mx-auto mb-2" />
                            <p>Erro ao carregar operadores</p>
                        </div>
                    ) : filteredOperators.length > 0 ? (
                        filteredOperators.map((operator) => (
                        <div
                            key={operator.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                selectedUser === operator.id
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                            onClick={() => handleUserSelect(operator.id)}
                        >
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                                    <User className="w-4 h-4 text-gray-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-900 truncate">{operator.nome}</div>
                                    <div className="text-sm text-gray-500">{formatCPF(operator.cpf)}</div>
                                </div>
                                {selectedUser === operator.id && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                )}
                            </div>
                        </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>Nenhum operador encontrado</p>
                            {searchTerm && <p className="text-sm">Tente ajustar sua pesquisa</p>}
                        </div>
                    )}
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                    <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleLogin}
                        disabled={(!selectedUser && !currentOperator) || loading}
                        className="flex items-center justify-center gap-2 w-full sm:w-auto"
                    >
                        <DoorOpen className="w-4 h-4" />
                        <span className="truncate">
                            {currentOperator && !selectedUser 
                                ? 'Ir para Eventos' 
                                : selectedUser && currentOperator && selectedUser === currentOperator.id
                                    ? 'Ir para Eventos'
                                    : 'Acessar Credenciamento'
                            }
                        </span>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Modal de Confirmação de Logout */}
        <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
            <DialogContent className="w-full max-w-[95vw] sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-amber-600">
                        <AlertCircle className="w-5 h-5" />
                        Trocar de Operador
                    </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-sm text-amber-800">
                            <strong>Operador atual:</strong> 
                            <span className="block sm:inline sm:ml-1 break-words">
                                {currentOperator?.nome} ({currentOperator?.cpf && formatCPF(currentOperator.cpf)})
                            </span>
                        </p>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                            <strong>Novo operador:</strong> 
                            <span className="block sm:inline sm:ml-1 break-words">
                                {allOperators.find(op => op.id === selectedUser)?.nome} ({allOperators.find(op => op.id === selectedUser)?.cpf && formatCPF(allOperators.find(op => op.id === selectedUser)!.cpf)})
                            </span>
                        </p>
                    </div>
                    
                    <p className="text-sm text-gray-600">
                        Deseja desconectar do operador atual e fazer login com o novo operador selecionado?
                    </p>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => setShowLogoutConfirm(false)} className="w-full sm:w-auto">
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleConfirmNewLogin}
                        className="bg-amber-600 hover:bg-amber-700 text-white w-full sm:w-auto"
                    >
                        Trocar Operador
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
    )
}

export default UserSelectorModal