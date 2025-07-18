import { useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const OperatorRealtimeSync = () => {
    useEffect(() => {
        const operadorRaw = localStorage.getItem("operador");
        if (!operadorRaw) return;
        let operadorAtual: Record<string, unknown> | null = null;
        try {
            operadorAtual = JSON.parse(operadorRaw);
        } catch {
            operadorAtual = null;
        }
        let operadorId = "";
        if (operadorAtual && typeof operadorAtual === "object" && "id" in operadorAtual) {
            operadorId = String((operadorAtual as { id?: unknown }).id ?? "");
        }
        if (!operadorId) return;

        const channel = supabase
            .channel("realtime:operadores")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "operadores" },
                (payload) => {
                    if (
                        payload.new &&
                        typeof payload.new === "object" &&
                        "id" in payload.new &&
                        String((payload.new as { id?: unknown }).id) === operadorId
                    ) {
                        let acoesAntigas = [];
                        const operadorRaw = localStorage.getItem("operador");
                        if (operadorRaw) {
                            try {
                                const operadorAntigo = JSON.parse(operadorRaw);
                                if (Array.isArray(operadorAntigo.acoes)) {
                                    acoesAntigas = operadorAntigo.acoes;
                                }
                            } catch { }
                        }
                        const operadorParaSalvar = { ...payload.new };
                        if (!Array.isArray(payload.new.acoes) && acoesAntigas.length > 0) {
                            operadorParaSalvar.acoes = acoesAntigas;
                        }
                        localStorage.setItem("operador", JSON.stringify(operadorParaSalvar));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return null;
};

export default OperatorRealtimeSync; 