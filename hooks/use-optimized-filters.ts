/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState, useCallback, useDeferredValue } from "react";
import { EventParticipant } from "@/features/eventos/types";

interface UseOptimizedFiltersProps {
  participants: EventParticipant[];
  currentSelectedDay: string;
  hasCheckIn: (participantId: string, date: string) => boolean;
  hasCheckOut: (participantId: string, date: string) => boolean;
  credentialsArray: any[];
}

interface FilterState {
  searchTerm: string;
  empresa: string;
  funcao: string;
  checkedIn: string;
}

interface DayStats {
  empresas: Map<
    string,
    {
      total: number;
      checkedIn: number;
      checkedOut: number;
      credentials: Map<string, number>;
    }
  >;
  funcoes: Map<
    string,
    { total: number; checkedIn: number; checkedOut: number }
  >;
  statusCounts: { checkedIn: number; checkedOut: number; notCheckedIn: number };
  credentialsStats: Map<
    string,
    { total: number; checkedIn: number; name: string; color: string }
  >;
}

export const useOptimizedFilters = ({
  participants,
  currentSelectedDay,
  hasCheckIn,
  hasCheckOut,
  credentialsArray,
}: UseOptimizedFiltersProps) => {
  // Estados dos filtros
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: "",
    empresa: "all",
    funcao: "all",
    checkedIn: "all",
  });

  // Estados para controle dos popovers
  const [popoverStates, setPopoverStates] = useState({
    empresa: false,
    funcao: false,
    status: false,
  });

  // Usar useDeferredValue para debounce automático do React 18
  const deferredSearchTerm = useDeferredValue(filters.searchTerm);
  const deferredFilters = useDeferredValue(filters);

  // Cálculo das estatísticas do dia (memoizado com dependências otimizadas)
  const dayStats = useMemo((): DayStats => {
    if (!participants.length || !currentSelectedDay) {
      return {
        empresas: new Map(),
        funcoes: new Map(),
        statusCounts: { checkedIn: 0, checkedOut: 0, notCheckedIn: 0 },
        credentialsStats: new Map(),
      };
    }

    const empresas = new Map<
      string,
      {
        total: number;
        checkedIn: number;
        checkedOut: number;
        credentials: Map<string, number>;
      }
    >();
    const funcoes = new Map<
      string,
      { total: number; checkedIn: number; checkedOut: number }
    >();
    const credentialsStats = new Map<
      string,
      { total: number; checkedIn: number; name: string; color: string }
    >();
    let totalCheckedIn = 0,
      totalCheckedOut = 0,
      totalNotCheckedIn = 0;

    // Processar apenas uma vez todos os participantes
    participants.forEach((participant) => {
      const hasCheckInStatus = hasCheckIn(participant.id, currentSelectedDay);
      const hasCheckOutStatus = hasCheckOut(participant.id, currentSelectedDay);

      // Atualizar contadores globais
      if (hasCheckInStatus && !hasCheckOutStatus) totalCheckedIn++;
      else if (hasCheckOutStatus) totalCheckedOut++;
      else totalNotCheckedIn++;

      // Processar empresa
      if (participant.company) {
        if (!empresas.has(participant.company)) {
          empresas.set(participant.company, {
            total: 0,
            checkedIn: 0,
            checkedOut: 0,
            credentials: new Map(),
          });
        }
        const empresaData = empresas.get(participant.company)!;
        empresaData.total++;

        if (hasCheckInStatus && !hasCheckOutStatus) empresaData.checkedIn++;
        if (hasCheckOutStatus) empresaData.checkedOut++;

        const credentialId = participant.credentialId || "no-credential";
        empresaData.credentials.set(
          credentialId,
          (empresaData.credentials.get(credentialId) || 0) + 1
        );
      }

      // Processar função
      if (participant.role) {
        if (!funcoes.has(participant.role)) {
          funcoes.set(participant.role, {
            total: 0,
            checkedIn: 0,
            checkedOut: 0,
          });
        }
        const funcaoData = funcoes.get(participant.role)!;
        funcaoData.total++;

        if (hasCheckInStatus && !hasCheckOutStatus) funcaoData.checkedIn++;
        if (hasCheckOutStatus) funcaoData.checkedOut++;
      }

      // Processar credencial
      const credentialId = participant.credentialId || "no-credential";
      const credential = credentialsArray.find(
        (c) => c.id === participant.credentialId
      );
      const credentialName = credential?.nome || "SEM CREDENCIAL";
      const credentialColor = credential?.cor || "#6B7280";

      if (!credentialsStats.has(credentialId)) {
        credentialsStats.set(credentialId, {
          total: 0,
          checkedIn: 0,
          name: credentialName,
          color: credentialColor,
        });
      }
      const credentialData = credentialsStats.get(credentialId)!;
      credentialData.total++;
      if (hasCheckInStatus) credentialData.checkedIn++;
    });

    return {
      empresas,
      funcoes,
      statusCounts: {
        checkedIn: totalCheckedIn,
        checkedOut: totalCheckedOut,
        notCheckedIn: totalNotCheckedIn,
      },
      credentialsStats,
    };
  }, [
    participants,
    currentSelectedDay,
    hasCheckIn,
    hasCheckOut,
    credentialsArray,
  ]);

  // Listas únicas otimizadas
  const uniqueEmpresas = useMemo(() => {
    return Array.from(dayStats.empresas.keys()).sort();
  }, [dayStats.empresas]);

  const uniqueFuncoes = useMemo(() => {
    return Array.from(dayStats.funcoes.keys()).sort();
  }, [dayStats.funcoes]);

  // Participantes filtrados (usando deferred values para melhor performance)
  const filteredParticipants = useMemo(() => {
    let filtered = participants;

    // Aplicar filtro de busca
    if (deferredSearchTerm.trim()) {
      const searchLower = deferredSearchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.cpf?.includes(deferredSearchTerm) ||
          p.company?.toLowerCase().includes(searchLower) ||
          p.role?.toLowerCase().includes(searchLower)
      );
    }

    // Aplicar filtro de empresa
    if (deferredFilters.empresa && deferredFilters.empresa !== "all") {
      filtered = filtered.filter((p) => p.company === deferredFilters.empresa);
    }

    // Aplicar filtro de função
    if (deferredFilters.funcao && deferredFilters.funcao !== "all") {
      filtered = filtered.filter((p) => p.role === deferredFilters.funcao);
    }

    // Aplicar filtro de status de check-in
    if (deferredFilters.checkedIn && deferredFilters.checkedIn !== "all") {
      if (deferredFilters.checkedIn === "checked-in") {
        filtered = filtered.filter(
          (p) =>
            hasCheckIn(p.id, currentSelectedDay) &&
            !hasCheckOut(p.id, currentSelectedDay)
        );
      } else if (deferredFilters.checkedIn === "checked-out") {
        filtered = filtered.filter((p) =>
          hasCheckOut(p.id, currentSelectedDay)
        );
      } else if (deferredFilters.checkedIn === "not-checked-in") {
        filtered = filtered.filter(
          (p) => !hasCheckIn(p.id, currentSelectedDay)
        );
      }
    }

    return filtered;
  }, [
    participants,
    deferredSearchTerm,
    deferredFilters,
    hasCheckIn,
    hasCheckOut,
    currentSelectedDay,
  ]);

  // Funções otimizadas para atualização de filtros
  const updateFilter = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      searchTerm: "",
      empresa: "all",
      funcao: "all",
      checkedIn: "all",
    });
  }, []);

  const setPopoverState = useCallback(
    (popover: string, isOpen: boolean) => {
      setPopoverStates((prev) => ({ ...prev, [popover]: isOpen }));
    },
    []
  );

  // Verificar se algum filtro está ativo
  const hasActiveFilters = useMemo(() => {
    return Boolean(
      filters.searchTerm ||
        (filters.empresa && filters.empresa !== "all") ||
        (filters.funcao && filters.funcao !== "all") ||
        (filters.checkedIn && filters.checkedIn !== "all")
    );
  }, [filters]);

  return {
    // Estados
    filters,
    popoverStates,

    // Dados computados
    dayStats,
    uniqueEmpresas,
    uniqueFuncoes,
    filteredParticipants,
    hasActiveFilters,

    // Ações
    updateFilter,
    clearFilters,
    setPopoverState,

    // Flags de loading baseadas nos deferred values
    isFilteringInProgress:
      deferredSearchTerm !== filters.searchTerm ||
      deferredFilters.empresa !== filters.empresa ||
      deferredFilters.funcao !== filters.funcao ||
      deferredFilters.checkedIn !== filters.checkedIn,
  };
};
