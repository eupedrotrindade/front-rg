import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { EventParticipant } from '@/features/eventos/types'
import { Check, ChevronDown, Filter, X } from 'lucide-react'
import React, { memo, useCallback, useMemo } from 'react'

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
    empresas: Map<
      string,
      { total: number; checkedIn: number; checkedOut: number }
    >
    funcoes: Map<
      string,
      { total: number; checkedIn: number; checkedOut: number }
    >
    statusCounts: {
      checkedIn: number
      checkedOut: number
      notCheckedIn: number
    }
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
          {triggerCount !== undefined
            ? `${triggerText} (${triggerCount})`
            : triggerText}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={`${
          type === 'empresa'
            ? 'w-[300px]'
            : type === 'funcao'
            ? 'w-[280px]'
            : 'w-[260px]'
        } p-0 bg-white`}
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
    className="hover:bg-gray-100 hover:cursor-pointer"
  >
    <Check
      className={`mr-2 h-4 w-4 ${isSelected ? 'opacity-100' : 'opacity-0'}`}
    />
    <div className="flex-1">
      <div className="font-medium">{title}</div>
      {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
    </div>
    {count !== undefined && (
      <span className="text-xs text-gray-400">({count})</span>
    )}
  </CommandItem>
))

CommandItemMemo.displayName = 'CommandItemMemo'

// Componente de resumo de filtros memoizado
const FilterSummary = memo<{
  filteredCount: number
  totalCount: number
  isFilteringInProgress: boolean
  filters: {
    searchTerm: string
    empresa: string
    funcao: string
    checkedIn: string
  }
  getStatusLabel: (status: string) => string
}>(
  ({
    filteredCount,
    totalCount,
    isFilteringInProgress,
    filters,
    getStatusLabel,
  }) => (
    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">
            Filtros aplicados: {filteredCount} de {totalCount} participantes
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
  ),
)

FilterSummary.displayName = 'FilterSummary'

// Componente otimizado para lista de empresas
const EmpresasList = memo<{
  uniqueEmpresas: string[]
  dayStats: {
    empresas: Map<
      string,
      { total: number; checkedIn: number; checkedOut: number }
    >
  }
  selectedEmpresa: string
  onSelectAll: () => void
  onSelectEmpresa: (value: string) => void
  totalCount: number
}>(
  ({
    uniqueEmpresas,
    dayStats,
    selectedEmpresa,
    onSelectAll,
    onSelectEmpresa,
    totalCount,
  }) => (
    <>
      <CommandItemMemo
        value="all"
        isSelected={selectedEmpresa === 'all'}
        onSelect={onSelectAll}
        title={`Todas as empresas (${totalCount})`}
      />
      {uniqueEmpresas.map(empresa => {
        const empresaData = dayStats.empresas.get(empresa)!
        return (
          <CommandItemMemo
            key={empresa}
            value={empresa}
            isSelected={selectedEmpresa === empresa}
            onSelect={onSelectEmpresa}
            title={empresa}
            subtitle={`${empresaData.total} pessoas • ${empresaData.checkedIn} check-in • ${empresaData.checkedOut} check-out`}
          />
        )
      })}
    </>
  ),
)

EmpresasList.displayName = 'EmpresasList'

// Componente otimizado para lista de funções
const FuncoesList = memo<{
  uniqueFuncoes: string[]
  dayStats: {
    funcoes: Map<
      string,
      { total: number; checkedIn: number; checkedOut: number }
    >
  }
  selectedFuncao: string
  onSelectAll: () => void
  onSelectFuncao: (value: string) => void
  totalCount: number
}>(
  ({
    uniqueFuncoes,
    dayStats,
    selectedFuncao,
    onSelectAll,
    onSelectFuncao,
    totalCount,
  }) => (
    <>
      <CommandItemMemo
        value="all"
        isSelected={selectedFuncao === 'all'}
        onSelect={onSelectAll}
        title={`Todas as funções (${totalCount})`}
      />
      {uniqueFuncoes.map(funcao => {
        const funcaoData = dayStats.funcoes.get(funcao)!
        return (
          <CommandItemMemo
            key={funcao}
            value={funcao}
            isSelected={selectedFuncao === funcao}
            onSelect={onSelectFuncao}
            title={funcao}
            subtitle={`${funcaoData.total} pessoas • ${funcaoData.checkedIn} check-in • ${funcaoData.checkedOut} check-out`}
          />
        )
      })}
    </>
  ),
)

