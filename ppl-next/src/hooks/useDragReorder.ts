'use client'
import { useRef, useState, useCallback, RefObject } from 'react'

export function useDragReorder(items: any[], onReorder: (from: number, to: number) => void) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex]         = useState<number | null>(null)

  const dragState = useRef<{ fromIndex: number | null; rects: any[] }>({ fromIndex: null, rects: [] })
  const containerRef = useRef<HTMLDivElement>(null)

  const measureItems = useCallback(() => {
    if (!containerRef.current) return []
    return [...containerRef.current.children].map(el => {
      const r = el.getBoundingClientRect()
      return { top: r.top, bottom: r.bottom, mid: r.top + r.height / 2, height: r.height }
    })
  }, [])

  const getOverIndex = useCallback((clientY: number) => {
    const rects = dragState.current.rects
    for (let i = 0; i < rects.length; i++) {
      if (clientY < rects[i].mid) return i
    }
    return rects.length - 1
  }, [])

  const startDrag = useCallback((idx: number, clientY: number) => {
    dragState.current.fromIndex = idx
    dragState.current.rects     = measureItems()
    setDraggingIndex(idx)
    setOverIndex(idx)
  }, [measureItems])

  const moveDrag = useCallback((clientY: number) => {
    if (dragState.current.fromIndex === null) return
    setOverIndex(getOverIndex(clientY))
  }, [getOverIndex])

  const endDrag = useCallback(() => {
    const { fromIndex } = dragState.current
    if (fromIndex !== null && overIndex !== null && overIndex !== fromIndex) {
      onReorder(fromIndex, overIndex)
    }
    dragState.current.fromIndex = null
    setDraggingIndex(null)
    setOverIndex(null)
  }, [overIndex, onReorder])

  const containerProps = {
    ref: containerRef as RefObject<HTMLDivElement>,
    onTouchMove: useCallback((e: React.TouchEvent) => {
      if (dragState.current.fromIndex === null) return
      e.preventDefault()
      moveDrag(e.touches[0].clientY)
    }, [moveDrag]),
    onTouchEnd:    endDrag,
    onTouchCancel: endDrag,
    onMouseMove: useCallback((e: React.MouseEvent) => {
      if (dragState.current.fromIndex === null) return
      moveDrag(e.clientY)
    }, [moveDrag]),
    onMouseUp:    endDrag,
    onMouseLeave: endDrag,
    style: { userSelect: 'none' as const },
  }

  const handleProps = useCallback((idx: number) => ({
    onTouchStart: (e: React.TouchEvent) => { e.stopPropagation(); startDrag(idx, e.touches[0].clientY) },
    onMouseDown:  (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); startDrag(idx, e.clientY) },
    style: { cursor: draggingIndex === idx ? 'grabbing' : 'grab', touchAction: 'none' as const },
  }), [startDrag, draggingIndex])

  const itemProps = useCallback((idx: number) => {
    const isDragging = draggingIndex === idx
    const isActive   = draggingIndex !== null
    let translateY = 0

    if (isActive && !isDragging && overIndex !== null && overIndex !== draggingIndex) {
      const rects    = dragState.current.rects
      const draggedH = rects[draggingIndex!]?.height ?? 60
      const gap      = 8

      const draggingDown = draggingIndex! < overIndex
      const draggingUp   = draggingIndex! > overIndex

      if (draggingDown && idx > draggingIndex! && idx <= overIndex) {
        translateY = -(draggedH + gap)
      } else if (draggingUp && idx < draggingIndex! && idx >= overIndex) {
        translateY = (draggedH + gap)
      }
    }

    return {
      style: {
        opacity:    isDragging ? 0.35 : 1,
        transform:  `translateY(${translateY}px)`,
        transition: isDragging ? 'opacity 0.1s ease' : 'transform 0.18s cubic-bezier(0.25,0.8,0.25,1), opacity 0.15s ease',
        position:   'relative' as const,
        zIndex:     isDragging ? 10 : 1,
      },
    }
  }, [draggingIndex, overIndex])

  return { containerProps, handleProps, itemProps, draggingIndex, overIndex }
}
