'use client'

import React from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  Shield,
  User,
  Settings,
  LogOut,
  Bell,
  Search
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { UserButton, useUser } from '@clerk/nextjs'

export const AdminHeader = () => {
  const { user } = useUser()

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900">
            RG Admin
          </h1>
          <Badge className="bg-purple-100 text-purple-700 border-purple-200">
            <Shield className="h-3 w-3 mr-1" />
            Painel Administrativo
          </Badge>
        </div>
        
        <div className="flex items-center gap-4">
          {user && (
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {user.fullName || `${user.firstName} ${user.lastName}` || 'Administrador'}
              </p>
              <p className="text-xs text-gray-500">
                {user.primaryEmailAddress?.emailAddress || 'Email não disponível'}
              </p>
            </div>
          )}
          <UserButton 
            appearance={{
              elements: {
                avatarBox: "h-8 w-8"
              }
            }}
          />
        </div>
      </div>
    </header>
  )
}