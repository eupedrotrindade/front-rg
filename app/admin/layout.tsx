'use client'

import React from 'react'
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs'
import { Sidebar } from './components/admin-sidebar'
import { AdminHeader } from './components/admin-header'

interface AdminLayoutProps {
  children: React.ReactNode
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  return (
    <>
      <div className="h-screen bg-gray-50 flex flex-col">
        <AdminHeader />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </>
  )
}

export default AdminLayout