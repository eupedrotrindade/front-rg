import { useEffect, useRef, useState } from "react";

export type OperatorStorage = {
  id: string;
  nome: string;
  cpf: string;
} & Record<string, unknown>;

/**
 * Hook para monitorar o operador salvo no localStorage e detectar mudanças em tempo real.
 * @param onChange Callback chamado quando os dados mudam
 * @returns O operador atual do localStorage (ou null)
 */
const useOperatorStorage = (
  onChange?: (operator: OperatorStorage | null) => void
) => {
  const [operator, setOperator] = useState<OperatorStorage | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("operador");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });

  const lastRaw = useRef<string | null>(null);

  useEffect(() => {
    const checkOperator = () => {
      const raw = localStorage.getItem("operador");
      if (raw !== lastRaw.current) {
        lastRaw.current = raw;
        let parsed: OperatorStorage | null = null;
        if (raw) {
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = null;
          }
        }
        setOperator(parsed);
        if (onChange) onChange(parsed);
      }
    };

    // Verificar mudanças a cada 2 segundos
    const interval = setInterval(checkOperator, 2000);

    // Listeners para eventos customizados de tempo real
    const handleEventosUpdated = () => {
      console.log("🔄 Eventos atualizados via tempo real");
      // Forçar revalidação dos dados de eventos
      window.location.reload();
    };

    const handleParticipantesUpdated = () => {
      console.log("🔄 Participantes atualizados via tempo real");
      // Forçar revalidação dos dados de participantes
      window.location.reload();
    };

    const handlePulseirasUpdated = () => {
      console.log("🔄 Pulseiras atualizadas via tempo real");
      // Forçar revalidação dos dados de pulseiras
      window.location.reload();
    };

    const handleStaffUpdated = () => {
      console.log("🔄 Staff atualizado via tempo real");
      // Forçar revalidação dos dados de staff
      window.location.reload();
    };

    const handleVeiculosUpdated = () => {
      console.log("🔄 Veículos atualizados via tempo real");
      // Forçar revalidação dos dados de veículos
      window.location.reload();
    };

    // Adicionar listeners
    window.addEventListener("eventos-updated", handleEventosUpdated);
    window.addEventListener(
      "participantes-updated",
      handleParticipantesUpdated
    );
    window.addEventListener("pulseiras-updated", handlePulseirasUpdated);
    window.addEventListener("staff-updated", handleStaffUpdated);
    window.addEventListener("veiculos-updated", handleVeiculosUpdated);

    return () => {
      clearInterval(interval);
      window.removeEventListener("eventos-updated", handleEventosUpdated);
      window.removeEventListener(
        "participantes-updated",
        handleParticipantesUpdated
      );
      window.removeEventListener("pulseiras-updated", handlePulseirasUpdated);
      window.removeEventListener("staff-updated", handleStaffUpdated);
      window.removeEventListener("veiculos-updated", handleVeiculosUpdated);
    };
  }, [onChange]);

  return operator;
};

export default useOperatorStorage;
