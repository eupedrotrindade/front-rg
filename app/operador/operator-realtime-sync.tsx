/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const OperatorRealtimeSync = () => {
    const channelsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        const operadorRaw = localStorage.getItem("operador");
        if (!operadorRaw) {
            console.log("🔍 Operador não encontrado no localStorage");
            return;
        }

        let operadorAtual: Record<string, unknown> | null = null;
        try {
            operadorAtual = JSON.parse(operadorRaw);
        } catch (error) {
            console.error("❌ Erro ao parsear operador:", error);
            operadorAtual = null;
        }

        let operadorId = "";
        if (operadorAtual && typeof operadorAtual === "object" && "id" in operadorAtual) {
            operadorId = String((operadorAtual as { id?: unknown }).id ?? "");
        }

        if (!operadorId) {
            console.log("🔍 ID do operador não encontrado");
            return;
        }

        console.log("🚀 Iniciando sincronização em tempo real para operador:", operadorId);

        // Função para salvar operador com ações antigas
        const salvarOperadorComAcoes = (novoOperador: Record<string, unknown>) => {
            let acoesAntigas: unknown[] = [];
            const operadorRaw = localStorage.getItem("operador");
            if (operadorRaw) {
                try {
                    const operadorAntigo = JSON.parse(operadorRaw);
                    if (Array.isArray(operadorAntigo.acoes)) {
                        acoesAntigas = operadorAntigo.acoes;
                    }
                } catch (error) {
                    console.error("❌ Erro ao parsear ações antigas:", error);
                }
            }

            const operadorParaSalvar = { ...novoOperador };
            if (!Array.isArray(novoOperador.acoes) && acoesAntigas.length > 0) {
                operadorParaSalvar.acoes = acoesAntigas;
            }
            localStorage.setItem("operador", JSON.stringify(operadorParaSalvar));
            console.log("✅ Operador atualizado no localStorage");
        };

        // Canal para operadores
        const operadoresChannel = supabase
            .channel("realtime:operadores")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "operadores" },
                (payload) => {
                    console.log("📡 Mudança detectada em operadores:", payload.eventType);
                    if (
                        payload.new &&
                        typeof payload.new === "object" &&
                        "id" in payload.new &&
                        String((payload.new as { id?: unknown }).id) === operadorId
                    ) {
                        console.log("✅ Atualizando operador local");
                        salvarOperadorComAcoes(payload.new);
                    }
                }
            )
            .subscribe((status) => {
                console.log("📡 Status do canal operadores:", status);
                if (status === "SUBSCRIBED") {
                    channelsRef.current.add("operadores");
                }
            });

        // Canal para eventos
        const eventosChannel = supabase
            .channel("realtime:eventos")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "events" },
                (payload) => {
                    console.log("📡 Mudança detectada em eventos:", payload.eventType);
                    // Forçar revalidação dos dados de eventos
                    window.dispatchEvent(new CustomEvent("eventos-updated", { detail: payload }));
                }
            )
            .subscribe((status) => {
                console.log("📡 Status do canal eventos:", status);
                if (status === "SUBSCRIBED") {
                    channelsRef.current.add("eventos");
                }
            });

        // Canal para participantes de eventos
        const participantesChannel = supabase
            .channel("realtime:participantes")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "event_participants" },
                (payload) => {
                    console.log("📡 Mudança detectada em participantes:", payload.eventType);
                    // Forçar revalidação dos dados de participantes
                    window.dispatchEvent(new CustomEvent("participantes-updated", { detail: payload }));
                }
            )
            .subscribe((status) => {
                console.log("📡 Status do canal participantes:", status);
                if (status === "SUBSCRIBED") {
                    channelsRef.current.add("participantes");
                }
            });

        // Canal para pulseiras de eventos
        const pulseirasChannel = supabase
            .channel("realtime:pulseiras")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "event_wristbands" },
                (payload) => {
                    console.log("📡 Mudança detectada em pulseiras:", payload.eventType);
                    // Forçar revalidação dos dados de pulseiras
                    window.dispatchEvent(new CustomEvent("pulseiras-updated", { detail: payload }));
                }
            )
            .subscribe((status) => {
                console.log("📡 Status do canal pulseiras:", status);
                if (status === "SUBSCRIBED") {
                    channelsRef.current.add("pulseiras");
                }
            });

        // Canal para staff de eventos
        const staffChannel = supabase
            .channel("realtime:staff")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "event_staff" },
                (payload) => {
                    console.log("📡 Mudança detectada em staff:", payload.eventType);
                    // Forçar revalidação dos dados de staff
                    window.dispatchEvent(new CustomEvent("staff-updated", { detail: payload }));
                }
            )
            .subscribe((status) => {
                console.log("📡 Status do canal staff:", status);
                if (status === "SUBSCRIBED") {
                    channelsRef.current.add("staff");
                }
            });

        // Canal para veículos de eventos
        const veiculosChannel = supabase
            .channel("realtime:veiculos")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "event_vehicles" },
                (payload) => {
                    console.log("📡 Mudança detectada em veículos:", payload.eventType);
                    // Forçar revalidação dos dados de veículos
                    window.dispatchEvent(new CustomEvent("veiculos-updated", { detail: payload }));
                }
            )
            .subscribe((status) => {
                console.log("📡 Status do canal veículos:", status);
                if (status === "SUBSCRIBED") {
                    channelsRef.current.add("veiculos");
                }
            });

        // Cleanup function
        return () => {
            console.log("🧹 Limpando canais de tempo real");
            channelsRef.current.clear();

            supabase.removeChannel(operadoresChannel);
            supabase.removeChannel(eventosChannel);
            supabase.removeChannel(participantesChannel);
            supabase.removeChannel(pulseirasChannel);
            supabase.removeChannel(staffChannel);
            supabase.removeChannel(veiculosChannel);
        };
    }, []);

    return null;
};

export default OperatorRealtimeSync; 