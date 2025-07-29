/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, useEffect } from "react";
import { Operator } from "@/features/operadores/types";
import Image from "next/image";
import { Event } from "@/features/eventos/types";

import Link from "next/link";
import { useEventos } from "@/features/eventos/api/query/use-eventos";

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

const OperadorEventosPage = () => {

    const [showModal, setShowModal] = useState(false);
    const [eventoSelecionado, setEventoSelecionado] = useState<Event | null>(null);

    const [error, setError] = useState("");
    const [operadorInfo, setOperadorInfo] = useState<{ nome: string; cpf: string } | null>(null);
    const { data: eventos, isLoading: eventosLoading } = useEventos();
    // Garantir que todos os dados são arrays
    const eventosArray = Array.isArray(eventos) ? eventos : [];
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
    // Filtrar eventos do operador
    const eventosOperador = eventosArray.filter(
        (evento) => eventIds.includes(String(evento.id))
    );
    useEffect(() => {
        // carregarEventos();
        if (operator) {
            setOperadorInfo({ nome: operator.nome, cpf: operator.cpf });
        } else {
            setOperadorInfo(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    // const carregarEventos = async () => {
    //     setLoading(true);
    //     setError("");
    //     try {

    //          console.log("TODOS OS EVENTOSSS AQUII", eventos);
    //         setEventos(eventos ?? []);
    //     } catch (err) {
    //         console.error("Erro ao buscar eventos do backend:", err);
    //         setError("Erro ao carregar eventos. Verifique sua conexão e tente novamente.");
    //     } finally {
    //         setLoading(false);
    //     }
    // };





    const sair = () => {
        localStorage.removeItem("operador");
        window.location.reload();
    };
    console.log("EVENTO TOTAIS" + eventos);
    return (
        <div className="min-h-screen bg-[#ffe7fe] text-[#fff] font-fira p-4 text-center flex flex-col justify-between">
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-2">
                {operadorInfo ? (
                    <div className="text-sm text-white bg-fuchsia-900 rounded px-4 py-2 font-semibold">
                        Logado como: {operadorInfo.nome} | CPF: {operadorInfo.cpf}
                    </div>
                ) : (
                    <div className="text-sm text-white bg-red-500 rounded px-4 py-2 font-semibold">
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
                        {eventosLoading ? (
                            <div className="col-span-full text-center">Carregando eventos...</div>
                        ) : error ? (
                            <div className="col-span-full text-center text-red-600">{error}</div>
                        ) : eventosOperador.length === 0 ? (
                            <div className="col-span-full text-center">Nenhum evento encontrado para este operador.</div>
                        ) : (
                            eventosOperador.map((evento) => (
                                <div key={evento.id} className="bg-purple-300 text-black shadow-md p-4 rounded-lg">
                                    <Image src={evento.bannerUrl || "/images/logo-rg-fone.png"} alt={evento.name} className="w-full rounded-md mb-3" width={160} height={160} />
                                    <h2 className="text-xl font-bold mb-2">{evento.name}</h2>
                                    {evento.id && (
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
                                            <span className="text-sm">{formatDate(evento.startDate)}</span>
                                        </div>
                                    )}
                                    <Link href={`/painel/${evento.id}`}>
                                        <button
                                            className="mt-3 bg-[#610e5c] text-white px-6 py-3 text-lg rounded-lg"
                                        >
                                            Acessar
                                        </button></Link>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Modal só aparece se não estiver logado */}
            {!operadorInfo && showModal && eventoSelecionado && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">

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