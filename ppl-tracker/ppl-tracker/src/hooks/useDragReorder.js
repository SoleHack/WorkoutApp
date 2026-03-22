import { useRef, useState, useCallback } from 'react'

export function useDragReorder(items, onReorder) {
  const [draggingIndex, setDraggingIndex] = useState(null)
  const [overIndex, setOverIndex]         = useState(null)

  const dragState = useRef({ fromIndex: null, rects: [] })
  const containerRef = useRef(null)

  const measureItems = useCallback(() => {
    if (!containerRef.current) return []
    return [...containerRef.current.children].map(el => {
      const r = el.getBoundingClientRect()
      return { top: r.top, bottom: r.bottom, mid: r.top + r.height / 2, height: r.height }
    })
  }, [])

  const getOverIndex = useCallback((clientY) => {
    const rects = dragState.current.rects
    for (let i = 0; i < rects.length; i++) {
      if (clientY < rects[i].mid) return i
    }
    return rects.length - 1
  }, [])

  const startDrag = useCallback((idx, clientY) => {
    dragState.current.fromIndex = idx
    dragState.current.rects     = measureItems()
    setDraggingIndex(idx)
    setOverIndex(idx)
  }, [measureItems])

  const moveDrag = useCallback((clientY) => {
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

  // ── Container ───────────────────────────────────────────────
  const containerProps = {
    ref: containerRef,
    onTouchMove: useCallback((e) => {
      if (dragState.current.fromIndex === null) return
      e.preventDefault()
      moveDrag(e.touches[0].clientY)
    }, [moveDrag]),
    onTouchEnd:   endDrag,
    onTouchCancel: endDrag,
    onMouseMove: useCallback((e) => {
      if (dragState.current.fromIndex === null) return
      moveDrag(e.clientY)
    }, [moveDrag]),
    onMouseUp:    endDrag,
    onMouseLeave: endDrag,
    style: { userSelect: 'none' },
  }

  // ── Handle (the ⠿ grip) ─────────────────────────────────────
  const handleProps = useCallback((idx) => ({
    onTouchStart: (e) => { e.stopPropagation(); startDrag(idx, e.touches[0].clientY) },
    onMouseDown:  (e) => { e.preventDefault();  e.stopPropagation(); startDrag(idx, e.clientY) },
    style: { cursor: draggingIndex === idx ? 'grabbing' : 'grab', touchAction: 'none' },
  }), [startDrag, draggingIndex])

  // ── Per-item transform ──────────────────────────────────────
  //
  // Logic: imagine removing the dragged card and re-inserting it at overIndex.
  // Every card that needs to shift to make room gets translateY by ±draggedHeight.
  //
  // from=2, over=5 → cards 3,4,5 shift UP   by draggedHeight
  // from=5, over=2 → cards 2,3,4 shift DOWN by draggedHeight
  //
  const itemProps = useCallback((idx) => {
    const isDragging = draggingIndex === idx
    const isActive   = draggingIndex !== null

    let translateY = 0

    if (isActive && !isDragging && overIndex !== null && overIndex !== draggingIndex) {
      const rects       = dragState.current.rects
      const draggedH    = rects[draggingIndex]?.height ?? 60
      const gap         = 8 // matches .exList gap

      const draggingDown = draggingIndex < overIndex
      const draggingUp   = draggingIndex > overIndex

      if (draggingDown && idx > draggingIndex && idx <= overIndex) {
        // Cards between from→over shift UP to fill the dragged card's vacated spot
        translateY = -(draggedH + gap)
      } else if (draggingUp && idx < draggingIndex && idx >= overIndex) {
        // Cards between over→from shift DOWN
        translateY = (draggedH + gap)
      }
    }

    return {
      style: {
        opacity:    isDragging ? 0.35 : 1,
        transform:  `translateY(${translateY}px)`,
        transition: isDragging ? 'opacity 0.1s ease' : 'transform 0.18s cubic-bezier(0.25,0.8,0.25,1), opacity 0.15s ease',
        position:   'relative',
        zIndex:     isDragging ? 10 : 1,
      },
    }
  }, [draggingIndex, overIndex])

  return { containerProps, handleProps, itemProps, draggingIndex, overIndex }
}
