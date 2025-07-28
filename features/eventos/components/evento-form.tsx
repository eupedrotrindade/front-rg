import React from "react";
import { useForm, FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventoSchema, EventoSchema } from "@/features/eventos/schemas";
import {
    Form,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
    FormField,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useUploadGalleryImage } from '@/features/gallery/api/mutation/use-upload-gallery-image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ImageIcon, Upload, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { fetchGalleryImages, type FileObject } from '@/features/gallery/components/gallery-dashboard';

interface EventoFormProps {
    defaultValues?: Partial<EventoSchema>;
    onSubmit: (data: EventoSchema) => void;
    loading?: boolean;
    isEditing?: boolean;
}

const EventoForm = ({ defaultValues, onSubmit, loading, isEditing = false }: EventoFormProps) => {
    const form = useForm<FieldValues>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(eventoSchema) as any,
        defaultValues: {
            status: 'draft',
            visibility: 'public',
            isActive: true,
            ...defaultValues,
        },
    });

    const handleSubmit = (data: FieldValues) => {
        onSubmit(data as EventoSchema);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nome do Evento *</FormLabel>
                            <FormControl>
                                <Input {...field} disabled={loading} placeholder="Digite o nome do evento" />
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
                            <FormLabel>Slug</FormLabel>
                            <FormControl>
                                <Input {...field} disabled={loading} placeholder="slug-do-evento" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Descrição</FormLabel>
                            <FormControl>
                                <Textarea {...field} disabled={loading} placeholder="Digite a descrição do evento" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tipo de Evento</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                                    <FormControl>
                                        <SelectTrigger>
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
                                        <SelectItem value="outros">🔹 Outros (especificar)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="totalDays"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Total de Dias</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        {...field}
                                        disabled={loading}
                                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                        placeholder="1"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="bannerUrl"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Banner do Evento</FormLabel>
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2 items-center">
                                    <Input {...field} disabled={loading} placeholder="https://exemplo.com/banner.jpg" />
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button type="button" variant="outline" size="icon" title="Selecionar da galeria">
                                                <ImageIcon className="h-5 w-5" />
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-2xl">
                                            <DialogHeader>
                                                <DialogTitle>Selecionar imagem da galeria</DialogTitle>
                                            </DialogHeader>
                                            <GalleryImagePicker
                                                onSelect={(url) => {
                                                    field.onChange(url);
                                                }}
                                            />
                                        </DialogContent>
                                    </Dialog>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button type="button" variant="outline" size="icon" title="Fazer upload">
                                                <Upload className="h-5 w-5" />
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-md">
                                            <DialogHeader>
                                                <DialogTitle>Fazer upload de imagem</DialogTitle>
                                            </DialogHeader>
                                            <GalleryImageUpload
                                                onUpload={(url) => {
                                                    field.onChange(url);
                                                }}
                                            />
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                {field.value && (
                                    <div className="mt-2">
                                        <Image src={field.value} alt="Banner preview" width={320} height={120} className="rounded border object-cover max-h-32" />
                                    </div>
                                )}
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Data de Início *</FormLabel>
                                <FormControl>
                                    <Input
                                        type="date"
                                        {...field}
                                        disabled={loading}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Data de Fim *</FormLabel>
                                <FormControl>
                                    <Input
                                        type="date"
                                        {...field}
                                        disabled={loading}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Novas etapas de datas */}
                <div className="grid grid-cols-2 gap-4 border rounded-md p-4 mb-4">
                    <div>
                        <span className="font-semibold">Montagem</span>
                        <FormField
                            control={form.control}
                            name="setupStartDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Início da Montagem</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} disabled={loading} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="setupEndDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fim da Montagem</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} disabled={loading} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <div>
                        <span className="font-semibold">Evento</span>
                        <FormField
                            control={form.control}
                            name="preparationStartDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Início da Evento</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} disabled={loading} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="preparationEndDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fim da Evento</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} disabled={loading} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <div>
                        <span className="font-semibold">Desmontagem</span>
                        <FormField
                            control={form.control}
                            name="finalizationStartDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Início da Desmontagem</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} disabled={loading} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="finalizationEndDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fim da Desmontagem</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} disabled={loading} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <FormField
                    control={form.control}
                    name="venue"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Local *</FormLabel>
                            <FormControl>
                                <Input {...field} disabled={loading} placeholder="Digite o local do evento" />
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
                            <FormLabel>Endereço</FormLabel>
                            <FormControl>
                                <Input {...field} disabled={loading} placeholder="Digite o endereço do evento" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Status *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o status" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="draft">Rascunho</SelectItem>
                                        <SelectItem value="active">Ativo</SelectItem>
                                        <SelectItem value="closed">Fechado</SelectItem>
                                        <SelectItem value="canceled">Cancelado</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="visibility"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Visibilidade</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                                    <FormControl>
                                        <SelectTrigger>
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

                <FormField
                    control={form.control}
                    name="categories"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Categorias</FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    disabled={loading}
                                    placeholder="Tecnologia, Negócios, Educação (separadas por vírgula)"
                                    value={Array.isArray(field.value) ? field.value.join(', ') : ''}
                                    onChange={(e) => {
                                        const categories = e.target.value.split(',').map(cat => cat.trim()).filter(cat => cat);
                                        field.onChange(categories);
                                    }}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="capacity"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Capacidade</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        {...field}
                                        disabled={loading}
                                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                        placeholder="100"
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
                                <FormLabel>Template QR Code</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                                    <FormControl>
                                        <SelectTrigger>
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
                    name="registrationLink"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Link de Inscrição</FormLabel>
                            <FormControl>
                                <Input {...field} disabled={loading} placeholder="https://exemplo.com/inscricao" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">Evento Ativo</FormLabel>
                                <div className="text-sm text-muted-foreground">
                                    Marque se o evento está ativo no sistema
                                </div>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={loading}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                    <Button type="submit" disabled={loading} className="bg-[#610e5c] text-white">
                        {loading ? (isEditing ? "Atualizando..." : "Criando...") : (isEditing ? "Atualizar Evento" : "Criar Evento")}
                    </Button>
                </div>
            </form>
        </Form>
    );
};