FuncoesList.displayName = 'FuncoesList'

/**
 * OTIMIZAÇÕES APLICADAS PARA RESOLVER TRAVADAS:
 *
 * ✅ 1. Memoização de funções (useMemo/useCallback)
 * ✅ 2. Lazy rendering - popovers só renderizam quando abertos
 * ✅ 3. Arrays estáticos memoizados (statusOptions)
 * ✅ 4. Callbacks memoizados para evitar re-renders
 * ✅ 5. className dinâmico corrigido para Tailwind
 * ✅ 6. Componentes de lista memoizados (EmpresasList, FuncoesList)
 * ✅ 7. FilterSummary memoizado
 * ✅ 8. Callbacks de popover memoizados
 * ✅ 9. TriggerTexts memoizados para evitar recálculos
 * ✅ 10. Background do container adicionado
 */
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
  onSetPopoverState,
}) => {
  // Memoizar arrays estáticos para evitar recriações
  const statusOptions = useMemo(
    () => ['checked-in', 'checked-out', 'not-checked-in'],
    [],
  )

  // Memoizar função de labels para evitar recriação
  const getStatusLabel = useCallback((status: string) => {
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
  }, [])

  // Memoizar textos dos triggers para evitar recálculos
  const triggerTexts = useMemo(
    () => ({
      empresa:
        filters.empresa === 'all'
          ? `Empresa (${uniqueEmpresas.length})`
          : `${filters.empresa} (${
              dayStats.empresas.get(filters.empresa)?.total || 0
            })`,
      funcao:
        filters.funcao === 'all'
          ? `Função (${uniqueFuncoes.length})`
          : `${filters.funcao} (${
              dayStats.funcoes.get(filters.funcao)?.total || 0
            })`,
      status: (() => {
        if (filters.checkedIn === 'all') return 'Status Check-in'
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
      })(),
    }),
    [
      filters.empresa,
      filters.funcao,
      filters.checkedIn,
      uniqueEmpresas.length,
      uniqueFuncoes.length,
      dayStats,
    ],
  )

  // Memoizar callbacks para evitar re-renders
  const handleEmpresaSelect = useCallback(
    (value: string) => {
      onUpdateFilter('empresa', value === filters.empresa ? 'all' : value)
      onSetPopoverState('empresa', false)
    },
    [onUpdateFilter, onSetPopoverState, filters.empresa],
  )

  const handleFuncaoSelect = useCallback(
    (value: string) => {
      onUpdateFilter('funcao', value === filters.funcao ? 'all' : value)
      onSetPopoverState('funcao', false)
    },
    [onUpdateFilter, onSetPopoverState, filters.funcao],
  )

  const handleStatusSelect = useCallback(
    (status: string) => {
      onUpdateFilter('checkedIn', status)
      onSetPopoverState('status', false)
    },
    [onUpdateFilter, onSetPopoverState],
  )

  const handleEmpresaClearAll = useCallback(() => {
    onUpdateFilter('empresa', 'all')
    onSetPopoverState('empresa', false)
  }, [onUpdateFilter, onSetPopoverState])

  const handleFuncaoClearAll = useCallback(() => {
    onUpdateFilter('funcao', 'all')
    onSetPopoverState('funcao', false)
  }, [onUpdateFilter, onSetPopoverState])

  // Memoizar callbacks de popover para evitar re-renders
  const handleEmpresaPopover = useCallback(
    (open: boolean) => onSetPopoverState('empresa', open),
    [onSetPopoverState],
  )
  const handleFuncaoPopover = useCallback(
    (open: boolean) => onSetPopoverState('funcao', open),
    [onSetPopoverState],
  )
  const handleStatusPopover = useCallback(
    (open: boolean) => onSetPopoverState('status', open),
    [onSetPopoverState],
  )

  return (
    <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Filtros */}
        <div className="flex flex-wrap gap-3 w-full">
          {/* Filtro por Empresa */}
          <FilterPopover
            type="empresa"
            isOpen={popoverStates.empresa}
            onOpenChange={handleEmpresaPopover}
            triggerText={triggerTexts.empresa}
          >
            {popoverStates.empresa && (
              <Command>
                <CommandInput placeholder="Procurar empresa..." />
                <CommandEmpty>Empresa não encontrada.</CommandEmpty>
                <CommandList>
                  <CommandGroup>
                    <EmpresasList
                      uniqueEmpresas={uniqueEmpresas}
                      dayStats={dayStats}
                      selectedEmpresa={filters.empresa}
                      onSelectAll={handleEmpresaClearAll}
                      onSelectEmpresa={handleEmpresaSelect}
                      totalCount={participantesDoDia.length}
                    />
                  </CommandGroup>
                </CommandList>
              </Command>
            )}
          </FilterPopover>

          {/* Filtro por Função */}
          <FilterPopover
            type="funcao"
            isOpen={popoverStates.funcao}
            onOpenChange={handleFuncaoPopover}
            triggerText={triggerTexts.funcao}
          >
            {popoverStates.funcao && (
              <Command>
                <CommandInput placeholder="Procurar função..." />
                <CommandEmpty>Função não encontrada.</CommandEmpty>
                <CommandList>
                  <CommandGroup>
                    <FuncoesList
                      uniqueFuncoes={uniqueFuncoes}
                      dayStats={dayStats}
                      selectedFuncao={filters.funcao}
                      onSelectAll={handleFuncaoClearAll}
                      onSelectFuncao={handleFuncaoSelect}
                      totalCount={participantesDoDia.length}
                    />
                  </CommandGroup>
                </CommandList>
              </Command>
            )}
          </FilterPopover>

          {/* Filtro por Status Check-in */}
          <FilterPopover
            type="status"
            isOpen={popoverStates.status}
            onOpenChange={handleStatusPopover}
            triggerText={triggerTexts.status}
          >
            {popoverStates.status && (
              <Command>
                <CommandList>
                  <CommandGroup>
                    <CommandItemMemo
                      value="all"
                      isSelected={filters.checkedIn === 'all'}
                      onSelect={() => handleStatusSelect('all')}
                      title={`Todos os status (${participantesDoDia.length})`}
                    />
                    {statusOptions.map(status => (
                      <CommandItemMemo
                        key={status}
                        value={status}
                        isSelected={filters.checkedIn === status}
                        onSelect={() => handleStatusSelect(status)}
                        title={`${
                          status === 'checked-in'
                            ? '✅'
                            : status === 'checked-out'
                            ? '🔴'
                            : '⏳'
                        } ${getStatusLabel(status)}`}
                        count={
                          status === 'checked-in'
                            ? dayStats.statusCounts.checkedIn
                            : status === 'checked-out'
                            ? dayStats.statusCounts.checkedOut
                            : dayStats.statusCounts.notCheckedIn
                        }
                      />
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            )}
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

      {/* Resumo dos filtros aplicados - Memoizado */}
      {hasActiveFilters && (
        <FilterSummary
          filteredCount={filteredParticipants.length}
          totalCount={participantesDoDia.length}
          isFilteringInProgress={isFilteringInProgress}
          filters={filters}
          getStatusLabel={getStatusLabel}
        />
      )}
    </div>
  )
}

export default memo(OptimizedFilters)
