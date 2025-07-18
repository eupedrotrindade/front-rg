"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Check,
    Download,
    Eye,
    ImageIcon,
    Loader2,
    Search,
    Trash2,
    Upload,
    X,
    AlertTriangle,

} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner'
import { createClient } from '@supabase/supabase-js'
import { useDeleteGalleryImage } from "@/features/gallery/api/mutation/use-delete-gallery-image";

export interface FileObject {
    name: string;
    size: number;
    type: string;
    url: string;
    qtd: number;
}

export default function GaleriaPage() {
    const [files, setFiles] = useState<FileObject[]>([]);
    const [filteredFiles, setFilteredFiles] = useState<FileObject[]>([]);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedFile, setSelectedFile] = useState<FileObject | null>(null);
    const [previewImage, setPreviewImage] = useState<FileObject | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [dragActive, setDragActive] = useState(false);
    const [activeTab, setActiveTab] = useState("gallery");
    const [deleting, setDeleting] = useState<string | null>(null);

    // Estados para a confirmação de exclusão
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [fileToDelete, setFileToDelete] = useState<FileObject | null>(null);

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_API_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_KEY!
    );

    const deleteGalleryImageMutation = useDeleteGalleryImage();

    // Função para verificar se o tipo do arquivo é imagem
    const isImageFile = (type: string) => type.startsWith("image");

    // Função para carregar os arquivos
    const fetchFiles = async () => {
        try {
            setLoading(true);

            // Busca todos os arquivos do bucket "galeria"
            const { data, error } = await supabase.storage.from("galeria").list("", {
                limit: 100,
                offset: 0,
            });

            if (error) {
                console.error("Erro ao listar arquivos:", error);
                toast.error('Erro ao carregar arquivos. Não foi possível carregar a galeria. Tente novamente.');
                return;
            }

            if (data) {
                // Filtra apenas imagens válidas
                const imageFiles = data.filter((file) => {
                    const isFile = !file.name.endsWith("/");
                    const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff)$/i.test(file.name);
                    return isFile && isImage && file.name !== ".emptyFolderPlaceholder";
                });

                // Gera URLs públicas
                const filesWithUrls = await Promise.all(
                    imageFiles.map(async (file) => {
                        const { data: { publicUrl } } = supabase.storage.from("galeria").getPublicUrl(file.name);
                        return {
                            name: file.name,
                            size: file.metadata?.size || 0,
                            type: file.metadata?.mimetype || "unknown",
                            url: publicUrl,
                            qtd: 0,
                        };
                    })
                );
                setFiles(filesWithUrls);
                setFilteredFiles(filesWithUrls);
            }
        } catch (error) {
            console.error("Error fetching files:", error);
            toast.error('Erro inesperado. Ocorreu um erro ao carregar os arquivos.');
        } finally {
            setLoading(false);
        }
    };

    // Função de upload de arquivos
    const uploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) return;

        try {
            setUploading(true);
            const file = event.target.files[0];

            // Validar tamanho do arquivo (5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Arquivo muito grande. O arquivo deve ter no máximo 5MB.')
                return;
            }

            // Validar tipo do arquivo
            if (!file.type.startsWith("image/")) {
                toast.error('Tipo de arquivo inválido. Apenas imagens são permitidas (PNG, JPG, JPEG).')
                return;
            }

            const { error } = await supabase.storage
                .from("galeria")
                .upload(file.name, file, {
                    cacheControl: "3600",
                    upsert: true,
                });

            if (error) {
                console.error("Erro no upload:", error);
                toast.error('Erro no upload. Não foi possível fazer o upload do arquivo.')
                return;
            }

            toast.success('Upload realizado. Arquivo enviado com sucesso!')

            // Recarregar os arquivos após o upload
            await fetchFiles();
            setActiveTab("gallery");
        } catch (error) {
            console.error("Error uploading file:", error);
            toast.error('Erro inesperado. Ocorreu um erro durante o upload.')
        } finally {
            setUploading(false);
            // Limpar o input
            if (event.target) {
                event.target.value = "";
            }
        }

    };

    // Função para upload via drag and drop
    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            try {
                setUploading(true);
                const file = e.dataTransfer.files[0];

                // Validar tamanho do arquivo (5MB)
                if (file.size > 5 * 1024 * 1024) {
                    toast.error('Arquivo muito grande. O arquivo deve ter no máximo 5MB.')
                    return;
                }

                // Validar tipo do arquivo
                if (!file.type.startsWith("image/")) {
                    toast.error('Tipo de arquivo inválido. Apenas imagens são permitidas (PNG, JPG, JPEG).')
                    return;
                }

                const { error } = await supabase.storage
                    .from("galeria")
                    .upload(file.name, file, {
                        cacheControl: "3600",
                        upsert: true,
                    });

                if (error) {
                    console.error("Erro no upload:", error);
                    toast.error('Erro no upload. Não foi possível fazer o upload do arquivo.')
                    return;
                }

                toast.success('Upload realizado. Arquivo enviado com sucesso!')

                await fetchFiles();
                setActiveTab("gallery");
            } catch (error) {
                console.error("Error uploading file:", error);
                toast.error('Erro inesperado. Ocorreu um erro durante o upload.')
            } finally {
                setUploading(false);
            }
        }
    };

    // Função para lidar com a exclusão do arquivo (chamada após confirmação)
    const handleConfirmDelete = async () => {
        if (!fileToDelete) return;
        setDeleting(fileToDelete.name);
        try {
            // Verificar e deselecionar/fechar preview se o arquivo deletado for o selecionado/preview
            if (selectedFile?.name === fileToDelete.name) {
                setSelectedFile(null);
            }
            if (previewImage?.name === fileToDelete.name) {
                setPreviewImage(null);
            }
            await deleteGalleryImageMutation.mutateAsync(fileToDelete.name);
            toast.success('Arquivo excluído. Arquivo removido da galeria.');
        } catch {
            toast.error('Erro ao excluir. Não foi possível excluir o arquivo.');
        } finally {
            setDeleting(null);
            setShowDeleteConfirm(false);
            setFileToDelete(null);
        }
    };

    // Função para abrir o modal de confirmação de exclusão
    const handleDeleteClick = (file: FileObject, e: React.MouseEvent) => {
        e.stopPropagation();
        setFileToDelete(file);
        setShowDeleteConfirm(true);
    };

    // Função para selecionar apenas 1 imagem
    const handleSelectImage = (file: FileObject) => {
        setSelectedFile(file);
    };

    // Função para abrir o preview
    const handleOpenPreview = (file: FileObject, e: React.MouseEvent) => {
        e.stopPropagation();
        setPreviewImage(file);
    };

    // Filtrar arquivos com base no termo de pesquisa
    useEffect(() => {
        if (searchTerm.trim() === "") {
            setFilteredFiles(files);
        } else {
            const filtered = files.filter((file) =>
                file.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredFiles(filtered);
        }
    }, [searchTerm, files]);

    useEffect(() => {
        fetchFiles();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Carregando galeria...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold">Galeria de Imagens</h1>
                    <p className="text-muted-foreground">
                        Gerencie suas imagens e arquivos ({files.length}{" "}
                        {files.length === 1 ? "arquivo" : "arquivos"})
                    </p>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Pesquisar imagens..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                                onClick={() => setSearchTerm("")}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="gallery">
                        Galeria
                        {filteredFiles.length > 0 && (
                            <Badge variant="secondary" className="ml-2">
                                {filteredFiles.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="upload">Upload</TabsTrigger>
                </TabsList>

                <TabsContent value="gallery">
                    {filteredFiles.length > 0 ? (
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                            {filteredFiles.map((file) => (
                                <Card
                                    key={file.name}
                                    className={cn(
                                        "group relative overflow-hidden cursor-pointer transition-all hover:shadow-md border",
                                        selectedFile?.name === file.name
                                            ? "ring-2 ring-primary border-primary"
                                            : "",
                                        deleting === file.name
                                            ? "opacity-50 pointer-events-none"
                                            : ""
                                    )}
                                    onClick={() => handleSelectImage(file)}
                                >
                                    {isImageFile(file.type) ? (
                                        <div className="relative aspect-square w-full overflow-hidden bg-muted">
                                            <Image
                                                src={file.url || "/placeholder.svg"}
                                                alt={file.name}
                                                fill
                                                className="object-cover transition-transform group-hover:scale-105"
                                                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={(e) => handleOpenPreview(file, e)}
                                                >
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    Visualizar
                                                </Button>
                                            </div>
                                            {selectedFile?.name === file.name && (
                                                <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                                                    <Check className="h-4 w-4" />
                                                </div>
                                            )}
                                            {deleting === file.name && (
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center aspect-square bg-muted">
                                            <ImageIcon className="h-10 w-10 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div className="p-3">
                                        <div
                                            className="truncate text-sm font-medium"
                                            title={file.name}
                                        >
                                            {file.name}
                                        </div>
                                        <div className="flex items-center justify-between mt-2">
                                            <Badge variant="outline" className="text-xs h-6">
                                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                            </Badge>
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        window.open(file.url, "_blank");
                                                    }}
                                                    title="Baixar arquivo"
                                                >
                                                    <Download className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                                    onClick={(e) => handleDeleteClick(file, e)}
                                                    disabled={deleting === file.name}
                                                    title="Excluir arquivo"
                                                >
                                                    {deleting === file.name ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg">
                            <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">
                                Nenhuma imagem encontrada
                            </h3>
                            <p className="text-sm text-muted-foreground mb-6 max-w-md">
                                {searchTerm
                                    ? "Não encontramos nenhuma imagem com esse termo. Tente outra pesquisa."
                                    : "Sua galeria está vazia. Faça upload de imagens para começar."}
                            </p>
                            <Button onClick={() => setActiveTab("upload")}>
                                <Upload className="h-4 w-4 mr-2" />
                                Fazer upload
                            </Button>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="upload">
                    <div
                        className={cn(
                            "border-2 border-dashed rounded-lg p-8 text-center flex flex-col items-center justify-center min-h-[400px] transition-colors",
                            dragActive
                                ? "border-primary bg-primary/5"
                                : "border-muted-foreground/25",
                            uploading && "pointer-events-none opacity-50"
                        )}
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!uploading) setDragActive(true);
                        }}
                        onDragEnter={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!uploading) setDragActive(true);
                        }}
                        onDragLeave={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDragActive(false);
                        }}
                        onDrop={handleDrop}
                    >
                        <div className="flex flex-col items-center max-w-md mx-auto">
                            {uploading ? (
                                <Loader2 className="h-12 w-12 mb-6 animate-spin text-primary" />
                            ) : (
                                <Upload
                                    className={cn(
                                        "h-12 w-12 mb-6",
                                        dragActive ? "text-primary" : "text-muted-foreground"
                                    )}
                                />
                            )}
                            <h3 className="font-medium text-xl mb-3">
                                {uploading
                                    ? "Enviando arquivo..."
                                    : dragActive
                                        ? "Solte para fazer upload"
                                        : "Arraste e solte sua imagem aqui"}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-6">
                                Suporta PNG, JPG ou JPEG até 5MB
                            </p>
                            <div className="relative">
                                <Input
                                    id="file-upload"
                                    type="file"
                                    className="hidden"
                                    onChange={uploadFile}
                                    accept="image/png,image/jpeg,image/jpg"
                                    disabled={uploading}
                                />
                                <Button
                                    onClick={() =>
                                        document.getElementById("file-upload")?.click()
                                    }
                                    disabled={uploading}
                                    size="lg"
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-4 w-4 mr-2" />
                                            Selecionar arquivo
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Image Preview Dialog */}
            {previewImage && (
                <Dialog
                    open={!!previewImage}
                    onOpenChange={(open) => !open && setPreviewImage(null)}
                >
                    <DialogContent className="sm:max-w-[90vw] md:max-w-[80vw] max-h-[90vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <ImageIcon className="h-5 w-5" />
                                {previewImage.name}
                            </DialogTitle>
                            <DialogDescription>
                                {isImageFile(previewImage.type)
                                    ? `Imagem • ${(previewImage.size / 1024 / 1024).toFixed(
                                        2
                                    )} MB`
                                    : `Arquivo • ${(previewImage.size / 1024 / 1024).toFixed(
                                        2
                                    )} MB`}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="relative w-full h-[60vh] flex-grow bg-black/5 rounded-md overflow-hidden">
                            {isImageFile(previewImage.type) ? (
                                <Image
                                    src={previewImage.url || "/placeholder.svg"}
                                    alt={previewImage.name}
                                    fill
                                    className="object-contain"
                                    sizes="90vw"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <ImageIcon className="h-20 w-20 text-muted-foreground" />
                                </div>
                            )}
                        </div>
                        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 justify-between w-full">
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => window.open(previewImage.url, "_blank")}
                                    title="Baixar arquivo"
                                >
                                    <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    onClick={() =>
                                        handleDeleteClick(previewImage, {} as React.MouseEvent)
                                    }
                                    title="Excluir arquivo"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setPreviewImage(null)}>
                                    Fechar
                                </Button>
                                <Button
                                    onClick={() => {
                                        setSelectedFile(previewImage);
                                        setPreviewImage(null);
                                    }}
                                >
                                    Selecionar
                                </Button>
                            </div>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            Confirmar Exclusão
                        </DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja excluir a imagem{" "}
                            <span className="font-semibold">{fileToDelete?.name}</span>?
                            <br />
                            <span className="text-destructive">
                                Esta ação não poderá ser desfeita.
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowDeleteConfirm(false);
                                setFileToDelete(null);
                            }}
                            disabled={!!deleting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmDelete}
                            disabled={!!deleting}
                        >
                            {deleting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Excluindo...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Excluir
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Adicionar export utilitário da função fetchFiles para uso externo
export const fetchGalleryImages = async (): Promise<FileObject[]> => {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_API_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_KEY!
    );
    try {
        // Busca todos os arquivos do bucket "galeria"
        const { data, error } = await supabase.storage.from("galeria").list("", {
            limit: 100,
            offset: 0,
        });
        if (error) {
            return [];
        }
        if (data) {
            // Filtra apenas imagens válidas
            const imageFiles = data.filter((file) => {
                const isFile = !file.name.endsWith("/");
                const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff)$/i.test(file.name);
                return isFile && isImage && file.name !== ".emptyFolderPlaceholder";
            });
            // Gera URLs públicas
            const filesWithUrls = await Promise.all(
                imageFiles.map(async (file) => {
                    const { data: { publicUrl } } = supabase.storage.from("galeria").getPublicUrl(file.name);
                    return {
                        name: file.name,
                        size: file.metadata?.size || 0,
                        type: file.metadata?.mimetype || "unknown",
                        url: publicUrl,
                        qtd: 0,
                    };
                })
            );
            return filesWithUrls;
        }
        return [];
    } catch {
        return [];
    }
};
