/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Image from "next/image";

// Tipos para eventos e colaboradores
interface Evento {
    id_tabela: string;
    nome_evento: string;
    senha_acesso: string;
    data?: string;
}

interface Colaborador {
    nome: string;
    cpf: string;
    funcao: string;
    empresa: string;
    checkin_timestamp?: string;
    checkout_timestamp?: string;
    cadastrado_por?: string;
    tipo_credencial?: string;
    pulseira_codigo?: string;
    tempo_total?: string;
}

export default function Relatorios() {
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [eventoSelecionado, setEventoSelecionado] = useState<Evento | null>(null);
    const [dataEvento, setDataEvento] = useState("");
    const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Estados específicos dos relatórios
    const [tituloRelatorio, setTituloRelatorio] = useState("");
    const [tipoRelatorio, setTipoRelatorio] = useState<string>("geral");
    const [filtroEmpresa, setFiltroEmpresa] = useState("");
    const [filtroFuncao, setFiltroFuncao] = useState("");
    const [filtroTipoCredencial, setFiltroTipoCredencial] = useState("");

    // Carrega lista de eventos
    useEffect(() => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const apiToken = process.env.NEXT_PUBLIC_API_TOKEN;
        axios
            .get(apiUrl ?? "", {
                headers: { "xc-token": apiToken ?? "" },
            })
            .then((res) => {
                setEventos(res.data.list);
            })
            .catch((err) => console.error("Erro ao buscar eventos:", err));
    }, []);

    // Função para selecionar evento e carregar colaboradores
    const acessarEvento = (evento: Evento) => {
        setEventoSelecionado(evento);
        setDataEvento(evento.data ? evento.data : "");
        carregarColaboradores(evento);
    };

    // Função para carregar colaboradores
    const carregarColaboradores = async (evento: Evento) => {
        setLoading(true);
        try {
            let todosOsDados: Record<string, any>[] = [];
            let offset = 0;
            const limit = 1000; // Buscar em lotes de 1000
            let temMaisDados = true;
            const apiToken = process.env.NEXT_PUBLIC_API_TOKEN;

            console.log("📊 Iniciando carregamento de todos os registros...");

            // Loop para buscar todos os dados em lotes
            while (temMaisDados) {
                console.log(`🔄 Buscando lote: offset=${offset}, limit=${limit}`);

                const response = await axios.get(
                    `https://app.producoesrg.com.br/api/v2/tables/${evento.id_tabela}/records?limit=${limit}&offset=${offset}`,
                    {
                        headers: {
                            "xc-token": apiToken,
                        },
                    }
                );

                const dadosLote: Record<string, any>[] = response.data.list;
                console.log(` Lote recebido: ${dadosLote.length} registros`);

                // Adicionar dados do lote ao array principal
                todosOsDados = [...todosOsDados, ...dadosLote];

                // Verificar se há mais dados para buscar
                if (dadosLote.length < limit) {
                    // Se retornou menos que o limit, chegamos ao final
                    temMaisDados = false;
                    console.log("✅ Todos os dados foram carregados!");
                } else {
                    // Incrementar offset para próximo lote
                    offset += limit;
                }
            }

            console.log("📊 Relatórios - Total de registros carregados:", todosOsDados.length);
            setColaboradores(todosOsDados as Colaborador[]);

            // Salva no sessionStorage
            sessionStorage.setItem("relatorio_evento", JSON.stringify(evento));
            setShowModal(false);

        } catch (error) {
            console.error("❌ Erro ao carregar colaboradores:", error);
            setError("Erro ao carregar dados. Verifique a conexão.");
        }
        setLoading(false);
    };

    // Função para filtrar dados conforme o tipo de relatório
    const filtrarDados = (): Record<string, any>[] => {
        let dadosFiltrados = [...colaboradores];

        switch (tipoRelatorio) {
            case "empresa":
                if (filtroEmpresa) {
                    dadosFiltrados = dadosFiltrados.filter((c) => c.empresa === filtroEmpresa);
                }
                return dadosFiltrados.map((c) => ({
                    nome: c.nome,
                    cpf: c.cpf,
                    funcao: c.funcao,
                    empresa: c.empresa,
                }));

            case "funcao":
                if (filtroFuncao) {
                    dadosFiltrados = dadosFiltrados.filter((c) => c.funcao === filtroFuncao);
                }
                return dadosFiltrados.map((c) => ({
                    nome: c.nome,
                    cpf: c.cpf,
                    funcao: c.funcao,
                }));

            case "checkin":
                dadosFiltrados = dadosFiltrados.filter((c) => c.checkin_timestamp);
                return dadosFiltrados.map((c) => ({
                    nome: c.nome,
                    cpf: c.cpf,
                    funcao: c.funcao,
                    empresa: c.empresa,
                    checkin: c.checkin_timestamp,
                    cadastrado_por: c.cadastrado_por,
                }));

            case "checkin_pulseira":
                dadosFiltrados = dadosFiltrados.filter((c) => c.checkin_timestamp);
                return dadosFiltrados.map((c) => ({
                    nome: c.nome,
                    cpf: c.cpf,
                    funcao: c.funcao,
                    empresa: c.empresa,
                    checkin: c.checkin_timestamp,
                    cadastrado_por: c.cadastrado_por,
                    tipo_credencial: c.tipo_credencial,
                    pulseira_codigo: c.pulseira_codigo,
                }));

            case "checkout":
                dadosFiltrados = dadosFiltrados.filter((c) => c.checkout_timestamp);
                return dadosFiltrados.map((c) => ({
                    nome: c.nome,
                    cpf: c.cpf,
                    funcao: c.funcao,
                    empresa: c.empresa,
                    checkout: c.checkout_timestamp,
                    cadastrado_por: c.cadastrado_por,
                }));

            case "tempo":
                dadosFiltrados = dadosFiltrados.filter((c) => c.checkin_timestamp && c.checkout_timestamp);
                return dadosFiltrados.map((c) => ({
                    nome: c.nome,
                    cpf: c.cpf,
                    funcao: c.funcao,
                    empresa: c.empresa,
                    checkin: c.checkin_timestamp,
                    checkout: c.checkout_timestamp,
                    tempo_total: c.tempo_total,
                }));

            case "credencial":
                let dadosCredencial = [...dadosFiltrados];
                if (filtroEmpresa) {
                    dadosCredencial = dadosCredencial.filter((c) => c.empresa === filtroEmpresa);
                }
                if (filtroFuncao) {
                    dadosCredencial = dadosCredencial.filter((c) => c.funcao === filtroFuncao);
                }
                if (filtroTipoCredencial) {
                    dadosCredencial = dadosCredencial.filter((c) => c.tipo_credencial === filtroTipoCredencial);
                }
                return dadosCredencial.map((c) => ({
                    nome: c.nome,
                    cpf: c.cpf,
                    funcao: c.funcao,
                    empresa: c.empresa,
                    tipo_credencial: c.tipo_credencial,
                }));

            default: // geral
                return dadosFiltrados;
        }
    };

    // Função para gerar PDF
    const gerarPDF = async () => {
        if (!tituloRelatorio.trim()) {
            alert("Digite um título para o relatório");
            return;
        }
        try {
            // Usar jsPDF e autoTable já importados
            const doc = new jsPDF();
            const dadosRelatorio = filtrarDados();
            const agora = new Date();
            const dataHora = agora.toLocaleString("pt-BR");
            let imagemCarregada = false;
            let imagemBase64: string | null = null;
            const tentarCarregarImagem = async (caminho: string, formato: string): Promise<boolean> => {
                try {
                    const response = await fetch(caminho);
                    if (response.ok) {
                        const imageBlob = await response.blob();
                        return new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onload = function (e) {
                                try {
                                    if (!e.target) return resolve(false);
                                    imagemBase64 = e.target.result as string;
                                    doc.addImage(imagemBase64, formato, 0, 0, 210, 297);
                                    resolve(true);
                                } catch {
                                    resolve(false);
                                }
                            };
                            reader.readAsDataURL(imageBlob);
                        });
                    }
                    return false;
                } catch {
                    return false;
                }
            };
            const caminhosTentativa = [
                { path: "/images/folha-timbrada.jpg", format: "JPEG" },
                { path: "/images/folha-timbrada.png", format: "PNG" },
                { path: "./images/folha-timbrada.jpg", format: "JPEG" },
                { path: "./images/folha-timbrada.png", format: "PNG" },
            ];
            for (const tentativa of caminhosTentativa) {
                const carregada = await tentarCarregarImagem(tentativa.path, tentativa.format);
                if (carregada) {
                    imagemCarregada = true;
                    break;
                }
            }
            if (!imagemCarregada) {
                doc.setFontSize(14);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(97, 14, 92);
                doc.text("RG Produções & Eventos", 20, 20);
            }
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(97, 14, 92);
            doc.text(tituloRelatorio, doc.internal.pageSize.width / 2, 45, { align: "center" });
            let colunas: string[] = [];
            let linhas: string[][] = [];
            switch (tipoRelatorio) {
                case "empresa":
                    colunas = ["Nome", "CPF", "Função", "Empresa"];
                    linhas = dadosRelatorio.map((d) => [String(d.nome ?? "-"), String(d.cpf ?? "-"), String(d.funcao ?? "-"), String(d.empresa ?? "-")]);
                    break;
                case "funcao":
                    colunas = ["Nome", "CPF", "Função"];
                    linhas = dadosRelatorio.map((d) => [String(d.nome ?? "-"), String(d.cpf ?? "-"), String(d.funcao ?? "-")]);
                    break;
                case "checkin":
                    colunas = ["Nome", "CPF", "Função", "Empresa", "Check-in", "Cadastrado por"];
                    linhas = dadosRelatorio.map((d) => [String(d.nome ?? "-"), String(d.cpf ?? "-"), String(d.funcao ?? "-"), String(d.empresa ?? "-"), String(d.checkin ?? "-"), String(d.cadastrado_por ?? "-")]);
                    break;
                case "checkin_pulseira":
                    colunas = ["Nome", "CPF", "Função", "Empresa", "Check-in", "Cadastrado por", "Tipo Credencial", "Código Pulseira"];
                    linhas = dadosRelatorio.map((d) => [String(d.nome ?? "-"), String(d.cpf ?? "-"), String(d.funcao ?? "-"), String(d.empresa ?? "-"), String(d.checkin ?? "-"), String(d.cadastrado_por ?? "-"), String(d.tipo_credencial ?? "-"), String(d.pulseira_codigo ?? "-")]);
                    break;
                case "checkout":
                    colunas = ["Nome", "CPF", "Função", "Empresa", "Check-out", "Cadastrado por"];
                    linhas = dadosRelatorio.map((d) => [String(d.nome ?? "-"), String(d.cpf ?? "-"), String(d.funcao ?? "-"), String(d.empresa ?? "-"), String(d.checkout ?? "-"), String(d.cadastrado_por ?? "-")]);
                    break;
                case "tempo":
                    colunas = ["Nome", "CPF", "Função", "Empresa", "Check-in", "Check-out", "Tempo Total"];
                    linhas = dadosRelatorio.map((d) => [String(d.nome ?? "-"), String(d.cpf ?? "-"), String(d.funcao ?? "-"), String(d.empresa ?? "-"), String(d.checkin ?? "-"), String(d.checkout ?? "-"), String(d.tempo_total ?? "-")]);
                    break;
                case "credencial":
                    colunas = ["Nome", "CPF", "Função", "Empresa", "Tipo Credencial"];
                    linhas = dadosRelatorio.map((d) => [String(d.nome ?? "-"), String(d.cpf ?? "-"), String(d.funcao ?? "-"), String(d.empresa ?? "-"), String(d.tipo_credencial ?? "-")]);
                    break;
                default:
                    colunas = ["Nome", "CPF", "Função", "Empresa", "Check-in", "Check-out", "Tempo Total", "Cadastrado por"];
                    linhas = dadosRelatorio.map((d) => [
                        String(d.nome ?? "-"),
                        String(d.cpf ?? "-"),
                        String(d.funcao ?? "-"),
                        String(d.empresa ?? "-"),
                        String(d.checkin_timestamp ?? "-"),
                        String(d.checkout_timestamp ?? "-"),
                        String(d.tempo_total ?? "-"),
                        String(d.cadastrado_por ?? "-")
                    ]);
            }
            // autoTable já está disponível via importação
            autoTable(doc, {
                head: [colunas],
                body: linhas,
                startY: 60,
                styles: {
                    fontSize: 8,
                    cellPadding: 3,
                },
                headStyles: {
                    fillColor: [97, 14, 92],
                    textColor: [255, 255, 255],
                    fontStyle: "bold",
                },
                margin: {
                    top: 60,
                    bottom: 40,
                    left: 15,
                    right: 15,
                },
                theme: "striped",
                willDrawPage: function (data: { pageNumber: number }) {
                    if (imagemCarregada && imagemBase64 && data.pageNumber > 1) {
                        const formato = imagemBase64.includes("data:image/jpeg") ? "JPEG" : "PNG";
                        doc.addImage(imagemBase64, formato, 0, 0, 210, 297);
                    }
                },
                didDrawPage: function (data: { pageNumber: number }) {
                    if (data.pageNumber > 1) {
                        doc.setFontSize(16);
                        doc.setFont("helvetica", "bold");
                        doc.setTextColor(97, 14, 92);
                        doc.text(tituloRelatorio, doc.internal.pageSize.width / 2, 45, { align: "center" });
                    }
                    doc.setFontSize(8);
                    doc.setFont("helvetica", "normal");
                    doc.setTextColor(100, 100, 100);
                    doc.text(
                        `Página ${data.pageNumber}`,
                        doc.internal.pageSize.width - 25,
                        doc.internal.pageSize.height - 25,
                        { align: "right" }
                    );
                },
            });
            const finalY = (doc as any).lastAutoTable?.finalY || 100;
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(97, 14, 92);
            doc.text(
                `TOTAL DE REGISTROS: ${linhas.length}`,
                doc.internal.pageSize.width / 2,
                finalY + 15,
                { align: "center" }
            );
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 100, 100);
            doc.text(
                `Relatório emitido em ${dataHora}`,
                doc.internal.pageSize.width / 2,
                doc.internal.pageSize.height - 25,
                { align: "center" }
            );
            const nomeArquivo = `relatorio_${tituloRelatorio.replace(/[^a-zA-Z0-9]/g, "_")}_${agora.getTime()}.pdf`;
            doc.save(nomeArquivo);
            setTituloRelatorio("");
            setTipoRelatorio("geral");
            setFiltroEmpresa("");
            setFiltroFuncao("");
            setFiltroTipoCredencial("");
            alert("PDF gerado com sucesso!");
        } catch (error: unknown) {
            console.error("❌ Erro ao gerar PDF:", error);
            if (error instanceof Error) {
                alert(`Erro ao gerar PDF: ${error.message}`);
            } else {
                alert("Erro ao gerar PDF desconhecido");
            }
        }
    };

    const voltarParaModal = () => {
        sessionStorage.removeItem("relatorio_evento");
        setShowModal(false);
        setEventoSelecionado(null);
        setDataEvento("");
        setColaboradores([]);
        setError("");
    };

    // Listas únicas para filtros - CORRIGIDAS
    const empresasUnicas = [...new Set(colaboradores.map(c => c.empresa).filter(Boolean))];
    const funcoesUnicas = [...new Set(colaboradores.map(c => c.funcao).filter(Boolean))];
    const tiposCredencialUnicos = [...new Set(colaboradores.map(c => c.tipo_credencial).filter(Boolean))];

    // Novo: Cards de eventos
    if (!eventoSelecionado) {
        return (
            <div className="min-h-screen  text-[#610e5c] font-fira p-6">
                <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">Selecione um evento para emitir relatórios</h2>
                {loading && <p className="text-center">Carregando eventos...</p>}
                {error && <p className="text-center text-red-500">{error}</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {eventos.map((evento) => (
                        <div key={evento.id_tabela} className="bg-zinc-900 rounded-lg shadow-md p-6 flex flex-col items-center">
                            <img src="/images/logo-rg.png" width={160} height={160} alt="Logo RG" className="w-16 mb-4" />
                            <h3 className="text-lg font-bold mb-2 text-center">{evento.nome_evento}</h3>
                            {evento.data && <p className="text-gray-600 mb-2 text-center">{evento.data}</p>}
                            <button
                                onClick={() => acessarEvento(evento)}
                                className="mt-4 bg-[#610e5c] text-white px-6 py-2 rounded-lg hover:bg-[#4a0b47]"
                            >
                                Acessar
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen  text-[#610e5c] font-fira">
            {/* Página de relatórios */}
            {!showModal && eventoSelecionado && (
                <div className="p-4 md:p-6">
                    {/* Header */}
                    <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8">
                        <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-0">
                            <img src="/images/logo-rg.png" width={160} height={160} alt="Logo RG" className="w-12 md:w-16" />
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold">{eventoSelecionado.nome_evento}</h1>
                                {dataEvento && <p className="text-base md:text-lg text-gray-600">{dataEvento}</p>}
                                <p className="text-base md:text-lg text-gray-600">Gerador de Relatórios</p>
                            </div>
                        </div>

                        <button
                            onClick={voltarParaModal}
                            className="bg-[#610e5c] text-white px-3 md:px-4 py-2 rounded text-sm md:text-base hover:bg-[#4a0b47]"
                        >
                            Trocar Evento
                        </button>
                    </header>

                    {/* Formulário de relatório */}
                    <div className="bg-zinc-950 rounded-lg shadow-md p-4 md:p-6 mb-6">
                        <h3 className="text-lg md:text-xl font-bold mb-4">Configurar Relatório</h3>

                        {/* Título do relatório */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">
                                Título do Relatório
                                <span className="text-xs text-gray-500 ml-1">(esse nome aparecerá no cabeçalho do PDF)</span>
                            </label>
                            <input
                                type="text"
                                value={tituloRelatorio}
                                onChange={(e) => setTituloRelatorio(e.target.value)}
                                placeholder="Ex: Relatório de Presença - Sarará 2025"
                                className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#610e5c] text-sm md:text-base"
                            />
                        </div>

                        {/* Tipo de relatório */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Tipo de Relatório</label>
                            <select
                                value={tipoRelatorio}
                                onChange={(e) => setTipoRelatorio(e.target.value)}
                                className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#610e5c] text-sm md:text-base"
                            >
                                <option value="geral">Relatório Geral (Todos os dados)</option>
                                <option value="empresa">Filtro por Empresa</option>
                                <option value="funcao">Filtro por Função</option>
                                <option value="checkin">Quem fez Check-in</option>
                                <option value="checkin_pulseira">Check-in com código da pulseira</option>
                                <option value="checkout">Quem fez Check-out</option>
                                <option value="tempo">Tempo de Serviço</option>
                                <option value="credencial">Tipo de Credencial</option>
                            </select>
                        </div>

                        {/* Filtros condicionais */}
                        {tipoRelatorio === "empresa" && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Selecionar Empresa</label>
                                <select
                                    value={filtroEmpresa}
                                    onChange={(e) => setFiltroEmpresa(e.target.value)}
                                    className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#610e5c] text-sm md:text-base"
                                >
                                    <option value="">Todas as empresas</option>
                                    {empresasUnicas.map((empresa, idx) => (
                                        <option key={idx} value={empresa}>{empresa}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {tipoRelatorio === "funcao" && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Selecionar Função</label>
                                <select
                                    value={filtroFuncao}
                                    onChange={(e) => setFiltroFuncao(e.target.value)}
                                    className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#610e5c] text-sm md:text-base"
                                >
                                    <option value="">Todas as funções</option>
                                    {funcoesUnicas.map((funcao, idx) => (
                                        <option key={idx} value={funcao}>{funcao}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {tipoRelatorio === "credencial" && (
                            <>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-2">Filtrar por Empresa (opcional)</label>
                                    <select
                                        value={filtroEmpresa}
                                        onChange={(e) => setFiltroEmpresa(e.target.value)}
                                        className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#610e5c] text-sm md:text-base"
                                    >
                                        <option value="">Todas as empresas</option>
                                        {empresasUnicas.map((empresa, idx) => (
                                            <option key={idx} value={empresa}>{empresa}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-2">Filtrar por Função (opcional)</label>
                                    <select
                                        value={filtroFuncao}
                                        onChange={(e) => setFiltroFuncao(e.target.value)}
                                        className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#610e5c] text-sm md:text-base"
                                    >
                                        <option value="">Todas as funções</option>
                                        {funcoesUnicas.map((funcao, idx) => (
                                            <option key={idx} value={funcao}>{funcao}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-2">Filtrar por Tipo de Credencial (opcional)</label>
                                    <select
                                        value={filtroTipoCredencial}
                                        onChange={(e) => setFiltroTipoCredencial(e.target.value)}
                                        className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#610e5c] text-sm md:text-base"
                                    >
                                        <option value="">Todos os tipos</option>
                                        {tiposCredencialUnicos.map((tipo, idx) => (
                                            <option key={idx} value={tipo}>{tipo}</option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}

                        {/* Preview dos dados */}
                        <div className="mb-4">
                            <p className="text-sm text-gray-600">
                                <strong>Registros que serão incluídos:</strong> {filtrarDados().length} de {colaboradores.length}
                            </p>
                        </div>

                        {/* Botão de exportar */}
                        <button
                            onClick={gerarPDF}
                            disabled={loading || !tituloRelatorio.trim()}
                            className="w-full bg-[#610e5c] text-white px-4 md:px-6 py-2 md:py-3 text-base md:text-lg rounded-lg hover:bg-[#4a0b47] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Exportar Relatório PDF
                        </button>
                    </div>

                    {/* Footer */}
                    <footer className="text-center pt-6 pb-6">
                        <Image
                            width={160} height={160}
                            src="/images/slogan-rg.png"
                            alt="Se tem RG, é sucesso!"
                            className="mx-auto max-w-xs"
                        />
                    </footer>
                </div>
            )}
        </div>
    );
}