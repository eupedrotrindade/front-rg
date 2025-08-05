import type { Retirada as RetiradaType } from "@/app/operador/radios/types";

interface HistoricoPopupProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  retirada: RetiradaType;
}

export default function HistoricoPopup({ isOpen, setIsOpen, retirada }: HistoricoPopupProps) {
  if (!isOpen || !retirada) return null;

  // Montar histórico de ações
  const historico: { tipo: string; descricao: string; data: string }[] = [];
  // Trocas
  if (retirada.trocas && retirada.trocas.length > 0) {
    retirada.trocas.forEach((t, idx) => {
      historico.push({
        tipo: "troca",
        descricao: `Trocado rádio ${t.antigo} por ${t.novo}`,
        data: retirada.retirada // usa a data da retirada como referência
      });
    });
  }
  // Devoluções parciais
  if (retirada.devolvidos && retirada.devolvidos.length > 0) {
    retirada.devolvidos.forEach((d, idx) => {
      historico.push({
        tipo: "devolucao_parcial",
        descricao: `Devolvido rádio ${d}`,
        data: retirada.devolucao || "-"
      });
    });
  }
  // Devolução total
  if (retirada.status && retirada.devolucao) {
    historico.push({
      tipo: "devolucao_total",
      descricao: `Devolução total`,
      data: retirada.devolucao
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg p-6 max-w-xs w-full relative">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
          onClick={() => setIsOpen(false)}
        >
          &times;
        </button>
        <h3 className="text-lg font-bold mb-2 text-[#6f0a5e]">Histórico de Ações</h3>
        {historico.length === 0 && <div className="text-gray-500">Nenhuma ação registrada.</div>}
        <ul className="text-sm space-y-2">
          {historico.map((h, idx) => (
            <li key={idx}>
              <span className="font-semibold">{h.descricao}</span>
              <br />
              <span className="text-gray-500">{h.data}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 