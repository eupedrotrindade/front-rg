"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Operator } from "@/features/operadores/types";
import Image from "next/image";

const getOperatorFromStorage = () => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("operador");
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const getEventIds = (operator: Operator | null): string[] => {
    if (!operator || !operator.id_events) return [];
    if (Array.isArray(operator.id_events)) return operator.id_events.map(String);
    if (typeof operator.id_events === "string") {
        try {
            const arr = JSON.parse(operator.id_events);
            if (Array.isArray(arr)) return arr.map(String);
            return [operator.id_events];
        } catch {
            return [operator.id_events];
        }
    }
    return [];
};

const formatDate = (date: string) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("pt-BR");
};

type EventApi = {
    Id: number;
    CreatedAt: string;
    UpdatedAt: string;
    id_evento: string;
    nome_evento: string;
    senha_acesso: string;
    status: string;
    id_tabela: string;
    capa: string;
    data: string;
    id_tabela_radio: string;
};

const OperadorEventosPage = () => {
    const router = useRouter();
    const [showModal, setShowModal] = useState(false);
    const [eventoSelecionado, setEventoSelecionado] = useState<EventApi | null>(null);
    const [eventos, setEventos] = useState<EventApi[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [operadorInfo, setOperadorInfo] = useState<{ nome: string; cpf: string } | null>(null);

    const operator = typeof window !== "undefined" ? getOperatorFromStorage() : null;
    const eventIdsRaw = getEventIds(operator);
    const eventIds = Array.isArray(eventIdsRaw)
        ? eventIdsRaw.flatMap((id) =>
            typeof id === "string" && id.includes(",")
                ? id
                    .split(",")
                    .map((item) => item.trim())
                    .filter((item) => !!item)
                : [id]
        )
        : [];
    useEffect(() => {
        carregarEventos();
        if (operator) {
            setOperadorInfo({ nome: operator.nome, cpf: operator.cpf });
        } else {
            setOperadorInfo(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const carregarEventos = async () => {
        setLoading(true);
        setError("");
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            const apiToken = process.env.NEXT_PUBLIC_API_TOKEN;
            if (!apiUrl || !apiToken) {
                throw new Error("Configuração da API não encontrada");
            }
            const response = await axios.get(apiUrl, {
                headers: { "xc-token": apiToken },
            });

            const allEventos: EventApi[] = response.data.list || [];
            console.log(allEventos)
            setEventos(allEventos.filter((evento) => eventIds.includes(evento.id_evento)));
        } catch (err) {
            console.error("Erro ao buscar eventos:", err);
            setError("Erro ao carregar eventos. Verifique sua conexão e tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    const acessarEvento = (evento: EventApi) => {
        if (operadorInfo) {
            localStorage.setItem("id_tabela", evento.id_tabela);
            localStorage.setItem("nome_evento", evento.nome_evento);
            router.push("/operador/painel");
        } else {
            setEventoSelecionado(evento);
            setShowModal(true);
        }
    };

    const fecharModal = () => {
        setShowModal(false);
        setEventoSelecionado(null);
    };

    const sair = () => {
        localStorage.removeItem("operador");
        window.location.reload();
    };

    return (
        <div className="min-h-screen bg-[#ffe7fe] text-[#610e5c] font-fira p-4 text-center flex flex-col justify-between">
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-2">
                {operadorInfo ? (
                    <div className="text-sm text-black bg-fuchsia-900 rounded px-4 py-2 font-semibold">
                        Logado como: {operadorInfo.nome} | CPF: {operadorInfo.cpf}
                    </div>
                ) : (
                    <div className="text-sm text-red-700 bg-red-500 rounded px-4 py-2 font-semibold">
                        Você precisa estar logado como operador para acessar os eventos.
                    </div>
                )}
                {operadorInfo && (
                    <button onClick={sair} className="bg-fuchsia-900 text-white px-4 py-2 rounded font-semibold">Deslogar</button>
                )}
            </div>
            <div>
                <Image src="/images/logo-rg-fone.png" alt="Logo RG" className="mx-auto mb-4 w-40" width={160} height={160} />
                <div className=" flex justify-center items-center">
                    <h1 className="text-3xl md:text-4xl font-bold mb-2 p-4 bg-fuchsia-900 opacity-90 rounded-2xl">
                        Credenciamento RG Produções e Eventos
                    </h1>
                </div>
                {operadorInfo && (
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                        {loading ? (
                            <div className="col-span-full text-center">Carregando eventos...</div>
                        ) : error ? (
                            <div className="col-span-full text-center text-red-600">{error}</div>
                        ) : eventos.length === 0 ? (
                            <div className="col-span-full text-center">Nenhum evento encontrado para este operador.</div>
                        ) : (
                            eventos.map((evento) => (
                                <div key={evento.Id} className="bg-purple-300 text-black shadow-md p-4 rounded-lg">
                                    <Image src={evento.capa || "/images/logo-rg-fone.png"} alt={evento.nome_evento} className="w-full rounded-md mb-3" width={160} height={160} />
                                    <h2 className="text-xl font-bold mb-2">{evento.nome_evento}</h2>
                                    {evento.data && (
                                        <div className="flex items-center justify-center gap-2 mb-3 text-gray-600">
                                            <svg
                                                className="w-4 h-4"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                                xmlns="http://www.w3.org/2000/svg"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                            <span className="text-sm">{formatDate(evento.data)}</span>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => acessarEvento(evento)}
                                        className="mt-3 bg-[#610e5c] text-white px-6 py-3 text-lg rounded-lg"
                                    >
                                        Acessar
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Modal só aparece se não estiver logado */}
            {!operadorInfo && showModal && eventoSelecionado && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                    <div className="bg-zinc-950 p-6 rounded-lg w-full max-w-sm text-left text-black">
                        <h2 className="text-xl font-semibold mb-4">Digite a senha para acessar o evento</h2>
                        {/* Campo de senha oculto, preenchido automaticamente */}
                        <input
                            type="password"
                            value={eventoSelecionado.senha_acesso}
                            readOnly
                            className="w-full border border-gray-300 rounded px-4 py-2 mb-4 opacity-50 cursor-not-allowed"
                            style={{ pointerEvents: 'none' }}
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={fecharModal}
                                className="bg-gray-600 px-4 py-2 rounded text-black"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    // Preenche automaticamente a senha e acessa direto
                                    localStorage.setItem("id_tabela", eventoSelecionado.id_tabela);
                                    localStorage.setItem("nome_evento", eventoSelecionado.nome_evento);
                                    router.push("/operador/painel");
                                }}
                                className="bg-[#610e5c] text-white px-4 py-2 rounded"
                            >
                                Entrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <footer className="text-center pt-[60px] pb-[25px]">
                <Image
                    src="/images/slogan-rg.png"
                    alt="Se tem RG, é sucesso!"
                    className="mx-auto max-w-xs"
                    width={200}
                    height={100}
                />
            </footer>
        </div>
    );
};

export default OperadorEventosPage;