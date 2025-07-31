// 'use client'

// import React, { useState } from "react"
// import { useParams } from "next/navigation"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Button } from "@/components/ui/button"
// import { Badge } from "@/components/ui/badge"
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
// import {
//     Building,
//     Calendar,
//     Users,
//     MapPin,
//     Mail,
//     Phone,
//     FileText,
//     Globe,
//     TrendingUp,
//     Award,
//     Clock,
//     CheckCircle,
//     AlertCircle,
//     ExternalLink,
//     ArrowRight
// } from "lucide-react"
// import { useEmpresa, useEventos, useEventParticipants, useEventStaff } from "@/features/eventos/api/query"
// import Link from "next/link"

// export default function EmpresaDashboardPage() {
//     const params = useParams()
//     const empresaId = String(params.id)

//     const { data: empresa, isLoading: isLoadingEmpresa } = useEmpresa(empresaId)
//     const { data: eventos = [] } = useEventos()
//     const { data: participantes = [] } = useEventParticipants()


//     // Buscar eventos onde a empresa participou (baseado em participantes)
//     const eventosParticipados = Array.isArray(eventos)
//         ? eventos.filter((evento: any) => {
//             const participantesDoEvento = participantes.filter((p: any) => p.eventId === evento.id)
//             return participantesDoEvento.some((p: any) => p.company === empresa?.nome)
//         })
//         : []

//     // Buscar participantes da empresa
//     const participantesDaEmpresa = participantes.filter((p: any) => p.company === empresa?.nome)

   

//     // Calcular estatísticas reais
//     const totalEventos = eventosParticipados.length
//     const eventosAtivos = eventosParticipados.filter(e => e.isActive).length
//     const totalStaff = staffDaEmpresa.length
//     const totalParticipantes = participantesDaEmpresa.length

//     const [activeTab, setActiveTab] = useState<'perfil' | 'eventos' | 'staff'>('perfil')

//     if (isLoadingEmpresa) {
//         return (
//             <div className="p-8">
//                 <div className="text-center py-8">
//                     <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mx-auto mb-4" />
//                     <p className="text-gray-600">Carregando informações da empresa...</p>
//                 </div>
//             </div>
//         )
//     }

//     if (!empresa) {
//         return (
//             <div className="p-8">
//                 <div className="text-center py-8">
//                     <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
//                     <p className="text-gray-600">Empresa não encontrada</p>
//                 </div>
//             </div>
//         )
//     }

//     return (
//         <div className="p-8">
//             {/* Header */}
//             <div className="mb-8">
//                 <div className="flex items-center justify-between">
//                     <div>
//                         <h1 className="text-3xl font-bold text-gray-900 mb-2">
//                             {empresa.nome}
//                         </h1>
//                         <p className="text-gray-600">
//                             Perfil completo e histórico de participação em eventos
//                         </p>
//                     </div>
//                     <div className="flex items-center gap-2">
//                         <Badge variant="outline" className="text-blue-600">
//                             <Building className="h-3 w-3 mr-1" />
//                             {empresa.isActive ? "Ativa" : "Inativa"}
//                         </Badge>
//                     </div>
//                 </div>
//             </div>

//             {/* Tabs */}
//             <div className="mb-6">
//                 <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
//                     <Button
//                         variant={activeTab === 'perfil' ? 'default' : 'ghost'}
//                         size="sm"
//                         onClick={() => setActiveTab('perfil')}
//                         className="flex items-center gap-2"
//                     >
//                         <Building className="h-4 w-4" />
//                         Perfil
//                     </Button>
//                     <Button
//                         variant={activeTab === 'eventos' ? 'default' : 'ghost'}
//                         size="sm"
//                         onClick={() => setActiveTab('eventos')}
//                         className="flex items-center gap-2"
//                     >
//                         <Calendar className="h-4 w-4" />
//                         Eventos ({totalEventos})
//                     </Button>
//                     <Button
//                         variant={activeTab === 'staff' ? 'default' : 'ghost'}
//                         size="sm"
//                         onClick={() => setActiveTab('staff')}
//                         className="flex items-center gap-2"
//                     >
//                         <Users className="h-4 w-4" />
//                         Staff ({totalStaff})
//                     </Button>
//                 </div>
//             </div>

