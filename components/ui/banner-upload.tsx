'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Upload,
  Image as ImageIcon,
  X,
  Loader2,
  Check,
  AlertTriangle,
  Images,
  Trash2
} from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import { uploadEventBanner, deleteEventBanner, listEventBanners, getBannerInfo } from '@/lib/supabase'

interface BannerUploadProps {
  value?: string // URL atual do banner
  onChange: (url: string) => void
  onPathChange?: (path: string) => void // Para armazenar o path do arquivo
  eventId?: string
  disabled?: boolean
  maxSize?: number // em MB
}

export function BannerUpload({
  value,
  onChange,
  onPathChange,
  eventId,
  disabled = false,
  maxSize = 5
}: BannerUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [availableBanners, setAvailableBanners] = useState<Array<{ name: string; url: string; size: number; createdAt: string }>>([])
  const [loadingGallery, setLoadingGallery] = useState(false)
  const [selectedFromGallery, setSelectedFromGallery] = useState<string>('')
  const [showUploadSuccess, setShowUploadSuccess] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{show: boolean, bannerName: string, bannerUrl: string}>({
    show: false,
    bannerName: '',
    bannerUrl: ''
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Carregar galeria automaticamente quando o componente for montado
  useEffect(() => {
    // Pré-carregar algumas imagens da galeria para melhorar UX
    const preloadGallery = async () => {
      try {
        const banners = await listEventBanners()
        if (banners.length > 0) {
          setAvailableBanners(banners)
        }
      } catch (error) {
        console.error('Erro ao pré-carregar galeria:', error)
      }
    }

    preloadGallery()
  }, [])

  // Carregar banners disponíveis
  const loadAvailableBanners = async () => {
    setLoadingGallery(true)
    try {
      const banners = await listEventBanners()
      setAvailableBanners(banners)
      if (banners.length > 0) {
        toast.success(`${banners.length} imagens encontradas na galeria`)
      }
    } catch (error) {
      console.error('Erro ao carregar banners:', error)
      toast.error('Erro ao carregar galeria de banners')
    } finally {
      setLoadingGallery(false)
    }
  }

  // Função para formatar tamanho do arquivo
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // Função para formatar data
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const validateFile = (file: File): string | null => {
    // Verificar tipo
    if (!file.type.startsWith('image/')) {
      return 'Apenas arquivos de imagem são permitidos'
    }

    // Verificar tamanho
    const maxSizeBytes = maxSize * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return `Arquivo muito grande. Tamanho máximo: ${maxSize}MB`
    }

    // Verificar formatos suportados
    const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!supportedFormats.includes(file.type)) {
      return 'Formato não suportado. Use: JPEG, PNG, WebP ou GIF'
    }

    return null
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const validationError = validateFile(file)
    if (validationError) {
      toast.error(validationError)
      return
    }

    await uploadFile(file)
  }

  const uploadFile = async (file: File) => {
    setUploading(true)
    try {
      // Se já existe um banner, tentar deletar o anterior
      if (value && onPathChange) {
        const pathFromUrl = value.split('/').pop()
        if (pathFromUrl) {
          await deleteEventBanner(pathFromUrl)
        }
      }

      const result = await uploadEventBanner(file, eventId)

      if (result) {
        onChange(result.url)
        onPathChange?.(result.path)

        // Atualizar a galeria com a nova imagem
        const newBanner = {
          name: result.path,
          url: result.url,
          size: file.size,
          createdAt: new Date().toISOString()
        }

        // Adicionar na primeira posição da galeria
        setAvailableBanners(prev => [newBanner, ...prev])

        // Auto-selecionar a nova imagem
        setSelectedFromGallery(result.url)

        // Mostrar estado de sucesso
        setShowUploadSuccess(true)

        toast.success('Banner enviado com sucesso!')
      } else {
        toast.error('Erro ao enviar banner')
      }
    } catch (error) {
      console.error('Erro no upload:', error)
      toast.error('Erro ao enviar banner')
    } finally {
      setUploading(false)
      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveBanner = async () => {
    if (!value) return

    try {
      // Extrair path da URL para deletar
      const pathFromUrl = value.split('/').pop()
      if (pathFromUrl) {
        await deleteEventBanner(pathFromUrl)
      }

      onChange('')
      onPathChange?.('')
      toast.success('Banner removido')
    } catch (error) {
      console.error('Erro ao remover banner:', error)
      toast.error('Erro ao remover banner')
    }
  }

  const handleSelectFromGallery = () => {
    if (selectedFromGallery) {
      onChange(selectedFromGallery)
      setSelectedFromGallery('')
      toast.success('Banner selecionado da galeria!')
    }
  }

  const handleDeleteFromGallery = (bannerName: string, bannerUrl: string) => {
    setConfirmDelete({
      show: true,
      bannerName,
      bannerUrl
    })
  }

  const confirmDeleteBanner = async () => {
    try {
      const { bannerName, bannerUrl } = confirmDelete

      // Extrair path do nome do arquivo
      const pathFromName = bannerName
      await deleteEventBanner(pathFromName)

      // Remover da lista local
      setAvailableBanners(prev => prev.filter(banner => banner.name !== bannerName))

      // Se era o banner selecionado, limpar seleção
      if (selectedFromGallery === bannerUrl) {
        setSelectedFromGallery('')
      }

      // Se era o banner atual do evento, limpar também
      if (value === bannerUrl) {
        onChange('')
        onPathChange?.('')
      }

      toast.success('Banner excluído da galeria!')
    } catch (error) {
      console.error('Erro ao excluir banner:', error)
      toast.error('Erro ao excluir banner da galeria')
    } finally {
      setConfirmDelete({ show: false, bannerName: '', bannerUrl: '' })
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file) {
      const validationError = validateFile(file)
      if (validationError) {
        toast.error(validationError)
        return
      }
      uploadFile(file)
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  return (
    <div className="space-y-4">
      <Label className="text-base font-medium flex items-center gap-2">
        <ImageIcon className="w-5 h-5 text-purple-600" />
        Banner do Evento
      </Label>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-lg">
          <TabsTrigger
            value="upload"
            className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm data-[state=inactive]:text-gray-600 data-[state=inactive]:bg-transparent transition-all duration-200"
          >
            Enviar Novo
          </TabsTrigger>
          <TabsTrigger
            value="gallery"
            onClick={loadAvailableBanners}
            className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm data-[state=inactive]:text-gray-600 data-[state=inactive]:bg-transparent transition-all duration-200"
          >
            Galeria {availableBanners.length > 0 && `(${availableBanners.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          {/* Preview do banner atual */}
          {value && (
            <Card>
              <CardContent className="p-4">
                <div className="relative w-32 h-32 mx-auto">
                  <Image
                    src={value}
                    alt="Banner do evento"
                    fill
                    className="object-contain rounded"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveBanner}
                    disabled={disabled}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-600 mt-2 text-center">Banner atual (miniatura)</p>
              </CardContent>
            </Card>
          )}

          {/* Área de upload */}
          <Card>
            <CardContent className="p-6">
              {showUploadSuccess ? (
                /* Estado de sucesso após upload */
                <div className="space-y-6">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <Check className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-green-600">Banner enviado com sucesso!</p>
                      <p className="text-sm text-gray-500">Sua imagem está disponível na galeria</p>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowUploadSuccess(false)
                        fileInputRef.current?.click()
                      }}
                      disabled={disabled}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Adicionar Mais Imagens
                    </Button>
                    <Button
                      onClick={() => setShowUploadSuccess(false)}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Images className="w-4 h-4 mr-2" />
                      Ver Galeria
                    </Button>
                  </div>

                  {/* Input escondido para adicionar mais imagens */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={disabled || uploading}
                  />
                </div>
              ) : (
                /* Área de upload normal */
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${disabled || uploading
                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                    : 'border-purple-300 hover:border-purple-400 hover:bg-purple-50'
                    }`}
                  onDrop={uploading ? undefined : handleDrop}
                  onDragOver={uploading ? undefined : handleDragOver}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={disabled || uploading}
                  />

                  {uploading ? (
                    <div className="space-y-4">
                      <Loader2 className="w-12 h-12 animate-spin mx-auto text-purple-600" />
                      <div className="space-y-2">
                        <p className="text-lg font-medium text-purple-600">Enviando banner...</p>
                        <p className="text-sm text-gray-500">Por favor, aguarde enquanto processamos sua imagem</p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="w-12 h-12 mx-auto text-purple-400" />
                      <div>
                        <p className="text-lg font-medium text-gray-700">
                          Arraste uma imagem ou clique para selecionar
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Formatos: JPEG, PNG, WebP, GIF • Máximo: {maxSize}MB
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={disabled || uploading}
                        className="mx-auto"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Selecionar Arquivo
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informações sobre dimensões recomendadas */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Dimensões Recomendadas</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Para melhor qualidade, use imagens com proporção 3:1 (ex: 1200x400px)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gallery" className="space-y-4">
          {loadingGallery ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600" />
                <p className="text-sm text-gray-600 mt-2">Conectando ao storage do Supabase...</p>
                <p className="text-xs text-gray-500 mt-1">Carregando galeria de banners</p>
              </CardContent>
            </Card>
          ) : availableBanners.length > 0 ? (
            <div className="space-y-4">
              {/* Informações da galeria */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Images className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">
                        {availableBanners.length} imagens disponíveis
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Supabase Storage
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Grid de imagens */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableBanners.map((banner) => (
                  <Card
                    key={banner.name}
                    className={`cursor-pointer transition-all ${selectedFromGallery === banner.url
                      ? 'ring-2 ring-purple-500 border-purple-500 shadow-lg'
                      : 'hover:shadow-md hover:border-purple-200'
                      }`}
                    onClick={() => setSelectedFromGallery(
                      selectedFromGallery === banner.url ? '' : banner.url
                    )}
                  >
                    <CardContent className="p-3">
                      <div className="relative mb-2 w-24 h-24 mx-auto">
                        <Image
                          src={banner.url}
                          alt={banner.name}
                          fill
                          className="object-contain rounded"
                          onError={(e) => {
                            console.error('Erro ao carregar imagem:', banner.url)
                            e.currentTarget.style.display = 'none'
                          }}
                        />

                        {selectedFromGallery === banner.url && (
                          <div className="absolute inset-0 bg-purple-500 bg-opacity-20 rounded flex items-center justify-center">
                            <div className="bg-purple-600 rounded-full p-1">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Informações do arquivo com botão de excluir */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-gray-800 truncate flex-1" title={banner.name}>
                            {banner.name.length > 18 ? `${banner.name.substring(0, 18)}...` : banner.name}
                          </p>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-6 w-6 p-0 bg-red-500 hover:bg-red-600 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteFromGallery(banner.name, banner.url)
                            }}
                            disabled={disabled}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">
                            {formatFileSize(banner.size)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(banner.createdAt)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Botão de seleção */}
              {selectedFromGallery && (
                <div className="flex justify-center pt-4">
                  <Button
                    onClick={handleSelectFromGallery}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Usar Banner Selecionado
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Images className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 font-medium">Galeria vazia</p>
                <p className="text-sm text-gray-500 mt-1">
                  Nenhum banner encontrado no storage do Supabase
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Envie o primeiro banner na aba &ldquo;Enviar Novo&rdquo;
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={confirmDelete.show} onOpenChange={(open) => !open && setConfirmDelete({ show: false, bannerName: '', bannerUrl: '' })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. O banner será permanentemente removido da galeria.
            </DialogDescription>
          </DialogHeader>

          {confirmDelete.bannerName && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Trash2 className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Banner a ser excluído:</p>
                  <p className="text-sm text-red-600 mt-1 break-all">{confirmDelete.bannerName}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDelete({ show: false, bannerName: '', bannerUrl: '' })}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteBanner}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir Permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}