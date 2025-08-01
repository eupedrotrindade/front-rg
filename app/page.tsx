"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserCog, User } from "lucide-react"
import Image from "next/image"

export default function Home() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white backdrop-blur-sm shadow-lg border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <Image
              src="/images/logo-rg-fone.png"
              alt="Logo RG"
              className="mx-auto mb-4 h-16 w-auto drop-shadow-lg"
              width={160}
              height={64}
            />
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 drop-shadow-md">
              Credenciamento RG Produções
            </h1>
            <p className="text-lg text-gray-600 drop-shadow-sm">Selecione o tipo de acesso</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          {/* Administrativo */}
          <Card className="hover:shadow-2xl bg-white/95 backdrop-blur-sm transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 border-0 shadow-xl">
            <CardHeader className="flex flex-col items-center pb-4">
              <div className="bg-purple-100 p-4 rounded-full mb-4">
                <UserCog className="h-12 w-12 text-purple-700" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900 text-center">Administrativo</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center pt-0">
              <p className="text-gray-600 mb-8 text-center leading-relaxed">
                Acesso para administradores do sistema. Gerencie eventos, relatórios e configurações.
              </p>
              <Button
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                size="lg"
                onClick={() => router.push("/eventos")}
              >
                Entrar como Administrativo
              </Button>
            </CardContent>
          </Card>

          {/* Operador */}
          <Card className="hover:shadow-2xl bg-white/95 backdrop-blur-sm transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 border-0 shadow-xl">
            <CardHeader className="flex flex-col items-center pb-4">
              <div className="bg-pink-100 p-4 rounded-full mb-4">
                <User className="h-12 w-12 text-pink-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900 text-center">Operador</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center pt-0">
              <p className="text-gray-600 mb-8 text-center leading-relaxed">
                Acesso para operadores de credenciamento. Realize check-in e controle de acesso nos eventos.
              </p>
              <Button
                className="w-full bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                size="lg"
                onClick={() => router.push("/operador")}
              >
                Entrar como Operador
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Additional Info Section */}
        <div className="mt-16 text-center max-w-2xl">
          <div className="bg-white backdrop-blur-sm rounded-2xl p-8 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Sistema de Credenciamento</h2>
            <p className="text-gray-600 leading-relaxed">
              Plataforma completa para gerenciamento de credenciamento em eventos. Controle de acesso, relatórios em
              tempo real e interface intuitiva.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white backdrop-blur-sm border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <Image
              src="/images/logo-rg-fone.png"
              width={160}
              height={48}
              alt="Se tem RG, é sucesso!"
              className="mx-auto h-12 w-auto opacity-90 drop-shadow-sm"
            />
            <p className="text-sm text-gray-600 mt-4">© 2024 RG Produções e Eventos. Todos os direitos reservados.</p>
            <p className="text-xs text-gray-500 mt-2">Se tem RG, é sucesso!</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