//             {/* Content */}
//             {activeTab === 'perfil' && (
//                 <div className="space-y-6">
//                     {/* Informações Básicas */}
//                     <Card>
//                         <CardHeader>
//                             <CardTitle className="flex items-center gap-2">
//                                 <Building className="h-5 w-5" />
//                                 Informações da Empresa
//                             </CardTitle>
//                         </CardHeader>
//                         <CardContent>
//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                                 <div className="space-y-4">
//                                     <div>
//                                         <h3 className="text-lg font-semibold text-gray-900 mb-2">
//                                             {empresa.nome}
//                                         </h3>
//                                         {empresa.cnpj && (
//                                             <Badge variant="secondary" className="font-mono text-xs mb-2">
//                                                 CNPJ: {empresa.cnpj}
//                                             </Badge>
//                                         )}
//                                     </div>

//                                     <div className="space-y-3">
//                                         {empresa.email && (
//                                             <div className="flex items-center gap-2">
//                                                 <Mail className="h-4 w-4 text-gray-500" />
//                                                 <span className="text-sm text-gray-600">{empresa.email}</span>
//                                             </div>
//                                         )}
//                                         {empresa.telefone && (
//                                             <div className="flex items-center gap-2">
//                                                 <Phone className="h-4 w-4 text-gray-500" />
//                                                 <span className="text-sm text-gray-600">{empresa.telefone}</span>
//                                             </div>
//                                         )}
//                                         {empresa.responsavel && (
//                                             <div className="flex items-center gap-2">
//                                                 <Users className="h-4 w-4 text-gray-500" />
//                                                 <span className="text-sm text-gray-600">Resp: {empresa.responsavel}</span>
//                                             </div>
//                                         )}
//                                     </div>
//                                 </div>

//                                 <div className="space-y-4">
//                                     {empresa.cidade && empresa.estado && (
//                                         <div className="flex items-center gap-2">
//                                             <MapPin className="h-4 w-4 text-gray-500" />
//                                             <span className="text-sm text-gray-600">
//                                                 {empresa.cidade}, {empresa.estado}
//                                             </span>
//                                         </div>
//                                     )}
//                                     {empresa.endereco && (
//                                         <div className="text-sm text-gray-600">
//                                             <strong>Endereço:</strong> {empresa.endereco}
//                                         </div>
//                                     )}
//                                     {empresa.cep && (
//                                         <div className="text-sm text-gray-600">
//                                             <strong>CEP:</strong> {empresa.cep}
//                                         </div>
//                                     )}
//                                     {empresa.observacoes && (
//                                         <div className="text-sm text-gray-600">
//                                             <strong>Observações:</strong> {empresa.observacoes}
//                                         </div>
//                                     )}
//                                 </div>
//                             </div>
//                         </CardContent>
//                     </Card>

//                     {/* Estatísticas */}
//                     <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
//                         <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
//                             <CardContent className="p-6">
//                                 <div className="flex items-center justify-between">
//                                     <div>
//                                         <p className="text-sm opacity-90">Total de Eventos</p>
//                                         <p className="text-3xl font-bold">{totalEventos}</p>
//                                     </div>
//                                     <Calendar className="h-8 w-8 opacity-80" />
//                                 </div>
//                             </CardContent>
//                         </Card>

//                         <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
//                             <CardContent className="p-6">
//                                 <div className="flex items-center justify-between">
//                                     <div>
//                                         <p className="text-sm opacity-90">Eventos Ativos</p>
//                                         <p className="text-3xl font-bold">{eventosAtivos}</p>
//                                     </div>
//                                     <CheckCircle className="h-8 w-8 opacity-80" />
//                                 </div>
//                             </CardContent>
//                         </Card>

//                         <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
//                             <CardContent className="p-6">
//                                 <div className="flex items-center justify-between">
//                                     <div>
//                                         <p className="text-sm opacity-90">Staff Total</p>
//                                         <p className="text-3xl font-bold">{totalStaff}</p>
//                                     </div>
//                                     <Users className="h-8 w-8 opacity-80" />
//                                 </div>
//                             </CardContent>
//                         </Card>

//                         <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
//                             <CardContent className="p-6">
//                                 <div className="flex items-center justify-between">
//                                     <div>
//                                         <p className="text-sm opacity-90">Participantes</p>
//                                         <p className="text-3xl font-bold">{totalParticipantes}</p>
//                                     </div>
//                                     <TrendingUp className="h-8 w-8 opacity-80" />
//                                 </div>
//                             </CardContent>
//                         </Card>
//                     </div>
//                 </div>
//             )}

