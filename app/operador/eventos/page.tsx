/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import type { Operator } from "@/features/operadores/types"
import Image from "next/image"
import Link from "next/link"
import { useEventos } from "@/features/eventos/api/query/use-eventos"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, LogOut, User, AlertCircle, RefreshCw, ImageIcon } from "lucide-react"

const getOperatorFromStorage = () => {
    if (typeof window === "undefined") return null
    const raw = localStorage.getItem("operador")
    console.log("🔍 getOperatorFromStorage - raw:", raw);

    if (!raw) {
        console.log("❌ Nenhum operador encontrado no localStorage");
        return null;
    }

    try {
        const operator = JSON.parse(raw);
        console.log("🔍 Operador parseado do localStorage:", operator);
        console.log("🔍 operator.id_events:", operator.id_events);
        console.log("🔍 typeof operator.id_events:", typeof operator.id_events);

        // Verificar se o operador tem os dados necessários
        if (!operator.id) {
            console.log("❌ Operador não tem ID");
            return null;
        }

        if (!operator.id_events) {
            console.log("❌ Operador não tem id_events");
            return null;
        }

        return operator;
    } catch (error) {
        console.error("❌ Erro ao fazer parse do operador:", error);
        return null;
    }
}

const getEventIds = (operator: Operator | null): string[] => {
    console.log("🔍 getEventIds - operator:", operator);

    if (!operator) {
        console.log("❌ Operador não encontrado");
        return [];
    }

    console.log("🔍 operator.id_events:", operator.id_events);
    console.log("🔍 typeof operator.id_events:", typeof operator.id_events);

    if (!operator.id_events) {
        console.log("❌ operator.id_events está vazio");
        return [];
    }

    // Função para extrair apenas o ID do evento (removendo a data se existir)
    const extractEventId = (eventString: string): string => {
        // Se contém dois pontos, pegar apenas a parte antes dos dois pontos (ID do evento)
        if (eventString.includes(':')) {
            const parts = eventString.split(':');
            const eventId = parts[0].trim();
            console.log(`🔍 Extraindo ID de "${eventString}" -> "${eventId}"`);
            return eventId;
        }
        return eventString.trim();
    };

    // Se já é um array
    if (Array.isArray(operator.id_events)) {
        console.log("✅ id_events é um array:", operator.id_events);
        return operator.id_events.map(item => extractEventId(String(item)));
    }

    // Se é uma string
    if (typeof operator.id_events === "string") {
        console.log("✅ id_events é uma string:", operator.id_events);

        // Se contém vírgulas, é uma lista separada por vírgulas
        if (operator.id_events.includes(",")) {
            const ids = operator.id_events
                .split(",")
                .map(id => extractEventId(id))
                .filter(id => id.length > 0);
            console.log("✅ IDs extraídos da string com vírgulas:", ids);
            return ids;
        }

        // Se é um JSON string
        if (operator.id_events.startsWith("[") || operator.id_events.startsWith("{")) {
            try {
                const parsed = JSON.parse(operator.id_events);
                console.log("✅ JSON parseado:", parsed);

                if (Array.isArray(parsed)) {
                    return parsed.map(item => extractEventId(String(item)));
                } else if (typeof parsed === "object" && parsed !== null) {
                    // Se é um objeto, tentar extrair IDs de propriedades comuns
                    const possibleIds = Object.values(parsed)
                        .filter(val => typeof val === "string" && val.length > 0)
                        .map(val => extractEventId(String(val)));
                    console.log("✅ IDs extraídos do objeto:", possibleIds);
                    return possibleIds;
                }
            } catch (error) {
                console.error("❌ Erro ao fazer parse do JSON:", error);
            }
        }

        // Se é apenas uma string simples
        console.log("✅ Retornando string única:", operator.id_events);
        return [extractEventId(operator.id_events)];
    }

    console.log("❌ Formato não reconhecido para id_events");
    return [];
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

    console.log("🔍 eventosArray:", eventosArray);
    console.log("🔍 eventIds:", eventIds);
    console.log("🔍 currentOperator:", currentOperator);

    // Filtrar eventos do operador
    const eventosOperadorFiltrados = eventosArray.filter((evento) => {
        const eventoId = String(evento.id);
        const isIncluded = eventIds.includes(eventoId);
        console.log(`🔍 Evento ${evento.name} (${eventoId}) - Incluído: ${isIncluded}`);
        return isIncluded;
    });

    console.log("🔍 eventosOperador filtrados:", eventosOperadorFiltrados);

    // Ordenar do mais recente para o mais antigo
    const eventosOperador = [...eventosOperadorFiltrados].sort((a, b) => {
        const aDate = new Date((a as any).createdAt ?? a.startDate ?? 0).getTime();
        const bDate = new Date((b as any).createdAt ?? b.startDate ?? 0).getTime();
        return bDate - aDate;
    });

    // Testar se o operador tem acesso ao evento específico
    const testEventId = "e6a4738a-b446-48d7-b5aa-d976613edf70";
    const hasAccessToTestEvent = eventIds.includes(testEventId);
    console.log(`🔍 Operador tem acesso ao evento teste (${testEventId}): ${hasAccessToTestEvent}`);

    // Verificar se o evento teste existe na lista de eventos
    const testEventExists = eventosArray.find(evento => String(evento.id) === testEventId);
    console.log(`🔍 Evento teste existe na lista: ${!!testEventExists}`);
    if (testEventExists) {
        console.log("🔍 Evento teste encontrado:", testEventExists.name);
    }

    // Testar formato id:data
    const testIdWithDate = "e6a4738a-b446-48d7-b5aa-d976613edf70:2025-08-01";
    const extractedId = testIdWithDate.split(':')[0];
    console.log(`🔍 Teste formato id:data - Original: "${testIdWithDate}" -> Extraído: "${extractedId}"`);
    console.log(`🔍 ID extraído está na lista de IDs: ${eventIds.includes(extractedId)}`);

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

                        {/* Debug info
                        {operadorInfo && (
                            <div className="mt-4 p-4 bg-gray-100 rounded-lg text-left max-w-2xl mx-auto">
                                <h3 className="font-semibold text-gray-800 mb-2">Debug Info:</h3>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <p>Total de eventos carregados: {eventosArray.length}</p>
                                    <p>IDs de eventos do operador: {eventIds.join(', ') || 'Nenhum'}</p>
                                    <p>Eventos filtrados: {eventosOperador.length}</p>
                                    <p>Operador: {operadorInfo.nome} (CPF: {operadorInfo.cpf})</p>
                                    <p>Acesso ao evento teste: {hasAccessToTestEvent ? 'Sim' : 'Não'}</p>
                                    <p>Evento teste existe: {testEventExists ? 'Sim' : 'Não'}</p>
                                    {testEventExists && <p>Nome do evento teste: {testEventExists.name}</p>}
                                    <p>Teste formato id:data: {eventIds.includes(extractedId) ? 'Funcionando' : 'Falhou'}</p>
                                </div>
                            </div>
                        )} */}
                    </div>

                    {operadorInfo && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                                    <div
                                        key={evento.id}
                                        className="bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl group"
                                    >
                                        {/* Área da imagem */}
                                        <div className="relative bg-transparent aspect-square p-6">
                                            <div className="w-full h-full flex items-center justify-center">
                                                {evento.bannerUrl ? (
                                                    <Image
                                                        src={evento.bannerUrl}
                                                        alt={evento.name}
                                                        width={400}
                                                        height={400}
                                                        className="object-contain max-w-full max-h-full rounded-md"
                                                    />
                                                ) : (
                                                    <div className="text-center">
                                                        <ImageIcon className="h-16 w-16 text-black/70 mx-auto mb-2" />
                                                        <span className="text-black/70 text-sm">Sem imagem</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Hashtag no topo */}
                                            <div className="absolute top-4 left-4">
                                                <span className="text-purple-700 text-sm font-semibold">#RGFazAcontecer!</span>
                                            </div>

                                            {/* Logo RG no canto inferior direito */}
                                            <div className="absolute bottom-4 right-4">
                                                <div className="bg-white rounded-full px-3 py-1">
                                                    <span className="text-purple-700 text-xs font-bold">RG</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Conteúdo inferior */}
                                        <div className="p-6 text-center">
                                            {/* Título */}
                                            <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                                                {evento.name}
                                            </h3>

                                            {/* Data */}
                                            <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mb-4">
                                                <Calendar className="h-4 w-4" />
                                                <span>
                                                    {evento.startDate ? formatDate(evento.startDate) : 'Data a definir'}
                                                </span>
                                            </div>

                                            {/* Botão */}
                                            <Link href={`/operador/painel/${evento.id}`} className="block">
                                                <Button className="bg-purple-700 hover:bg-purple-700 text-white px-8 py-2 rounded-full transition-all duration-200">
                                                    Acessar
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
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
