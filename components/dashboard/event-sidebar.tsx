'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
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
    Car
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

    const navigationItems = [
        {
            name: 'Dashboard',
            href: `/eventos/${eventId}`,
            icon: Home,
            description: 'Visão geral do evento'
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
            name: 'Rádio',
            href: `/eventos/${eventId}/radio`,
            icon: Radio,
            description: 'Entrada e saída de rádio'
        },
        {
            name: 'Vaga',
            href: `/eventos/${eventId}/vaga`,
            icon: Car,
            description: 'Entrada e saída de vaga'
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

    const handleNavigation = (href: string) => {
        router.push(href)
        onMobileClose()
    }

    const handleBackToEvents = () => {
        router.push('/eventos')
    }

    return (
        <div className={`fixed inset-y-0 left-0 z-50 bg-white shadow-lg transform transition-all duration-300 ease-in-out ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'
            } lg:relative lg:translate-x-0 lg:shadow-none ${isCollapsed ? 'lg:w-16' : 'w-64'}`}>
            <div className="flex flex-col h-full">
                {/* Sidebar Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-white" />
                        </div>
                        {!isCollapsed && (
                            <div>
                                <h2 className="text-sm font-semibold text-gray-900">Evento</h2>
                                <p className="text-xs text-gray-500 truncate max-w-32">
                                    {eventName || 'Carregando...'}
                                </p>
                            </div>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onToggleCollapse}
                        className="hidden lg:flex"
                    >
                        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onMobileClose}
                        className="lg:hidden"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-2">
                    {navigationItems.map((item) => {
                        const Icon = item.icon
                        const isActive = isActiveRoute(item.href)

                        return (
                            <Button
                                key={item.name}
                                variant={isActive ? "default" : "ghost"}
                                className={`w-full justify-start h-12 px-3 ${isActive
                                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                                    : 'text-gray-700 hover:bg-gray-100'
                                    } ${isCollapsed ? 'justify-center px-0' : ''}`}
                                onClick={() => handleNavigation(item.href)}
                                title={isCollapsed ? item.name : undefined}
                            >
                                <Icon className="w-5 h-5" />
                                {!isCollapsed && (
                                    <div className="text-left ml-3">
                                        <div className="text-sm font-medium">{item.name}</div>
                                        <div className="text-xs opacity-75">{item.description}</div>
                                    </div>
                                )}
                            </Button>
                        )
                    })}
                </nav>

                {/* Sidebar Footer */}
                <div className="p-4 border-t border-gray-200">
                    <Button
                        variant="ghost"
                        className={`w-full justify-start text-gray-600 hover:text-gray-900 ${isCollapsed ? 'justify-center px-0' : ''}`}
                        onClick={handleBackToEvents}
                        title={isCollapsed ? "Voltar aos Eventos" : undefined}
                    >
                        <LogOut className="w-5 h-5" />
                        {!isCollapsed && <span className="ml-3">Voltar aos Eventos</span>}
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default EventSidebar 