import React, { memo } from 'react'
import { Search, Filter, X, ChevronDown, Check } from 'lucide-react'
import { EventParticipant } from '@/features/eventos/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'

interface OptimizedFiltersProps {
    filters: {
        searchTerm: string
        empresa: string
        funcao: string
        checkedIn: string
    }
    popoverStates: {
        empresa: boolean
        funcao: boolean
        status: boolean
    }
    dayStats: {
        empresas: Map<string, { total: number; checkedIn: number; checkedOut: number }>
        funcoes: Map<string, { total: number; checkedIn: number; checkedOut: number }>
        statusCounts: { checkedIn: number; checkedOut: number; notCheckedIn: number }
    }
    uniqueEmpresas: string[]
    uniqueFuncoes: string[]
    participantesDoDia: EventParticipant[]
    filteredParticipants: EventParticipant[]
    hasActiveFilters: boolean
    isFilteringInProgress: boolean
    onUpdateFilter: (key: string, value: string) => void
    onClearFilters: () => void
    onSetPopoverState: (popover: string, isOpen: boolean) => void
}

// Componente de filtro individual memoizado
const FilterPopover = memo<{
    type: 'empresa' | 'funcao' | 'status'
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    triggerText: string
    triggerCount?: number
    children: React.ReactNode
}>(({ type, isOpen, onOpenChange, triggerText, triggerCount, children }) => (
    <div className="min-w-[200px]">
        <Popover open={isOpen} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isOpen}
                    className="justify-between bg-white border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                >
                    {triggerCount !== undefined ? `${triggerText} (${triggerCount})` : triggerText}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent 
                className={`w-[${type === 'empresa' ? '300px' : type === 'funcao' ? '280px' : '260px'}] p-0`} 
                align="start"
            >
                {children}
            </PopoverContent>
        </Popover>
    </div>
))

FilterPopover.displayName = 'FilterPopover'

