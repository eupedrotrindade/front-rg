/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState } from "react"

import { Plus, Search, Download, Upload } from "lucide-react"

import VeiculoItem from "@/components/operador/veiculoItem"
import ModalNovoVeiculo from "@/components/operador/modalNovoVeiculo"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"

import { toast } from "sonner"
import EventLayout from "@/components/dashboard/dashboard-layout"
import { useParams } from "next/navigation"
import { useEventVehiclesByEvent } from "@/features/eventos/api/query/use-event-vehicles-by-event"
import { useCreateEventVehicle, useUpdateEventVehicle, useDeleteEventVehicle } from "@/features/eventos/api/mutation"
import { EventVehicle } from "@/features/eventos/actions/create-event-vehicle"
import { useEventos } from "@/features/eventos/api/query"

export default function Estacionamento() {
    const params = useParams()
    const eventId = String(params.id)
    const { data: eventos = [] } = useEventos()
    const evento = Array.isArray(eventos) ? eventos.find(e => e.id === eventId) : null


    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingVeiculo, setEditingVeiculo] = useState<EventVehicle | null>(null)
    const [isEditing, setIsEditing] = useState(false)

    // Estados para filtros
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [empresaFilter, setEmpresaFilter] = useState<string>("all")

    // Hooks da API
    const { data: veiculos = [], isLoading, error } = useEventVehiclesByEvent({
        eventId,
        search: searchTerm,
        statusFilter: statusFilter as "all" | "retirada" | "pendente",
        empresaFilter: empresaFilter
    })
    const createVehicleMutation = useCreateEventVehicle()
    const updateVehicleMutation = useUpdateEventVehicle()
    const deleteVehicleMutation = useDeleteEventVehicle()



    // Obter empresas únicas para o filtro
    const empresas = Array.from(new Set(veiculos.map(v => v.empresa).filter(Boolean)))

    const handleOpenModal = (veiculo?: EventVehicle) => {
        if (veiculo) {
            setEditingVeiculo(veiculo)
            setIsEditing(true)
        } else {
            setEditingVeiculo(null)
            setIsEditing(false)
        }
        setIsModalOpen(true)
    }


    const handleDeleteVeiculo = async (id: string) => {
        if (confirm("Tem certeza que deseja excluir este veículo?")) {
            try {
                await deleteVehicleMutation.mutateAsync(id)
            } catch (error) {
                // Erro já tratado pelos hooks
            }
        }
    }

    const handleEditVeiculo = (veiculo: EventVehicle) => {
        handleOpenModal(veiculo)
    }

    const exportToExcel = () => {
        // Implementar exportação para Excel
        toast.info("Funcionalidade de exportação será implementada")
    }

    const importFromExcel = () => {
        // Implementar importação do Excel
        toast.info("Funcionalidade de importação será implementada")
    }
    if (!evento) {
        return <div>Evento não encontrado</div>
    }

    return (
        <EventLayout eventId={String(params.id)} eventName={evento.name}>
            <div className="bg-transparent min-h-screen">


                {/* Header com ações */}
                <div className="w-full bg-transparent py-2 px-2 mt-4">
                    <div className="max-w-7xl mx-auto bg-white rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-4 md:px-6 py-4 md:py-6 shadow">
                        <div className="flex justify-between items-center md:flex-row gap-2 md:gap-4 w-full md:w-auto">
                            <Button
                                onClick={() => handleOpenModal()}
                                className="cursor-pointer bg-[#6f0a5e] hover:bg-[#58084b] text-white font-semibold px-6 py-2 rounded-lg shadow transition-all"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Nova Retirada
                            </Button>

                            <div className="flex items-center gap-3">
                                <Button
                                    onClick={exportToExcel}
                                    className="cursor-pointer bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform border-0"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Exportar
                                </Button>
                                <Button
                                    onClick={importFromExcel}
                                    className="cursor-pointer bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform border-0"
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    Importar
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filtros */}
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
                    <div className="bg-white rounded-lg shadow p-4 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Busca */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[#6f0a5e]">Buscar</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6f0a5e] w-4 h-4" />
                                    <input
                                        placeholder="Empresa, placa, modelo..."
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="border-2 p-2 text-black rounded-sm bg-white pl-10 border-[#6f0a5e]/20 focus:border-[#6f0a5e] focus:ring-[#6f0a5e]/20"
                                    />
                                </div>
                            </div>

                            {/* Filtro por Status */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[#6f0a5e]">Status</label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full p-2 border-2 border-[#6f0a5e]/20 focus:border-[#6f0a5e] focus:ring-[#6f0a5e]/20 rounded-sm bg-white text-black"
                                >
                                    <option value="all">Todos os status</option>
                                    <option value="retirada">Retirada</option>
                                    <option value="pendente">Pendente</option>
                                </select>
                            </div>

                            {/* Filtro por Empresa */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[#6f0a5e]">Empresa</label>
                                <select
                                    value={empresaFilter}
                                    onChange={(e) => setEmpresaFilter(e.target.value)}
                                    className="w-full p-2 border-2 border-[#6f0a5e]/20 focus:border-[#6f0a5e] focus:ring-[#6f0a5e]/20 rounded-sm bg-white text-black"
                                >
                                    <option value="all">Todas as empresas</option>
                                    {empresas.map(empresa => (
                                        <option key={empresa} value={empresa}>
                                            {empresa}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Contador */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[#6f0a5e]">Total</label>
                                <div className="text-3xl font-bold text-[#6f0a5e] bg-[#6f0a5e]/10 rounded-lg p-3 text-center border border-[#6f0a5e]/20">
                                    {veiculos.length}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabela */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-[#6f0a5e]">
                                    <TableHead className="font-semibold text-white">Empresa</TableHead>
                                    <TableHead className="font-semibold text-white">Placa</TableHead>
                                    <TableHead className="font-semibold text-white">Modelo</TableHead>
                                    <TableHead className="font-semibold text-white">Credencial</TableHead>
                                    <TableHead className="font-semibold text-white">Status</TableHead>
                                    <TableHead className="font-semibold text-white">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                            Carregando veículos...
                                        </TableCell>
                                    </TableRow>
                                ) : error ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-red-500">
                                            Erro ao carregar veículos: {error instanceof Error ? error.message : 'Erro desconhecido'}
                                        </TableCell>
                                    </TableRow>
                                ) : veiculos.length > 0 ? (
                                    veiculos.map((veiculo) => (
                                        <VeiculoItem
                                            key={String(veiculo.id)}
                                            veiculo={veiculo}
                                            onEdit={handleEditVeiculo}
                                            onDelete={handleDeleteVeiculo}
                                        />
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                            Nenhum veículo encontrado
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* Modal */}
                <ModalNovoVeiculo
                    isOpen={isModalOpen}

                    veiculo={editingVeiculo}
                    isEditing={isEditing}
                />
            </div>
        </EventLayout>
    )
}