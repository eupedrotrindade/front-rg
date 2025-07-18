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
    const interval = setInterval(checkOperator, 2000);
    return () => clearInterval(interval);
  }, [onChange]);

  return operator;
};

export default useOperatorStorage;