//             {activeTab === 'eventos' && (
//                 <div className="space-y-6">
//                     <Card>
//                         <CardHeader>
//                             <CardTitle className="flex items-center gap-2">
//                                 <Calendar className="h-5 w-5" />
//                                 Eventos Participados
//                             </CardTitle>
//                         </CardHeader>
//                         <CardContent>
//                             {eventosParticipados.length === 0 ? (
//                                 <div className="text-center py-8">
//                                     <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
//                                     <p className="text-gray-600">Nenhum evento encontrado</p>
//                                 </div>
//                             ) : (
//                                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                                     {eventosParticipados.map((evento) => {
//                                         const participantesDoEvento = participantesDaEmpresa.filter(p => p.eventId === evento.id)
//                                         const staffDoEvento = staffDaEmpresa.filter(s => s.eventId === evento.id)

//                                         return (
//                                             <Card key={evento.id} className="hover:shadow-lg transition-shadow">
//                                                 <CardContent className="p-4">
//                                                     <div className="flex items-start justify-between mb-3">
//                                                         <div className="flex-1">
//                                                             <h3 className="font-semibold text-gray-900 mb-1">
//                                                                 {evento.name}
//                                                             </h3>
//                                                             <Badge variant={evento.isActive ? "default" : "secondary"} className="text-xs">
//                                                                 {evento.isActive ? "Ativo" : "Inativo"}
//                                                             </Badge>
//                                                         </div>
//                                                         <Link href={`/empresas/dashboard/${empresaId}/evento/${evento.id}`}>
//                                                             <Button variant="ghost" size="sm">
//                                                                 <ArrowRight className="h-4 w-4" />
//                                                             </Button>
//                                                         </Link>
//                                                     </div>

//                                                     <div className="space-y-2 text-sm text-gray-600">
//                                                         <div className="flex items-center gap-2">
//                                                             <Users className="h-3 w-3" />
//                                                             <span>{participantesDoEvento.length} participantes</span>
//                                                         </div>
//                                                         <div className="flex items-center gap-2">
//                                                             <Building className="h-3 w-3" />
//                                                             <span>{staffDoEvento.length} staff</span>
//                                                         </div>
//                                                         <div className="flex items-center gap-2">
//                                                             <Clock className="h-3 w-3" />
//                                                             <span>Participou em {eventosParticipados.length} eventos</span>
//                                                         </div>
//                                                     </div>
//                                                 </CardContent>
//                                             </Card>
//                                         )
//                                     })}
//                                 </div>
//                             )}
//                         </CardContent>
//                     </Card>
//                 </div>
//             )}

//             {activeTab === 'staff' && (
//                 <div className="space-y-6">
//                     <Card>
//                         <CardHeader>
//                             <CardTitle className="flex items-center gap-2">
//                                 <Users className="h-5 w-5" />
//                                 Staff da Empresa
//                             </CardTitle>
//                         </CardHeader>
//                         <CardContent>
//                             {staffDaEmpresa.length === 0 ? (
//                                 <div className="text-center py-8">
//                                     <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
//                                     <p className="text-gray-600">Nenhum staff encontrado</p>
//                                 </div>
//                             ) : (
//                                 <Table>
//                                     <TableHeader>
//                                         <TableRow>
//                                             <TableHead>Nome</TableHead>
//                                             <TableHead>Função</TableHead>
//                                             <TableHead>Eventos</TableHead>
//                                             <TableHead>Status</TableHead>
//                                             <TableHead>Ações</TableHead>
//                                         </TableRow>
//                                     </TableHeader>
//                                     <TableBody>
//                                         {staffDaEmpresa.map((staffMember) => {
//                                             const eventosDoStaff = Array.isArray(eventos)
//                                                 ? eventos.filter((e: any) =>
//                                                     staffMember.eventId === e.id && staffMember.id === e.staffId
//                                                 )
//                                                 : []

//                                             return (
//                                                 <TableRow key={staffMember.id}>
//                                                     <TableCell className="font-medium">{staffMember.name}</TableCell>
//                                                     <TableCell>{staffMember.rol?? '-'}</TableCell>
//                                                     <TableCell>{eventosDoStaff.length} eventos</TableCell>
//                                                     <TableCell>
//                                                         <Badge variant={staffMember.ativo ? "default" : "secondary"}>
//                                                             {staffMember.ativo ? "Ativo" : "Inativo"}
//                                                         </Badge>
//                                                     </TableCell>
//                                                     <TableCell>
//                                                         <Button variant="ghost" size="sm">
//                                                             <ExternalLink className="h-4 w-4" />
//                                                         </Button>
//                                                     </TableCell>
//                                                 </TableRow>
//                                             )
//                                         })}
//                                     </TableBody>
//                                 </Table>
//                             )}
//                         </CardContent>
//                     </Card>
//                 </div>
//             )}
//         </div>
//     )
// } 