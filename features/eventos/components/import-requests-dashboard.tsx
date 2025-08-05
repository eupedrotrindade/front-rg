import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
    FileText,
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
    Download,
    Eye,
    Check,
    X,
    Users,
    Building,
    Calendar
} from 'lucide-react'
import { useAllImportRequests } from '../api/query/use-import-requests'
import { useApproveImportRequest } from '../api/mutation/use-approve-import-request'
import { useRejectImportRequest } from '../api/mutation/use-reject-import-request'
import type { ImportRequest } from '../types'
import { toast } from 'sonner'

const ImportRequestsDashboard = () => {
    const [selectedRequest, setSelectedRequest] = useState<ImportRequest | null>(null)
    const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
    const [rejectReason, setRejectReason] = useState('')
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)

    const { data: importRequests = [], isLoading, refetch } = useAllImportRequests()
    const { mutate: approveRequest } = useApproveImportRequest()
    const { mutate: rejectRequest } = useRejectImportRequest()

    const handleApprove = (request: ImportRequest) => {
        approveRequest({
            id: request.id,
            data: {
                approvedBy: 'admin-user-id' // Será obtido do contexto do usuário
            }
        })
    }

    const handleReject = (request: ImportRequest) => {
        if (!rejectReason.trim()) {
            toast.error('Por favor, informe um motivo para a rejeição')
            return
        }

        rejectRequest({
            id: request.id,
            data: {
                approvedBy: 'admin-user-id', // Será obtido do contexto do usuário
                reason: rejectReason
            }
        })

        setRejectReason('')
        setIsRejectDialogOpen(false)
    }

    const handleViewDetails = (request: ImportRequest) => {
        setSelectedRequest(request)
        setIsDetailsDialogOpen(true)
    }

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            pending: {
                variant: 'secondary' as const,
                className: 'bg-yellow-100 text-yellow-800',
                icon: Clock,
                text: 'Pendente'
            },
            approved: {
                variant: 'default' as const,
                className: 'bg-green-100 text-green-800',
                icon: CheckCircle,
                text: 'Aprovada'
            },
            rejected: {
                variant: 'destructive' as const,
                className: 'bg-red-100 text-red-800',
                icon: XCircle,
                text: 'Rejeitada'
            },
            completed: {
                variant: 'outline' as const,
                className: 'bg-gray-100 text-gray-800',
                icon: CheckCircle,
                text: 'Concluída'
            }
        }

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
        const Icon = config.icon

        return (
            <Badge variant={config.variant} className={config.className}>
                <Icon className="w-3 h-3 mr-1" />
                {config.text}
            </Badge>
        )
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Carregando solicitações...</span>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Solicitações de Importação</h2>
                    <p className="text-gray-600">Gerencie as solicitações de importação de participantes</p>
                </div>
                <Badge variant="outline" className="text-sm">
                    {importRequests.length} solicitações
                </Badge>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                            <Clock className="h-5 w-5 text-yellow-600" />
                            <div>
                                <div className="text-2xl font-bold">
                                    {importRequests.filter(r => r.status === 'pending').length}
                                </div>
                                <div className="text-sm text-gray-600">Pendentes</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <div>
                                <div className="text-2xl font-bold">
                                    {importRequests.filter(r => r.status === 'approved').length}
                                </div>
                                <div className="text-sm text-gray-600">Aprovadas</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                            <XCircle className="h-5 w-5 text-red-600" />
                            <div>
                                <div className="text-2xl font-bold">
                                    {importRequests.filter(r => r.status === 'rejected').length}
                                </div>
                                <div className="text-sm text-gray-600">Rejeitadas</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                            <div>
                                <div className="text-2xl font-bold">
                                    {importRequests.filter(r => r.status === 'completed').length}
                                </div>
                                <div className="text-sm text-gray-600">Concluídas</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Requests List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <FileText className="h-5 w-5" />
                        <span>Lista de Solicitações</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {importRequests.length > 0 ? (
                        <div className="space-y-4">
                            {importRequests.map((request) => (
                                <div
                                    key={request.id}
                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                                            <FileText className="h-6 w-6 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-medium text-gray-900">
                                                {request.fileName}
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                {request.empresa?.nome} - {request.event?.name}
                                            </p>
                                            <div className="flex items-center space-x-4 mt-1">
                                                <span className="text-xs text-gray-500 flex items-center">
                                                    <Users className="w-3 h-3 mr-1" />
                                                    {request.validRows} válidos
                                                </span>
                                                <span className="text-xs text-gray-500 flex items-center">
                                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                                    {request.invalidRows} inválidos
                                                </span>
                                                <span className="text-xs text-gray-500 flex items-center">
                                                    <Building className="w-3 h-3 mr-1" />
                                                    {request.duplicateRows} duplicatas
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-4">
                                        {getStatusBadge(request.status)}

                                        <div className="text-right">
                                            <div className="text-xs text-gray-500">
                                                {formatDate(request.createdAt)}
                                            </div>
                                            {request.approvedAt && (
                                                <div className="text-xs text-gray-500">
                                                    Aprovada em {formatDate(request.approvedAt)}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleViewDetails(request)}
                                            >
                                                <Eye className="w-4 h-4 mr-1" />
                                                Detalhes
                                            </Button>

                                            {request.status === 'pending' && (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-green-600 border-green-300 hover:bg-green-50"
                                                        onClick={() => handleApprove(request)}
                                                    >
                                                        <Check className="w-4 h-4 mr-1" />
                                                        Aprovar
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-red-600 border-red-300 hover:bg-red-50"
                                                        onClick={() => {
                                                            setSelectedRequest(request)
                                                            setIsRejectDialogOpen(true)
                                                        }}
                                                    >
                                                        <X className="w-4 h-4 mr-1" />
                                                        Rejeitar
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Nenhuma solicitação encontrada
                            </h3>
                            <p className="text-gray-600">
                                As solicitações de importação aparecerão aqui quando forem criadas.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Details Dialog */}
            <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                            <FileText className="h-5 w-5" />
                            <span>Detalhes da Solicitação</span>
                        </DialogTitle>
                    </DialogHeader>

                    {selectedRequest && (
                        <div className="space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-2">Informações Básicas</h4>
                                    <div className="space-y-2 text-sm">
                                        <div><strong>Arquivo:</strong> {selectedRequest.fileName}</div>
                                        <div><strong>Empresa:</strong> {selectedRequest.empresa?.nome}</div>
                                        <div><strong>Evento:</strong> {selectedRequest.event?.name}</div>
                                        <div><strong>Status:</strong> {getStatusBadge(selectedRequest.status)}</div>
                                        <div><strong>Criada em:</strong> {formatDate(selectedRequest.createdAt)}</div>
                                        {selectedRequest.approvedAt && (
                                            <div><strong>Aprovada em:</strong> {formatDate(selectedRequest.approvedAt)}</div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-medium text-gray-900 mb-2">Estatísticas</h4>
                                    <div className="space-y-2 text-sm">
                                        <div><strong>Total de linhas:</strong> {selectedRequest.totalRows}</div>
                                        <div><strong>Válidos:</strong> {selectedRequest.validRows}</div>
                                        <div><strong>Inválidos:</strong> {selectedRequest.invalidRows}</div>
                                        <div><strong>Duplicatas:</strong> {selectedRequest.duplicateRows}</div>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Missing Items */}
                            {(selectedRequest.missingCredentials.length > 0 || selectedRequest.missingCompanies.length > 0) && (
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-4">Itens Faltantes</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        {selectedRequest.missingCredentials.length > 0 && (
                                            <div>
                                                <h5 className="text-sm font-medium text-gray-700 mb-2">Credenciais ({selectedRequest.missingCredentials.length})</h5>
                                                <div className="space-y-1">
                                                    {selectedRequest.missingCredentials.map((cred, index) => (
                                                        <div key={index} className="text-sm text-gray-600">
                                                            • {cred.name} ({cred.count} participantes)
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {selectedRequest.missingCompanies.length > 0 && (
                                            <div>
                                                <h5 className="text-sm font-medium text-gray-700 mb-2">Empresas ({selectedRequest.missingCompanies.length})</h5>
                                                <div className="space-y-1">
                                                    {selectedRequest.missingCompanies.map((company, index) => (
                                                        <div key={index} className="text-sm text-gray-600">
                                                            • {company.name} ({company.count} participantes)
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Errors */}
                            {selectedRequest.errors.length > 0 && (
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-4">Erros de Validação ({selectedRequest.errors.length})</h4>
                                    <div className="max-h-40 overflow-y-auto space-y-2">
                                        {selectedRequest.errors.map((error, index) => (
                                            <Alert key={index} variant="destructive">
                                                <AlertTriangle className="h-4 w-4" />
                                                <AlertDescription>
                                                    <strong>Linha {error.row}:</strong> {error.error}
                                                </AlertDescription>
                                            </Alert>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Duplicates */}
                            {selectedRequest.duplicates.length > 0 && (
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-4">Duplicatas ({selectedRequest.duplicates.length})</h4>
                                    <div className="max-h-40 overflow-y-auto space-y-2">
                                        {selectedRequest.duplicates.map((duplicate, index) => (
                                            <Alert key={index} variant="secondary">
                                                <AlertTriangle className="h-4 w-4" />
                                                <AlertDescription>
                                                    <strong>Linha {duplicate.row}:</strong> Participante duplicado
                                                </AlertDescription>
                                            </Alert>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                            <XCircle className="h-5 w-5 text-red-600" />
                            <span>Rejeitar Solicitação</span>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <p className="text-gray-600">
                            Por favor, informe o motivo da rejeição da solicitação de importação.
                        </p>

                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Digite o motivo da rejeição..."
                            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                            rows={4}
                        />

                        <div className="flex justify-end space-x-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setRejectReason('')
                                    setIsRejectDialogOpen(false)
                                }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={() => selectedRequest && handleReject(selectedRequest)}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                Rejeitar Solicitação
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default ImportRequestsDashboard 