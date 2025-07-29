'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Menu, Settings } from 'lucide-react'

interface EventHeaderProps {
    eventName?: string
    onMobileMenuOpen: () => void
}

const EventHeader = ({ eventName, onMobileMenuOpen }: EventHeaderProps) => {
    const router = useRouter()

    const handleBackToEvents = () => {
        router.push('/eventos')
    }

    return (
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
            <div className="flex items-center justify-between px-4 py-4 lg:px-6">
                {/* Mobile menu button */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onMobileMenuOpen}
                    className="lg:hidden"
                >
                    <Menu className="w-5 h-5" />
                </Button>

                {/* Breadcrumb */}
                <div className="flex items-center space-x-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleBackToEvents}
                        className="text-gray-600 hover:text-gray-900"
                    >
                        Eventos
                    </Button>
                    <span className="text-gray-400">/</span>
                    <span className="text-sm font-medium text-gray-900">
                        {eventName || 'Carregando...'}
                    </span>
                </div>

                {/* Header Actions */}
                <div className="flex items-center space-x-3">
                    <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Evento Ativo</span>
                    </div>
                    <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4 mr-2" />
                        Configurações
                    </Button>
                </div>
            </div>
        </header>
    )
}

export default EventHeader 