import { useCallback, useMemo, useState, useRef, useEffect, createElement } from 'react'
import type React from 'react'
import { FixedSizeList as List } from 'react-window'

export interface VirtualizedTableConfig<T> {
  data: T[]
  itemHeight: number
  containerHeight: number
  overscan?: number
  estimatedItemSize?: number
  renderItem?: (item: T, index: number) => React.ReactNode
}

export interface VirtualizedTableResult<T> {
  List: typeof List
  itemData: T[]
  itemCount: number
  renderRow: (props: { index: number; style: React.CSSProperties; data: T[] }) => React.ReactNode
  scrollToItem: (index: number) => void
  resetAfterIndex: (index: number) => void
}

export function useVirtualizedTable<T>({
  data,
  itemHeight,
  containerHeight,
  overscan = 10,
  estimatedItemSize,
  renderItem
}: VirtualizedTableConfig<T>): VirtualizedTableResult<T> {
  const listRef = useRef<List>(null)
  
  const scrollToItem = useCallback((index: number) => {
    if (listRef.current) {
      listRef.current.scrollToItem(index, 'center')
    }
  }, [])

  const resetAfterIndex = useCallback((index: number) => {
    if (listRef.current && 'resetAfterIndex' in listRef.current) {
      (listRef.current as { resetAfterIndex: (index: number) => void }).resetAfterIndex(index)
    }
  }, [])

  const renderRow = useCallback(({ index, style, data: itemData }: { index: number; style: React.CSSProperties; data: T[] }) => {
    const item = itemData[index]
    return createElement(
      'div',
      { style },
      renderItem ? renderItem(item, index) : String(item)
    )
  }, [renderItem])

  return {
    List,
    itemData: data,
    itemCount: data.length,
    renderRow,
    scrollToItem,
    resetAfterIndex
  }
}