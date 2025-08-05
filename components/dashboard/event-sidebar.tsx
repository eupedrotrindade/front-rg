'use client'


import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useEventos } from '@/features/eventos/api/query/use-eventos'
import type { Event } from '@/features/eventos/types'
import {
    Users,
    CreditCard,
    UserCog,
    Calendar,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    X,
    Home,
    BarChart3,
    Radio,
    Car,
    Building,
    ChevronDown,
    ChevronUp,
    FileText
} from 'lucide-react'

interface EventSidebarProps {
    eventId?: string
    eventName?: string
    isCollapsed: boolean
    onToggleCollapse: () => void
    isMobileOpen: boolean
    onMobileClose: () => void
}

const EventSidebar = ({
    eventId,
    eventName,
    isCollapsed,
    onToggleCollapse,
    isMobileOpen,
    onMobileClose
}: EventSidebarProps) => {
    const router = useRouter()
    const pathname = usePathname()
    const { data: eventos = [] } = useEventos()

    const navigationItems = [
        {
            name: 'Dashboard',
            href: `/eventos/${eventId}/dashboard`,
            icon: Home,
            description: 'Visão geral do evento'
        },
        {
            name: 'Staff Geral',
            href: `/eventos/${eventId}`,
            icon: Users,
            description: 'Gestão de staff geral'
        },
        {
            name: 'Operadores',
            href: `/eventos/${eventId}/operadores`,
            icon: Users,
            description: 'Gestão de operadores'
        },
        {
            name: 'Credenciais',
            href: `/eventos/${eventId}/credenciais`,
            icon: CreditCard,
            description: 'Gestão de credenciais'
        },
        {
            name: 'Coordenadores',
            href: `/eventos/${eventId}/coordenadores`,
            icon: UserCog,
            description: 'Gestão de coordenadores'
        },
        {
            name: 'Rádio Comunicador',
            href: `/eventos/${eventId}/radios`,
            icon: Radio,
            description: 'Entrada e saída de rádios'
        },
        {
            name: 'Estacionamento',
            href: `/eventos/${eventId}/estacionamento`,
            icon: Car,
            description: 'Entrada e saída de veículos'
        },
        {
            name: 'Empresas',
            href: `/eventos/${eventId}/empresas`,
            icon: Building,
            description: 'Empresas vinculadas ao evento'
        },
        {
            name: 'Solicitações',
            href: `/eventos/${eventId}/solicitacao`,
            icon: FileText,
            description: 'Solicitações de importação'
        },
        {
            name: 'Relatórios',
            href: `/eventos/${eventId}/relatorios`,
            icon: BarChart3,
            description: 'Relatórios e análises'
        },
        {
            name: 'Configurações',
            href: `/eventos/${eventId}/configuracoes`,
            icon: Settings,
            description: 'Configurações do evento'
        }
    ]

    const isActiveRoute = (href: string) => {
        return pathname === href
    }

    const handleEventChange = (newEventId: string) => {
        router.push(`/eventos/${newEventId}`)
        onMobileClose()
    }

    return (
        <div className={`fixed inset-y-0 left-0 z-50 bg-white shadow-lg transform transition-all duration-300 ease-in-out ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'
            } lg:relative lg:translate-x-0 lg:shadow-none ${isCollapsed ? 'lg:w-16' : 'w-64'}`}>
            <div className="flex flex-col h-full">
                {/* Sidebar Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div className="flex items-center space-x-3">

                        {!isCollapsed && (
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-2">
                                    {Array.isArray(eventos) && eventos.length > 1 && (
                                        <div className="flex items-center space-x-1 bg-green-50 px-2 py-1 rounded-full">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                            <span className="text-xs text-green-700 font-semibold">{eventos.length} eventos</span>
                                        </div>
                                    )}
                                </div>
                                {Array.isArray(eventos) && eventos.length > 0 ? (
                                    <div className="relative">
                                        <Select value={eventId} onValueChange={handleEventChange}>
                                            <SelectTrigger className="h-10 text-sm border border-gray-200 bg-white hover:bg-gray-50 rounded-lg shadow-sm transition-all duration-200 hover:shadow-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                                                <SelectValue>
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-3 h-3 bg-[#610e5c] rounded-full shadow-sm"></div>
                                                        <span className="font-semibold text-gray-900 truncate max-w-32">
                                                            {eventName || 'Carregando...'}
                                                        </span>
                                                        <ChevronUp className="h-4 w-4 text-gray-400 ml-auto" />
                                                    </div>
                                                </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent className="w-72 bg-white  border-purple-600">
                                                <div className="p-3">
                                                    <div className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3 px-2 border-b border-gray-100 pb-2">
                                                        TROCAR EVENTO
                                                    </div>
                                                    {eventos.map((event: Event) => (
                                                        <SelectItem
                                                            key={String(event.id)}
                                                            value={String(event.id)}
                                                            className="rounded-lg hover:bg-purple-50 focus:bg-purple-50 py-2"
                                                        >
                                                            <div className="flex items-center space-x-3">
                                                                <div className={`w-3 h-3 rounded-full shadow-sm ${String(event.id) === eventId ? 'bg-[#610e5c]' : 'bg-gray-300'}`}></div>
                                                                <Calendar className="h-4 w-4 text-gray-500" />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-semibold text-gray-900 truncate">
                                                                        {event.name}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 truncate font-mono">
                                                                        ID: {String(event.id)}
                                                                    </div>
                                                                </div>
                                                                {String(event.id) === eventId && (
                                                                    <div className="w-5 h-5 bg-[#610e5c] rounded-full flex items-center justify-center">
                                                                        <div className="w-2 h-2 bg-white rounded-full"></div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </div>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ) : (
                                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <div className="w-3 h-3 bg-gray-400 rounded-full animate-pulse shadow-sm"></div>
                                        <p className="text-sm text-gray-600 font-semibold">
                                            {eventName || 'Carregando...'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onToggleCollapse}
                            className="hidden lg:flex hover:bg-gray-100 rounded-lg p-2"
                        >
                            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onMobileClose}
                            className="lg:hidden hover:bg-gray-100 rounded-lg p-2"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-2">
                    {navigationItems.map((item) => {
                        const Icon = item.icon
                        const isActive = isActiveRoute(item.href)

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={onMobileClose}
                                className={`flex items-center w-full h-12 px-3 rounded-md transition-colors duration-200 ${isActive
                                    ? 'bg-[#610e5c] text-white hover:bg-[#610e5c] hover:text-white'
                                    : 'text-gray-700 hover:bg-gray-100'
                                    } ${isCollapsed ? 'justify-center px-0' : ''}`}
                                title={isCollapsed ? item.name : undefined}
                            >
                                <Icon className="w-5 h-5 flex-shrink-0" />
                                {!isCollapsed && (
                                    <div className="text-left ml-3 flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">{item.name}</div>
                                        <div className="text-xs opacity-75 truncate">{item.description}</div>
                                    </div>
                                )}
                            </Link>
                        )
                    })}
                </nav>

                {/* Sidebar Footer */}
                <div className="p-4 border-t border-gray-200">
                    <Link
                        href="/eventos"
                        onClick={onMobileClose}
                        className={`flex items-center w-full h-12 px-3 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-200 ${isCollapsed ? 'justify-center px-0' : ''}`}
                        title={isCollapsed ? "Voltar aos Eventos" : undefined}
                    >
                        <LogOut className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed && <span className="ml-3">Voltar aos Eventos</span>}
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default EventSidebar 