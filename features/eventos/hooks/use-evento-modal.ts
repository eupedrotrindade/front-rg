import { create } from "zustand";

interface EventoModalState {
  open: boolean;
  eventoSelecionado: Event | null;
  abrir: (evento?: Event | null) => void;
  fechar: () => void;
}

export const useEventoModal = create<EventoModalState>((set) => ({
  open: false,
  eventoSelecionado: null,
  abrir: (evento = null) => set({ open: true, eventoSelecionado: evento }),
  fechar: () => set({ open: false, eventoSelecionado: null }),
}));
