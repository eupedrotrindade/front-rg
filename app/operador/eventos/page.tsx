"use client"

import { useState, useEffect } from "react"
import type { Operator } from "@/features/operadores/types"
import Image from "next/image"
import Link from "next/link"
import { useEventos } from "@/features/eventos/api/query/use-eventos"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, LogOut, User, AlertCircle, RefreshCw } from "lucide-react"

const getOperatorFromStorage = () => {
    if (typeof window === "undefined") return null
    const raw = localStorage.getItem("operador")
    if (!raw) return null
    try {
        return JSON.parse(raw)
    } catch {
        return null
    }
}

const getEventIds = (operator: Operator | null): string[] => {
    if (!operator || !operator.id_events) return []
    if (Array.isArray(operator.id_events)) return operator.id_events.map(String)
    if (typeof operator.id_events === "string") {
        try {
            const arr = JSON.parse(operator.id_events)
            if (Array.isArray(arr)) return arr.map(String)
            return [operator.id_events]
        } catch {
            return [operator.id_events]
        }
    }
    return []
}

const formatDate = (date: string) => {
    if (!date) return ""
    const d = new Date(date)
    return d.toLocaleDateString("pt-BR")
}

const OperadorEventosPage = () => {
    const [error, setError] = useState("")
    const [operadorInfo, setOperadorInfo] = useState<{ nome: string; cpf: string } | null>(null)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const { data: eventos, isLoading: eventosLoading, refetch } = useEventos()

    const [currentOperator, setCurrentOperator] = useState<Operator | null>(null);

    useEffect(() => {
        const initialOperator = getOperatorFromStorage();
        setCurrentOperator(initialOperator);
        if (initialOperator) {
            setOperadorInfo({ nome: initialOperator.nome, cpf: initialOperator.cpf });
        } else {
            setOperadorInfo(null);
        }
    }, []);

    // Garantir que todos os dados são arrays
    const eventosArray = Array.isArray(eventos) ? eventos : []
    const eventIdsRaw = getEventIds(currentOperator)
    const eventIds = Array.isArray(eventIdsRaw)
        ? eventIdsRaw.flatMap((id) =>
            typeof id === "string" && id.includes(",")
                ? id
                    .split(",")
                    .map((item) => item.trim())
                    .filter((item) => !!item)
                : [id],
        )
        : []

    // Filtrar eventos do operador
    const eventosOperador = eventosArray.filter((evento) => eventIds.includes(String(evento.id)))

    // Sistema de sincronização em tempo real
    useEffect(() => {
        const handleEventosUpdated = () => {
            console.log("🔄 Eventos atualizados - recarregando dados...")
            setIsRefreshing(true)
            refetch().finally(() => {
                setIsRefreshing(false)
            })
        }

        const handleOperadorUpdated = (event: Event) => {
            console.log("🔄 Operador atualizado - recarregando dados...")
            const customEvent = event as CustomEvent;
            if (customEvent.detail) {
                const updatedOperatorData = customEvent.detail;
                setOperadorInfo({ nome: updatedOperatorData.nome, cpf: updatedOperatorData.cpf });
                setCurrentOperator(updatedOperatorData); // Update the full operator object as well
            }
        }

        window.addEventListener("eventos-updated", handleEventosUpdated)
        window.addEventListener("operador-updated", handleOperadorUpdated)

        return () => {
            window.removeEventListener("eventos-updated", handleEventosUpdated)
            window.removeEventListener("operador-updated", handleOperadorUpdated)
        }
    }, [refetch])

    const handleManualRefresh = () => {
        setIsRefreshing(true)
        refetch().finally(() => {
            setIsRefreshing(false)
        })
    }

    const sair = () => {
        localStorage.removeItem("operador")
        window.location.href = "/"
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white backdrop-blur-sm shadow-lg border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="text-center md:text-left">
                            <Image
                                src="/images/logo-rg-fone.png"
                                alt="Logo RG"
                                className="mx-auto md:mx-0 h-12 w-auto drop-shadow-lg"
                                width={160}
                                height={48}
                            />
                        </div>

                        {operadorInfo ? (
                            <div className="flex flex-col md:flex-row items-center gap-4">
                                <div className="bg-pink-100 text-pink-800 rounded-lg px-4 py-2 font-semibold text-sm flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    {operadorInfo.nome} | CPF: {operadorInfo.cpf}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={handleManualRefresh}
                                        variant="outline"
                                        size="sm"
                                        disabled={isRefreshing}
                                        className="flex items-center gap-2"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                        {isRefreshing ? 'Atualizando...' : 'Atualizar'}
                                    </Button>
                                    <Button onClick={sair} variant="destructive" size="sm" className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200">
                                        <LogOut className="w-4 h-4" />
                                        Sair
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-red-100 text-red-800 rounded-lg px-4 py-2 font-semibold text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                Você precisa estar logado como operador
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Credenciamento RG Produções e Eventos</h1>
                        <p className="text-lg text-gray-600">Selecione um evento para acessar</p>
                        {isRefreshing && (
                            <div className="mt-4 flex items-center justify-center gap-2 text-pink-600">
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span className="text-sm">Sincronizando dados em tempo real...</span>
                            </div>
                        )}
                    </div>

                    {operadorInfo && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {eventosLoading ? (
                                <div className="col-span-full flex justify-center items-center py-12">
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
                                        <p className="text-gray-600">Carregando eventos...</p>
                                    </div>
                                </div>
                            ) : error ? (
                                <div className="col-span-full text-center py-12">
                                    <div className="bg-red-100 text-red-800 rounded-lg p-6 max-w-md mx-auto">
                                        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                                        <p className="font-semibold">{error}</p>
                                    </div>
                                </div>
                            ) : eventosOperador.length === 0 ? (
                                <div className="col-span-full text-center py-12">
                                    <div className="bg-gray-100 rounded-lg p-8 max-w-md mx-auto">
                                        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                        <p className="text-gray-600 font-medium">Nenhum evento encontrado para este operador.</p>
                                    </div>
                                </div>
                            ) : (
                                eventosOperador.map((evento) => (
                                    <Card
                                        key={evento.id}
                                        className="hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 shadow-lg"
                                    >
                                        <CardHeader className="p-0">
                                            <div className="relative h-48 w-full">
                                                <Image
                                                    src={evento.bannerUrl || "/placeholder.svg?height=192&width=384&text=Evento"}
                                                    alt={evento.name}
                                                    className="w-full h-full object-cover rounded-t-lg"
                                                    width={384}
                                                    height={192}
                                                />
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-6">
                                            <CardTitle className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">{evento.name}</CardTitle>

                                            {evento.startDate && (
                                                <div className="flex items-center gap-2 mb-4 text-gray-600">
                                                    <Calendar className="w-4 h-4" />
                                                    <span className="text-sm font-medium">{formatDate(evento.startDate)}</span>
                                                </div>
                                            )}

                                            <Link href={`/operador/painel/${evento.id}`} className="block">
                                                <Button className="w-full bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200">
                                                    Acessar Evento
                                                </Button>
                                            </Link>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    )}

                    {!operadorInfo && (
                        <div className="text-center py-12">
                            <Card className="max-w-md mx-auto shadow-xl border-0">
                                <CardHeader className="flex flex-col items-center pb-4">
                                    <div className="bg-red-100 p-4 rounded-full mb-4">
                                        <AlertCircle className="h-12 w-12 text-red-600" />
                                    </div>
                                    <CardTitle className="text-2xl font-bold text-gray-900 text-center">Acesso Restrito</CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col items-center gap-4 pt-0">
                                    <p className="text-center text-gray-600 leading-relaxed">
                                        Você precisa estar logado como operador para acessar os eventos.
                                    </p>
                                    <Link href="/operador/login" className="w-full">
                                        <Button className="w-full bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200">
                                            Fazer Login
                                        </Button>
                                    </Link>
                                    <Link href="/" className="w-full">
                                        <Button variant="ghost" className="w-full text-gray-600 hover:text-gray-800 hover:bg-gray-100">
                                            Voltar ao Início
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white backdrop-blur-sm border-t border-gray-200 mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="text-center">
                        <Image
                            src="/images/slogan-rg.png"
                            width={200}
                            height={60}
                            alt="Se tem RG, é sucesso!"
                            className="mx-auto opacity-90 drop-shadow-sm"
                        />
                        <p className="text-sm text-gray-600 mt-4">© 2024 RG Produções e Eventos. Todos os direitos reservados.</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}

export default OperadorEventosPage
