"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserCog, User } from "lucide-react"
import Image from "next/image"

export default function Home() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br bg-purple-400 flex flex-col">
      {/* Header */}
      <header className="backdrop-blur-sm shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <Image
              src="/images/logo-rg-fone.png"
              alt="Logo RG"
              className="mx-auto mb-4 h-16 w-auto"
              width={160} height={160}
            />
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Credenciamento RG Produções
            </h1>
            <p className="text-lg text-gray-600">
              Selecione o tipo de acesso
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
          {/* Administrativo */}
          <Card className="hover:shadow-xl bg-white transition-all duration-300 transform hover:-translate-y-1">
            <CardHeader className="flex flex-col items-center">
              <UserCog className="h-12 w-12 text-purple-700 mb-2" />
              <CardTitle className="text-2xl font-bold text-gray-900 mb-1">
                Administrativo
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <p className="text-gray-600 mb-6 text-center">
                Acesso para administradores do sistema. Gerencie eventos, relatórios e configurações.
              </p>
              <Button
                className="w-full bg-purple-600 hover:bg-purple-700"
                size="lg"
                onClick={() => router.push("/dashboard")}
              >
                Entrar como Administrativo
              </Button>
            </CardContent>
          </Card>

          {/* Operador */}
          <Card className="hover:shadow-xl bg-white transition-all duration-300 transform hover:-translate-y-1">
            <CardHeader className="flex flex-col items-center">
              <User className="h-12 w-12 text-pink-600 mb-2" />
              <CardTitle className="text-2xl font-bold text-gray-900 mb-1">
                Operador
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <p className="text-gray-600 mb-6 text-center">
                Acesso para operadores de credenciamento. Realize check-in e controle de acesso nos eventos.
              </p>
              <Button
                className="w-full bg-pink-600 hover:bg-pink-700"
                size="lg"
                onClick={() => router.push("/operador")}
              >
                Entrar como Operador
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="backdrop-blur-sm border-t mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <Image
              src="/images/logo-rg.png"
              width={160} height={160}
              alt="Se tem RG, é sucesso!"
              className="mx-auto h-12 w-auto opacity-80"
            />
            <p className="text-sm text-white mt-4">
              © 2024 RG Produções e Eventos. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
