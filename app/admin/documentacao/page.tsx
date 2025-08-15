'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  FileText, 
  Search, 
  Book, 
  HelpCircle,
  Code,
  Settings,
  Users,
  Shield,
  Database,
  Globe,
  Download,
  ExternalLink,
  ChevronRight,
  Star,
  Clock,
  Tag,
  Folder,
  Play,
  Terminal,
  Zap,
  FileCode,
  Video,
  Image,
  BookOpen,
  GraduationCap,
  Lightbulb,
  MessageSquare,
  Phone
} from "lucide-react"

interface DocumentationItem {
  id: string
  title: string
  description: string
  category: 'getting-started' | 'api' | 'guides' | 'reference' | 'troubleshooting'
  type: 'guide' | 'reference' | 'tutorial' | 'video' | 'example'
  lastUpdated: string
  readTime: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  tags: string[]
  featured?: boolean
}

const documentationData: DocumentationItem[] = [
  {
    id: '1',
    title: 'Guia de Início Rápido',
    description: 'Aprenda os conceitos básicos e configure seu primeiro evento',
    category: 'getting-started',
    type: 'guide',
    lastUpdated: '2024-01-15',
    readTime: '10 min',
    difficulty: 'beginner',
    tags: ['básico', 'setup', 'eventos'],
    featured: true
  },
  {
    id: '2',
    title: 'API de Eventos',
    description: 'Documentação completa da API REST para gerenciamento de eventos',
    category: 'api',
    type: 'reference',
    lastUpdated: '2024-01-12',
    readTime: '25 min',
    difficulty: 'intermediate',
    tags: ['api', 'rest', 'endpoints'],
    featured: true
  },
  {
    id: '3',
    title: 'Configuração de Operadores',
    description: 'Como criar e gerenciar operadores no sistema',
    category: 'guides',
    type: 'tutorial',
    lastUpdated: '2024-01-10',
    readTime: '15 min',
    difficulty: 'beginner',
    tags: ['operadores', 'configuração', 'usuários']
  },
  {
    id: '4',
    title: 'Integração com Clerk',
    description: 'Tutorial completo de integração e configuração do Clerk',
    category: 'guides',
    type: 'tutorial',
    lastUpdated: '2024-01-08',
    readTime: '30 min',
    difficulty: 'advanced',
    tags: ['clerk', 'autenticação', 'integração']
  },
  {
    id: '5',
    title: 'Sistema de Auditoria',
    description: 'Como interpretar e usar os logs de auditoria do sistema',
    category: 'reference',
    type: 'guide',
    lastUpdated: '2024-01-05',
    readTime: '20 min',
    difficulty: 'intermediate',
    tags: ['auditoria', 'logs', 'segurança']
  },
  {
    id: '6',
    title: 'Troubleshooting Comum',
    description: 'Soluções para problemas frequentes e erros conhecidos',
    category: 'troubleshooting',
    type: 'guide',
    lastUpdated: '2024-01-03',
    readTime: '12 min',
    difficulty: 'beginner',
    tags: ['erros', 'soluções', 'problemas']
  },
  {
    id: '7',
    title: 'Backup e Restauração',
    description: 'Procedimentos para backup e restauração do sistema',
    category: 'guides',
    type: 'tutorial',
    lastUpdated: '2024-01-01',
    readTime: '18 min',
    difficulty: 'advanced',
    tags: ['backup', 'restauração', 'dados']
  }
]

const quickLinks = [
  { title: 'API Reference', icon: Code, url: '/api/docs', description: 'Documentação completa da API' },
  { title: 'Changelog', icon: Clock, url: '/changelog', description: 'Histórico de versões e atualizações' },
  { title: 'GitHub', icon: ExternalLink, url: 'https://github.com', description: 'Código fonte no GitHub' },
  { title: 'Status Page', icon: Globe, url: '/status', description: 'Status dos serviços em tempo real' }
]

const categories = [
  { id: 'getting-started', label: 'Primeiros Passos', icon: Play, color: 'bg-green-100 text-green-700' },
  { id: 'api', label: 'API Reference', icon: Code, color: 'bg-blue-100 text-blue-700' },
  { id: 'guides', label: 'Guias', icon: Book, color: 'bg-purple-100 text-purple-700' },
  { id: 'reference', label: 'Referência', icon: FileText, color: 'bg-gray-100 text-gray-700' },
  { id: 'troubleshooting', label: 'Troubleshooting', icon: HelpCircle, color: 'bg-red-100 text-red-700' }
]

const AdminDocumentacaoPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')

  const filteredDocs = documentationData.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory
    const matchesDifficulty = selectedDifficulty === 'all' || doc.difficulty === selectedDifficulty
    
    return matchesSearch && matchesCategory && matchesDifficulty
  })

  const featuredDocs = documentationData.filter(doc => doc.featured)

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-700'
      case 'intermediate': return 'bg-yellow-100 text-yellow-700'
      case 'advanced': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'guide': return <Book className="h-4 w-4" />
      case 'reference': return <FileText className="h-4 w-4" />
      case 'tutorial': return <GraduationCap className="h-4 w-4" />
      case 'video': return <Video className="h-4 w-4" />
      case 'example': return <FileCode className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Documentação e Ajuda</h1>
          <p className="text-gray-600 mt-2">
            Encontre guias, tutoriais e referências para usar o sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Baixar PDF
          </Button>
          <Button>
            <MessageSquare className="h-4 w-4 mr-2" />
            Suporte
          </Button>
        </div>
      </div>

      {/* Busca */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Pesquisar documentação, guias, API..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 text-lg h-12"
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {quickLinks.map((link) => {
          const Icon = link.icon
          return (
            <Card key={link.title} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">{link.title}</h3>
                    <p className="text-xs text-gray-600">{link.description}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="getting-started">Início</TabsTrigger>
          <TabsTrigger value="guides">Guias</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="reference">Referência</TabsTrigger>
          <TabsTrigger value="troubleshooting">Ajuda</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {/* Documentação em Destaque */}
          {featuredDocs.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Documentação em Destaque
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {featuredDocs.map((doc) => {
                  const categoryInfo = categories.find(c => c.id === doc.category)
                  const CategoryIcon = categoryInfo?.icon || FileText
                  
                  return (
                    <Card key={doc.id} className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-yellow-400">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(doc.type)}
                            <Badge className={getDifficultyColor(doc.difficulty)}>
                              {doc.difficulty}
                            </Badge>
                          </div>
                          <span className="text-sm text-gray-500">{doc.readTime}</span>
                        </div>
                        
                        <h3 className="font-semibold text-lg mb-2">{doc.title}</h3>
                        <p className="text-gray-600 text-sm mb-4">{doc.description}</p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CategoryIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">{categoryInfo?.label}</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* Categorias */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Explorar por Categoria</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {categories.map((category) => {
                const Icon = category.icon
                const docsInCategory = documentationData.filter(doc => doc.category === category.id)
                
                return (
                  <Card key={category.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4 text-center">
                      <div className={`h-12 w-12 rounded-lg flex items-center justify-center mx-auto mb-3 ${category.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="font-medium mb-1">{category.label}</h3>
                      <p className="text-sm text-gray-600">{docsInCategory.length} documentos</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Lista Completa */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Toda a Documentação</h2>
              <div className="flex gap-2">
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-1 border rounded-md text-sm"
                >
                  <option value="all">Todas as categorias</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
                <select 
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="px-3 py-1 border rounded-md text-sm"
                >
                  <option value="all">Todas as dificuldades</option>
                  <option value="beginner">Iniciante</option>
                  <option value="intermediate">Intermediário</option>
                  <option value="advanced">Avançado</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-3">
              {filteredDocs.map((doc) => {
                const categoryInfo = categories.find(c => c.id === doc.category)
                
                return (
                  <Card key={doc.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(doc.type)}
                            <div>
                              <h3 className="font-medium">{doc.title}</h3>
                              <p className="text-sm text-gray-600">{doc.description}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="flex gap-2">
                            <Badge className={getDifficultyColor(doc.difficulty)}>
                              {doc.difficulty}
                            </Badge>
                            <Badge variant="outline">
                              {categoryInfo?.label}
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-gray-500 text-right">
                            <div>{doc.readTime}</div>
                            <div className="text-xs">Atualizado {formatDate(doc.lastUpdated)}</div>
                          </div>
                          
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                      
                      {doc.tags.length > 0 && (
                        <div className="flex gap-1 mt-3">
                          {doc.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {doc.tags.length > 3 && (
                            <span className="text-xs text-gray-500">+{doc.tags.length - 3} mais</span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </TabsContent>

        {/* Tabs específicas para cada categoria */}
        {categories.map((category) => (
          <TabsContent key={category.id} value={category.id} className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${category.color}`}>
                <category.icon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold">{category.label}</h2>
                <p className="text-gray-600">
                  {documentationData.filter(doc => doc.category === category.id).length} documentos disponíveis
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              {documentationData
                .filter(doc => doc.category === category.id)
                .map((doc) => (
                  <Card key={doc.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(doc.type)}
                            <div>
                              <h3 className="font-medium">{doc.title}</h3>
                              <p className="text-sm text-gray-600">{doc.description}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <Badge className={getDifficultyColor(doc.difficulty)}>
                            {doc.difficulty}
                          </Badge>
                          
                          <div className="text-sm text-gray-500 text-right">
                            <div>{doc.readTime}</div>
                            <div className="text-xs">Atualizado {formatDate(doc.lastUpdated)}</div>
                          </div>
                          
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Seção de Ajuda e Suporte */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <HelpCircle className="h-5 w-5" />
            Precisa de Mais Ajuda?
          </CardTitle>
          <CardDescription className="text-blue-700">
            Não encontrou o que estava procurando? Temos outras formas de ajudar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-auto p-4 justify-start">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                <div className="text-left">
                  <div className="font-medium">Chat de Suporte</div>
                  <div className="text-sm text-gray-600">Fale conosco em tempo real</div>
                </div>
              </div>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 justify-start">
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-blue-600" />
                <div className="text-left">
                  <div className="font-medium">Suporte por Telefone</div>
                  <div className="text-sm text-gray-600">(11) 9999-9999</div>
                </div>
              </div>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 justify-start">
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-blue-600" />
                <div className="text-left">
                  <div className="font-medium">Tutoriais em Vídeo</div>
                  <div className="text-sm text-gray-600">Aprenda assistindo</div>
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminDocumentacaoPage