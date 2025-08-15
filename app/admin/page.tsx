'use client'

import { redirect } from 'next/navigation'

const AdminPage = () => {
  // Redireciona para o dashboard por padrão
  redirect('/admin/dashboard')
}

export default AdminPage