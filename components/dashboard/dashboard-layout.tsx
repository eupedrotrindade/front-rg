'use client'

import { useState } from 'react'
import EventSidebar from './event-sidebar'
import EventHeader from './event-header'

interface EventLayoutProps {
    children: React.ReactNode
    eventId?: string
    eventName?: string
}

const EventLayout = ({ children, eventId, eventName }: EventLayoutProps) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

    const handleToggleCollapse = () => {
        setSidebarCollapsed(!sidebarCollapsed)
    }

    const handleMobileClose = () => {
        setMobileSidebarOpen(false)
    }

    const handleMobileMenuOpen = () => {
        setMobileSidebarOpen(true)
    }

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <EventSidebar
                eventId={eventId}
                eventName={eventName}
                isCollapsed={sidebarCollapsed}
                onToggleCollapse={handleToggleCollapse}
                isMobileOpen={mobileSidebarOpen}
                onMobileClose={handleMobileClose}
            />

            {/* Main Content */}
            <div className={`flex-1 flex flex-col `}>
                {/* Header */}
                <EventHeader
                    eventName={eventName}
                    onMobileMenuOpen={handleMobileMenuOpen}
                />

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto bg-gray-50">
                    {children}
                </main>
            </div>

            {/* Mobile overlay */}
            {mobileSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                    onClick={handleMobileClose}
                />
            )}
        </div>
    )
}

export default EventLayout