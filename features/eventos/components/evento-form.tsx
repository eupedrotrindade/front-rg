import React from "react"
import { useForm, FieldValues } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { eventoSchema, EventoSchema } from "@/features/eventos/schemas"
import {
    Form,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
    FormField,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useUploadGalleryImage } from '@/features/gallery/api/mutation/use-upload-gallery-image'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ImageIcon, Upload, Loader2, Calendar, MapPin, Settings, Users, Tag, Link, Eye } from 'lucide-react'
import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import { fetchGalleryImages, type FileObject } from '@/features/gallery/components/gallery-dashboard'
import EventDaysManager from '@/components/event-days/EventDaysManager'
import { EventDay } from '@/public/types/event-days'
import { SimpleEventDay } from '@/public/types/simple-event-days'

interface EventoFormProps {
    defaultValues?: Partial<EventoSchema>
    onSubmit: (data: EventoSchema) => void
    loading?: boolean
    isEditing?: boolean
}

const EventoForm = ({ defaultValues, onSubmit, loading, isEditing = false }: EventoFormProps) => {
    // State para gerenciar os dias do evento
    const [eventDays, setEventDays] = useState<{
        montagem: SimpleEventDay[];
        evento: SimpleEventDay[];
        desmontagem: SimpleEventDay[];
    }>({
        montagem: defaultValues?.montagem?.map(day => ({
            date: day.date,
            period: 'diurno' as const
        })) || [],
        evento: defaultValues?.evento?.map(day => ({
            date: day.date,
            period: 'diurno' as const
        })) || [],
        desmontagem: defaultValues?.desmontagem?.map(day => ({
            date: day.date,
            period: 'diurno' as const
        })) || []
    });

    const form = useForm<FieldValues>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(eventoSchema) as any,
        defaultValues: {
            status: 'active',
            visibility: 'public',
            isActive: true,
            ...defaultValues,
        },
    })

    const handleSubmit = (data: FieldValues) => {
        console.log(data)

        // Validar se pelo menos uma fase tem dias definidos
        if (eventDays.montagem.length === 0 && eventDays.evento.length === 0 && eventDays.desmontagem.length === 0) {
            console.error('Pelo menos uma fase deve ter dias definidos')
            return
        }

        // Incluir os dias do evento no data e garantir que startDate/endDate sejam strings
        // Converter SimpleEventDay de volta para EventDay para compatibilidade com o schema
        const formDataWithEventDays = {
            ...data,
            startDate: data.startDate || '',
            endDate: data.endDate || '',
            montagem: eventDays.montagem.map(day => ({
                date: day.date,
                start: true,
                end: false
            })),
            evento: eventDays.evento.map(day => ({
                date: day.date,
                start: true,
                end: false
            })),
            desmontagem: eventDays.desmontagem.map(day => ({
                date: day.date,
                start: true,
                end: false
            }))
        };

        onSubmit(formDataWithEventDays as EventoSchema)
    }

    // Atualizar startDate e endDate automaticamente baseado nos dias do evento
    useEffect(() => {
        const allDays = [...eventDays.montagem, ...eventDays.evento, ...eventDays.desmontagem];

        if (allDays.length > 0) {
            // Parse dates and sort them
            const parsedDates = allDays.map(day => {
                // Handle DD/MM/YYYY format
                if (day.date.includes('/')) {
                    const [dayPart, month, year] = day.date.split('/');
                    return new Date(parseInt(year), parseInt(month) - 1, parseInt(dayPart));
                }
                // Handle ISO format
                return new Date(day.date);
            }).sort((a, b) => a.getTime() - b.getTime());

            const startDate = parsedDates[0];
            const endDate = parsedDates[parsedDates.length - 1];

            // Convert to YYYY-MM-DD format for form
            const formatForForm = (date: Date): string => {
                const year = date.getFullYear();
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const day = date.getDate().toString().padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            form.setValue('startDate', formatForForm(startDate));
            form.setValue('endDate', formatForForm(endDate));

            // Calculate total days
            const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            form.setValue('totalDays', diffDays);
        } else {
            form.setValue('startDate', '');
            form.setValue('endDate', '');
            form.setValue('totalDays', undefined);
        }
    }, [eventDays, form]);

    return (
        <div className="space-y-6">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                    {/* Informações Básicas */}
                    <Card className="border-purple-200">
                        <CardHeader className="bg-purple-50">
                            <CardTitle className="flex items-center gap-2 text-[#610e5c]">
                                <Tag className="h-5 w-5" />
                                Informações Básicas
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700 font-medium">Nome do Evento *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    disabled={loading}
                                                    placeholder="Digite o nome do evento"
                                                    className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="slug"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700 font-medium">Slug</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    disabled={loading}
                                                    placeholder="slug-do-evento"
                                                    className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-gray-700 font-medium">Descrição</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                disabled={loading}
                                                placeholder="Digite a descrição do evento"
                                                className="border-gray-300 focus:border-purple-500 focus:ring-purple-500 min-h-[100px]"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700 font-medium">Tipo de Evento</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                                                <FormControl>
                                                    <SelectTrigger className="border-gray-300 focus:border-purple-500 focus:ring-purple-500">
                                                        <SelectValue placeholder="Selecione o tipo de evento" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="corporativo">Corporativo</SelectItem>
                                                    <SelectItem value="cultural">Cultural</SelectItem>
                                                    <SelectItem value="entretenimento">Entretenimento</SelectItem>
                                                    <SelectItem value="esportivo">Esportivo</SelectItem>
                                                    <SelectItem value="religioso">Religioso</SelectItem>
                                                    <SelectItem value="show">Show</SelectItem>
                                                    <SelectItem value="outros">Outros</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* REMOVIDO: bloco de renderização do campo totalDays */}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Banner */}
                    <Card className="border-purple-200">
                        <CardHeader className="bg-purple-50">
                            <CardTitle className="flex items-center gap-2 text-[#610e5c]">
                                <ImageIcon className="h-5 w-5" />
                                Banner do Evento
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <FormField
                                control={form.control}
                                name="bannerUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-gray-700 font-medium">URL do Banner</FormLabel>
                                        <div className="flex flex-col gap-4">
                                            <div className="flex gap-2 items-center">
                                                <Input
                                                    {...field}
                                                    disabled={loading}
                                                    placeholder="https://exemplo.com/banner.jpg"
                                                    className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                                                />
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button type="button" variant="outline" size="icon" className="border-purple-300 text-purple-600 hover:bg-purple-50">
                                                            <ImageIcon className="h-5 w-5" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-2xl bg-white text-gray-800 max-h-[80vh] overflow-y-auto">
                                                        <DialogHeader>
                                                            <DialogTitle>Selecionar imagem da galeria</DialogTitle>
                                                        </DialogHeader>
                                                        <GalleryImagePicker
                                                            onSelect={(url) => {
                                                                field.onChange(url)
                                                            }}
                                                        />
                                                    </DialogContent>
                                                </Dialog>
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button type="button" variant="outline" size="icon" className="border-purple-300 text-purple-600 hover:bg-purple-50">
                                                            <Upload className="h-5 w-5" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-md bg-white text-gray-800 max-h-[80vh] overflow-y-auto">
                                                        <DialogHeader>
                                                            <DialogTitle>Fazer upload de imagem</DialogTitle>
                                                        </DialogHeader>
                                                        <GalleryImageUpload
                                                            onUpload={(url) => {
                                                                field.onChange(url)
                                                            }}
                                                        />
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                            {field.value && (
                                                <div className="border border-gray-200 rounded-lg p-2 bg-gray-50">
                                                    <div className="w-full max-w-md mx-auto">
                                                        <Image
                                                            src={field.value || "/placeholder.svg"}
                                                            alt="Banner preview"
                                                            width={400}
                                                            height={400}
                                                            className="rounded border object-contain w-full h-80 bg-white"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    {/* Cronograma do Evento - Nova Estrutura Flexível */}
                    <Card className="border-purple-200">
                        <CardHeader className="bg-purple-50">
                            <CardTitle className="flex items-center gap-2 text-[#610e5c]">
                                <Calendar className="h-5 w-5" />
                                Cronograma do Evento
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <EventDaysManager
                                initialData={eventDays}
                                onChange={setEventDays}
                            />
                        </CardContent>
                    </Card>

                    {/* Local */}
                    <Card className="border-purple-200">
                        <CardHeader className="bg-purple-50">
                            <CardTitle className="flex items-center gap-2 text-purple-800">
                                <MapPin className="h-5 w-5" />
                                Localização
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            <FormField
                                control={form.control}
                                name="venue"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-gray-700 font-medium">Local *</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                disabled={loading}
                                                placeholder="Digite o local do evento"
                                                className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-gray-700 font-medium">Endereço</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                disabled={loading}
                                                placeholder="Digite o endereço completo do evento"
                                                className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    {/* Configurações
                    <Card className="border-purple-200">
                        <CardHeader className="bg-purple-50">
                            <CardTitle className="flex items-center gap-2 text-[#610e5c]">
                                <Settings className="h-5 w-5" />
                                Configurações
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                <FormField
                                    control={form.control}
                                    name="visibility"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700 font-medium">Visibilidade</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                                                <FormControl>
                                                    <SelectTrigger className="border-gray-300 focus:border-purple-500 focus:ring-purple-500">
                                                        <SelectValue placeholder="Selecione a visibilidade" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="public">Público</SelectItem>
                                                    <SelectItem value="private">Privado</SelectItem>
                                                    <SelectItem value="restricted">Restrito</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="capacity"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700 font-medium">Capacidade</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    {...field}
                                                    disabled={loading}
                                                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                                    placeholder="100"
                                                    className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="qrCodeTemplate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700 font-medium">Template QR Code</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                                                <FormControl>
                                                    <SelectTrigger className="border-gray-300 focus:border-purple-500 focus:ring-purple-500">
                                                        <SelectValue placeholder="Selecione o template" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="default">Padrão</SelectItem>
                                                    <SelectItem value="custom">Personalizado</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div> 

                            <FormField
                                control={form.control}
                                name="categories"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-gray-700 font-medium">Categorias</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                disabled={loading}
                                                placeholder="Tecnologia, Negócios, Educação (separadas por vírgula)"
                                                value={Array.isArray(field.value) ? field.value.join(', ') : ''}
                                                onChange={(e) => {
                                                    const categories = e.target.value.split(',').map(cat => cat.trim()).filter(cat => cat)
                                                    field.onChange(categories)
                                                }}
                                                className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="registrationLink"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-gray-700 font-medium">Link de Inscrição</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                disabled={loading}
                                                placeholder="https://exemplo.com/inscricao"
                                                className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />


                        </CardContent>
                    </Card> */}

                    {/* Botões de ação */}
                    <div className="flex justify-end space-x-3 pt-6 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={loading}
                            className="border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            onClick={() => { console.log(form.getValues()); handleSubmit(form.getValues()) }}
                            disabled={loading}
                            className="bg-[#610e5c]  hover:bg-[#610e5c] text-white px-8"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    {isEditing ? "Atualizando..." : "Criando..."}
                                </>
                            ) : (
                                isEditing ? "Atualizar Evento" : "Criar Evento"
                            )}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    )
}

