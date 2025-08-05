import Image from "next/image"

export default function Header() {
    return (
        <header className="w-full flex items-center justify-between px-8 py-4 bg-white">
            {/* Logo à esquerda */}
            <Image src="/images/logo-rg.png" alt="Logo RG" className="h-12 w-auto" width={100} height={100} />

            {/* Título centralizado */}
            <div className="flex flex-col items-center flex-1">
                <h1 className="text-3xl font-extrabold text-[#6f0a5e]">Controle de Rádios</h1>
                <span className="text-lg text-[#6f0a5e] font-semibold">Por do Suel</span>
                <span className="text-base text-gray-500">{/* Data dinâmica aqui */}21/06/2025</span>
            </div>

            {/* Total e botão sair à direita */}
            <div className="flex flex-col items-end gap-2 min-w-[140px]">
                <span className="text-base text-gray-600">
                    Total: <span className="text-gray-600">27 registros</span>
                </span>
                <button className="cursor-pointer bg-[#6f0a5e] hover:bg-[#58084b] text-white font-semibold px-6 py-2 rounded-lg shadow transition-all">
                    Sair
                </button>
            </div>
        </header>
    )
}