const GalleryImagePicker = ({ onSelect }: { onSelect: (url: string) => void }) => {
    const [images, setImages] = useState<FileObject[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        setIsLoading(true);
        fetchGalleryImages()
            .then((result) => {
                setImages(result || []);
            })
            .finally(() => setIsLoading(false));
    }, []);

    const filtered = images.filter(img => img.name.toLowerCase().includes(search.toLowerCase()));
    return (
        <div>
            <Input placeholder="Buscar imagem..." value={search} onChange={e => setSearch(e.target.value)} className="mb-2" />
            <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {isLoading && <Loader2 className="animate-spin" />}
                {filtered?.map(img => (
                    <button key={img.url} type="button" onClick={() => onSelect(img.url)} className="border rounded hover:ring-2 ring-primary">
                        <Image src={img.url} alt={img.name} width={100} height={80} className="object-cover w-full h-20" />
                        <div className="truncate text-xs text-center">{img.name}</div>
                    </button>
                ))}
                {(!isLoading && (!filtered || filtered.length === 0)) && <div className="col-span-3 text-center text-muted-foreground">Nenhuma imagem encontrada</div>}
            </div>
        </div>
    );
};

const GalleryImageUpload = ({ onUpload }: { onUpload: (url: string) => void }) => {
    const uploadRef = useRef<HTMLInputElement>(null);
    const uploadMutation = useUploadGalleryImage();
    const [preview, setPreview] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (!f.type.startsWith('image/')) {
            setError('Apenas imagens são permitidas.');
            return;
        }
        if (f.size > 5 * 1024 * 1024) {
            setError('Tamanho máximo: 5MB.');
            return;
        }
        setFile(f);
        setPreview(URL.createObjectURL(f));
        setError(null);
    };
    const handleUpload = async () => {
        if (!file) return;
        await uploadMutation.mutateAsync(file, {
            onSuccess: () => {
                const SUPABASE_API_URL = process.env.NEXT_PUBLIC_SUPABASE_API_URL;
                const SUPABASE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET;
                const url = `${SUPABASE_API_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${file.name}`;
                onUpload(url);
            },
        });
    };
    return (
        <div className="flex flex-col gap-2 items-center">
            <Input type="file" accept="image/*" ref={uploadRef} onChange={handleFile} />
            {preview && <Image src={preview} alt="preview" width={120} height={80} className="rounded border object-cover" />}
            {error && <div className="text-destructive text-xs">{error}</div>}
            <Button onClick={handleUpload} disabled={!file || uploadMutation.status === 'pending'}>
                {uploadMutation.status === 'pending' ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Upload className="h-4 w-4 mr-2" />} Enviar
            </Button>
        </div>
    );
};

export default EventoForm;