const GalleryImagePicker = ({ onSelect }: { onSelect: (url: string) => void }) => {
    const [images, setImages] = useState<FileObject[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [search, setSearch] = useState('')

    useEffect(() => {
        setIsLoading(true)
        fetchGalleryImages()
            .then((result) => {
                setImages(result || [])
            })
            .finally(() => setIsLoading(false))
    }, [])

    const filtered = images.filter(img => img.name.toLowerCase().includes(search.toLowerCase()))

    return (
        <div className="space-y-4">
            <Input
                placeholder="Buscar imagem..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
            />
            <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto border rounded-lg p-3">
                {isLoading && (
                    <div className="col-span-3 flex justify-center py-8">
                        <Loader2 className="animate-spin h-6 w-6 text-purple-600" />
                    </div>
                )}
                {filtered?.map(img => (
                    <button
                        key={img.url}
                        type="button"
                        onClick={() => onSelect(img.url)}
                        className="border border-gray-200 rounded-lg hover:ring-2 hover:ring-purple-500 transition-all overflow-hidden"
                    >
                        <Image
                            src={img.url || "/placeholder.svg"}
                            alt={img.name}
                            width={100}
                            height={100}
                            className="object-contain w-full h-20 bg-white"
                        />
                        <div className="truncate text-xs text-center p-1 bg-gray-50">{img.name}</div>
                    </button>
                ))}
                {(!isLoading && (!filtered || filtered.length === 0)) && (
                    <div className="col-span-3 text-center text-gray-500 py-8">
                        Nenhuma imagem encontrada
                    </div>
                )}
            </div>
        </div>
    )
}

const GalleryImageUpload = ({ onUpload }: { onUpload: (url: string) => void }) => {
    const uploadRef = useRef<HTMLInputElement>(null)
    const uploadMutation = useUploadGalleryImage()
    const [preview, setPreview] = useState<string | null>(null)
    const [file, setFile] = useState<File | null>(null)
    const [error, setError] = useState<string | null>(null)

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]
        if (!f) return

        if (!f.type.startsWith('image/')) {
            setError('Apenas imagens são permitidas.')
            return
        }

        if (f.size > 5 * 1024 * 1024) {
            setError('Tamanho máximo: 5MB.')
            return
        }

        setFile(f)
        setPreview(URL.createObjectURL(f))
        setError(null)
    }

    const handleUpload = async () => {
        if (!file) return

        await uploadMutation.mutateAsync(file, {
            onSuccess: () => {
                const SUPABASE_API_URL = process.env.NEXT_PUBLIC_SUPABASE_API_URL
                const SUPABASE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET
                const url = `${SUPABASE_API_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${file.name}`
                onUpload(url)
            },
        })
    }

    return (
        <div className="flex flex-col gap-4 items-center">
            <Input
                type="file"
                accept="image/*"
                ref={uploadRef}
                onChange={handleFile}
                className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
            />
            {preview && (
                <div className="border border-gray-200 rounded-lg p-2 bg-gray-50">
                    <Image
                        src={preview || "/placeholder.svg"}
                        alt="preview"
                        width={200}
                        height={200}
                        className="rounded border object-contain bg-white"
                    />
                </div>
            )}
            {error && <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded">{error}</div>}
            <Button
                onClick={handleUpload}
                disabled={!file || uploadMutation.status === 'pending'}
                className="bg-[#610e5c]  hover:bg-[#610e5c] text-white"
            >
                {uploadMutation.status === 'pending' ? (
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                ) : (
                    <Upload className="h-4 w-4 mr-2" />
                )}
                Enviar
            </Button>
        </div>
    )
}

export default EventoForm