// Componente de item de comando memoizado
const CommandItemMemo = memo<{
    value: string
    isSelected: boolean
    onSelect: (value: string) => void
    title: string
    subtitle?: string
    count?: number
}>(({ value, isSelected, onSelect, title, subtitle, count }) => (
    <CommandItem
        value={value}
        onSelect={onSelect}
    >
        <Check className={`mr-2 h-4 w-4 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
        <div className="flex-1">
            <div className="font-medium">{title}</div>
            {subtitle && (
                <div className="text-xs text-gray-500">{subtitle}</div>
            )}
        </div>
        {count !== undefined && (
            <span className="text-xs text-gray-400">({count})</span>
        )}
    </CommandItem>
))

CommandItemMemo.displayName = 'CommandItemMemo'

const OptimizedFilters: React.FC<OptimizedFiltersProps> = ({
    filters,
    popoverStates,
    dayStats,
    uniqueEmpresas,
    uniqueFuncoes,
    participantesDoDia,
    filteredParticipants,
    hasActiveFilters,
    isFilteringInProgress,
    onUpdateFilter,
    onClearFilters,
    onSetPopoverState
}) => {
    const getTriggerTextEmpresa = () => {
        if (filters.empresa === 'all') {
            return `Empresa (${uniqueEmpresas.length})`
        }
        return `${filters.empresa} (${dayStats.empresas.get(filters.empresa)?.total || 0})`
    }

    const getTriggerTextFuncao = () => {
        if (filters.funcao === 'all') {
            return `Função (${uniqueFuncoes.length})`
        }
        return `${filters.funcao} (${dayStats.funcoes.get(filters.funcao)?.total || 0})`
    }

    const getTriggerTextStatus = () => {
        if (filters.checkedIn === 'all') {
            return 'Status Check-in'
        }
        switch (filters.checkedIn) {
            case 'checked-in':
                return `✅ Check-in (${dayStats.statusCounts.checkedIn})`
            case 'checked-out':
                return `🔴 Check-out (${dayStats.statusCounts.checkedOut})`
            case 'not-checked-in':
                return `⏳ Não fez check-in (${dayStats.statusCounts.notCheckedIn})`
            default:
                return 'Status Check-in'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'checked-in':
                return 'Check-in'
            case 'checked-out':
                return 'Check-out'
            case 'not-checked-in':
                return 'Não fez check-in'
            default:
                return status
        }
    }

    return (
        <div className="mb-8">
            <div className="flex flex-col lg:flex-row gap-4">
                {/* Campo de busca */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                        type="text"
                        placeholder="Procure pelo nome, cpf ou código da pulseira"
                        value={filters.searchTerm}
                        onChange={(e) => onUpdateFilter('searchTerm', e.target.value)}
                        className="pl-10 bg-white border-gray-200 focus:border-purple-500 focus:ring-purple-500 shadow-sm transition-all duration-200"
                    />
                    {isFilteringInProgress && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                </div>

                {/* Filtros */}
                <div className="flex flex-wrap gap-3">
                    {/* Filtro por Empresa */}
                    <FilterPopover
                        type="empresa"
                        isOpen={popoverStates.empresa}
                        onOpenChange={(open) => onSetPopoverState('empresa', open)}
                        triggerText={getTriggerTextEmpresa()}
                    >
                        <Command>
                            <CommandInput placeholder="Procurar empresa..." />
                            <CommandEmpty>Empresa não encontrada.</CommandEmpty>
                            <CommandList>
                                <CommandGroup>
                                    <CommandItemMemo
                                        value="all"
                                        isSelected={filters.empresa === 'all'}
                                        onSelect={() => {
                                            onUpdateFilter('empresa', 'all')
                                            onSetPopoverState('empresa', false)
                                        }}
                                        title={`Todas as empresas (${participantesDoDia.length})`}
                                    />
                                    {uniqueEmpresas.map((empresa) => {
                                        const empresaData = dayStats.empresas.get(empresa)!
                                        return (
                                            <CommandItemMemo
                                                key={empresa}
                                                value={empresa}
                                                isSelected={filters.empresa === empresa}
                                                onSelect={(value) => {
                                                    onUpdateFilter('empresa', value === filters.empresa ? 'all' : value)
                                                    onSetPopoverState('empresa', false)
                                                }}
                                                title={empresa}
                                                subtitle={`${empresaData.total} pessoas • ${empresaData.checkedIn} check-in • ${empresaData.checkedOut} check-out`}
                                            />
                                        )
                                    })}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </FilterPopover>

                    {/* Filtro por Função */}
                    <FilterPopover
                        type="funcao"
                        isOpen={popoverStates.funcao}
                        onOpenChange={(open) => onSetPopoverState('funcao', open)}
                        triggerText={getTriggerTextFuncao()}
                    >
                        <Command>
                            <CommandInput placeholder="Procurar função..." />
                            <CommandEmpty>Função não encontrada.</CommandEmpty>
                            <CommandList>
                                <CommandGroup>
                                    <CommandItemMemo
                                        value="all"
                                        isSelected={filters.funcao === 'all'}
                                        onSelect={() => {
                                            onUpdateFilter('funcao', 'all')
                                            onSetPopoverState('funcao', false)
                                        }}
                                        title={`Todas as funções (${participantesDoDia.length})`}
                                    />
                                    {uniqueFuncoes.map((funcao) => {
                                        const funcaoData = dayStats.funcoes.get(funcao)!
                                        return (
                                            <CommandItemMemo
                                                key={funcao}
                                                value={funcao}
                                                isSelected={filters.funcao === funcao}
                                                onSelect={(value) => {
                                                    onUpdateFilter('funcao', value === filters.funcao ? 'all' : value)
                                                    onSetPopoverState('funcao', false)
                                                }}
                                                title={funcao}
                                                subtitle={`${funcaoData.total} pessoas • ${funcaoData.checkedIn} check-in • ${funcaoData.checkedOut} check-out`}
                                            />
                                        )
                                    })}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </FilterPopover>

                    {/* Filtro por Status Check-in */}
                    <FilterPopover
                        type="status"
                        isOpen={popoverStates.status}
                        onOpenChange={(open) => onSetPopoverState('status', open)}
                        triggerText={getTriggerTextStatus()}
                    >
                        <Command>
                            <CommandList>
                                <CommandGroup>
                                    <CommandItemMemo
                                        value="all"
                                        isSelected={filters.checkedIn === 'all'}
                                        onSelect={() => {
                                            onUpdateFilter('checkedIn', 'all')
                                            onSetPopoverState('status', false)
                                        }}
                                        title={`Todos os status (${participantesDoDia.length})`}
                                    />
                                    {['checked-in', 'checked-out', 'not-checked-in'].map((status) => (
                                        <CommandItemMemo
                                            key={status}
                                            value={status}
                                            isSelected={filters.checkedIn === status}
                                            onSelect={() => {
                                                onUpdateFilter('checkedIn', status)
                                                onSetPopoverState('status', false)
                                            }}
                                            title={`${status === 'checked-in' ? '✅' : status === 'checked-out' ? '🔴' : '⏳'} ${getStatusLabel(status)}`}
                                            count={
                                                status === 'checked-in' ? dayStats.statusCounts.checkedIn :
                                                    status === 'checked-out' ? dayStats.statusCounts.checkedOut :
                                                        dayStats.statusCounts.notCheckedIn
                                            }
                                        />
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </FilterPopover>

                    {/* Botão para limpar filtros */}
                    {hasActiveFilters && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onClearFilters}
                            className="text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                        >
                            <X className="w-4 h-4 mr-2" />
                            Limpar Filtros
                        </Button>
                    )}
                </div>
            </div>

            {/* Resumo dos filtros aplicados */}
            {hasActiveFilters && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-900">
                                Filtros aplicados: {filteredParticipants.length} de {participantesDoDia.length} participantes
                                {isFilteringInProgress && (
                                    <span className="ml-2 text-blue-600">
                                        <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin inline-block"></div>
                                    </span>
                                )}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {filters.searchTerm && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Busca: &quot;{filters.searchTerm}&quot;
                                </span>
                            )}
                            {filters.empresa && filters.empresa !== 'all' && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Empresa: {filters.empresa}
                                </span>
                            )}
                            {filters.funcao && filters.funcao !== 'all' && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    Função: {filters.funcao}
                                </span>
                            )}
                            {filters.checkedIn && filters.checkedIn !== 'all' && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                    Status: {getStatusLabel(filters.checkedIn)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default memo(OptimizedFilters)