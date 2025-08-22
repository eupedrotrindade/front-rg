import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Car } from "lucide-react";
import { EventVehicle } from "@/features/eventos/actions/create-event-vehicle";

interface ModalHistoricoVeiculoProps {
  isOpen: boolean;
  onClose: () => void;
  veiculo: EventVehicle | null;
}

export default function ModalHistoricoVeiculo({ isOpen, onClose, veiculo }: ModalHistoricoVeiculoProps) {
  if (!veiculo) return null;

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'retirada':
        return <Badge className="bg-green-100 text-green-800">Retirada</Badge>;
      case 'pendente':
        return <Badge className="bg-red-100 text-red-800">Pendente</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white text-gray-800 max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Histórico do Veículo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Veículo */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3">Informações do Veículo</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-600">Empresa:</span>
                <p className="font-medium">{veiculo.empresa || '-'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Modelo:</span>
                <p className="font-medium">{veiculo.modelo || '-'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Placa:</span>
                <p className="font-medium">{veiculo.placa || '-'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Tipo de Credencial:</span>
                <p className="font-medium">{veiculo.tipo_de_credencial || '-'}</p>
              </div>
            </div>
          </div>

          {/* Status Atual */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3">Status Atual</h3>
            <div className="flex items-center gap-2">
              {getStatusBadge(veiculo.retirada)}
              <span className="text-sm text-gray-600">
                {veiculo.retirada === 'retirada' ? 'Veículo já foi retirado' : 'Aguardando retirada'}
              </span>
            </div>
          </div>

          {/* Histórico de Eventos */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3">Histórico de Eventos</h3>
            <div className="space-y-3">
              {/* Criação */}
              <div className="flex items-start gap-3 p-3 bg-white rounded border">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">Veículo Registrado</span>
                    <Badge variant="outline" className="text-xs">Criação</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Veículo registrado no sistema para o dia {new Date(veiculo.dia + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDateTime(veiculo.created_at)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Última Atualização */}
              {veiculo.updated_at !== veiculo.created_at && (
                <div className="flex items-start gap-3 p-3 bg-white rounded border">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Clock className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">Status Atualizado</span>
                      <Badge variant="outline" className="text-xs">Atualização</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Status alterado para {veiculo.retirada === 'retirada' ? 'retirada' : 'pendente'}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateTime(veiculo.updated_at)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Retirada (se aplicável) */}
              {veiculo.retirada === 'retirada' && (
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded border border-green-200">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Car className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-green-900">Veículo Retirado</span>
                      <Badge className="bg-green-100 text-green-800 text-xs">Retirada</Badge>
                    </div>
                    <p className="text-sm text-green-700 mb-2">
                      Veículo foi retirado com sucesso
                    </p>
                    <div className="flex items-center gap-4 text-xs text-green-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateTime(veiculo.updated_at)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Informações do Dia */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3">Informações do Dia</h3>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                Dia do evento: {new Date(veiculo.dia + 'T00:00:00').toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 