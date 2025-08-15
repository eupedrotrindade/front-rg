'use client'

import React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  BarChart3,
  Shield,
  Database,
  FileText,
  UserCheck,
  AlertTriangle
} from "lucide-react"
import { cn } from "@/lib/utils"

const menuItems = [
  {
    title: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    description: "Visão geral do sistema"
  },
  {
    title: "Eventos",
    href: "/admin/eventos",
    icon: Calendar,
    description: "Gerenciar todos os eventos",
    badge: "12"
  },
  {
    title: "Usuários",
    href: "/admin/usuarios",
    icon: Users,
    description: "Gerenciar usuários do sistema",
    badge: "245"
  },
  {
    title: "Operadores",
    href: "/admin/operadores",
    icon: UserCheck,
    description: "Gerenciar operadores e coordenadores"
  },
  {
    title: "Relatórios",
    href: "/admin/relatorios",
    icon: BarChart3,
    description: "Relatórios e estatísticas"
  },
  {
    title: "Auditoria",
    href: "/admin/auditoria",
    icon: Shield,
    description: "Logs de auditoria e segurança"
  },
  // {
  //   title: "Sistema",
  //   href: "/admin/sistema",
  //   icon: Database,
  //   description: "Configurações do sistema"
  // },
  {
    title: "Documentação",
    href: "/admin/documentacao",
    icon: FileText,
    description: "Documentação e ajuda"
  }
]

const alertItems = [
  {
    title: "Problemas Críticos",
    count: 2,
    color: "bg-red-100 text-red-700 border-red-200"
  },
  {
    title: "Avisos",
    count: 5,
    color: "bg-amber-100 text-amber-700 border-amber-200"
  }
]

export const Sidebar = () => {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 flex-1 overflow-y-auto">
        {/* Menu principal */}
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Button
                key={item.href}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start h-auto p-3",
                  isActive && "bg-purple-50 text-purple-700 border-purple-200"
                )}
                onClick={() => router.push(item.href)}
              >
                <div className="flex items-center gap-3 w-full">
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {item.description}
                    </p>
                  </div>
                </div>
              </Button>
            )
          })}
        </nav>

        {/* Alertas do sistema */}
        {/* <div className="mt-8">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Status do Sistema
          </h3>
          <div className="space-y-2">
            {alertItems.map((alert) => (
              <div
                key={alert.title}
                className={cn(
                  "p-3 rounded-lg border flex items-center justify-between",
                  alert.color
                )}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">{alert.title}</span>
                </div>
                <Badge variant="outline" className="bg-white">
                  {alert.count}
                </Badge>
              </div>
            ))}
          </div>
        </div> */}

        {/* Footer da sidebar */}
        <div className="mt-8 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 space-y-1">
            <p>Sistema RG Admin v2.0</p>
            <p>© 2024 Todos os direitos reservados</p>
          </div>
        </div>
      </div>
    </aside>
  )
}