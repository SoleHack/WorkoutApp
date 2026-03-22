import { useRef, useState, useCallback } from 'react'

export function useDragReorder(items, onReorder) {
  const [draggingIndex, setDraggingIndex] = useState(null)
  const [overIndex, setOverIndex] = useState(null)

  const dragState = useRef({ fromIndex: null, rects: [] })
  const containerRef = useRef(null)

  const measureItems = useCallback(() => {
    if (!containerRef.current) return []
    return [...containerRef.current.children].map(el => {
      const r = el.getBoundingClientRect()
      return { top: r.top, mid: r.top + r.height / 2 }
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
    dragState.current.rects = measureItems()
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

  const containerProps = {
    ref: containerRef,
    onTouchMove: useCallback((e) => {
      if (dragState.current.fromIndex === null) return
      e.preventDefault()
      moveDrag(e.touches[0].clientY)
    }, [moveDrag]),
    onTouchEnd: endDrag,
    onTouchCancel: endDrag,
    onMouseMove: useCallback((e) => {
      if (dragState.current.fromIndex === null) return
      moveDrag(e.clientY)
    }, [moveDrag]),
    onMouseUp: endDrag,
    onMouseLeave: endDrag,
    style: { userSelect: 'none' },
  }

  const handleProps = useCallback((idx) => ({
    onTouchStart: (e) => { e.stopPropagation(); startDrag(idx, e.touches[0].clientY) },
    onMouseDown: (e) => { e.preventDefault(); e.stopPropagation(); startDrag(idx, e.clientY) },
    style: { cursor: draggingIndex === idx ? 'grabbing' : 'grab', touchAction: 'none' },
  }), [startDrag, draggingIndex])

  // Each item gets: opacity when dragging, and an insertion line above/below
  const itemProps = useCallback((idx) => {
    const isDragging = draggingIndex === idx
    const isActive = draggingIndex !== null && draggingIndex !== idx

    // Show line ABOVE this item when dragging item would land here
    // and the dragged item is coming from below
    const showLineAbove = isActive && overIndex === idx && draggingIndex > idx
    // Show line BELOW this item when it's the last target
    const showLineBelow = isActive && overIndex === idx && draggingIndex < idx

    return {
      'data-drag-idx': idx,
      'data-show-line-above': showLineAbove || undefined,
      'data-show-line-below': showLineBelow || undefined,
      style: {
        opacity: isDragging ? 0.35 : 1,
        transition: isDragging ? 'none' : 'opacity 0.15s ease',
        position: 'relative',
      },
    }
  }, [draggingIndex, overIndex])

  return { containerProps, handleProps, itemProps, draggingIndex, overIndex }
}
