import { useRef, useState, useCallback } from 'react'

/**
 * Drag-to-reorder hook for touch + mouse.
 * Returns props to spread onto each draggable item and the container.
 *
 * Usage:
 *   const { dragProps, containerProps, draggingIndex } = useDragReorder(items, onReorder)
 *   <div {...containerProps}>
 *     {items.map((item, idx) => (
 *       <div key={item.id} {...dragProps(idx)} style={draggingIndex === idx ? { opacity: 0.4 } : {}}>
 *         <div className="drag-handle" {...dragProps(idx).handleProps}>⠿</div>
 *         {content}
 *       </div>
 *     ))}
 *   </div>
 */
export function useDragReorder(items, onReorder) {
  const [draggingIndex, setDraggingIndex] = useState(null)
  const [overIndex, setOverIndex] = useState(null)

  const dragState = useRef({
    fromIndex: null,
    startY: 0,
    itemHeight: 0,
    containerTop: 0,
    rects: [],
  })

  const containerRef = useRef(null)

  // ── Get current item positions ──────────────────────────────
  const measureItems = useCallback(() => {
    if (!containerRef.current) return []
    const children = [...containerRef.current.children]
    return children.map(el => {
      const rect = el.getBoundingClientRect()
      return { top: rect.top, bottom: rect.bottom, mid: rect.top + rect.height / 2, height: rect.height }
    })
  }, [])

  // ── Find which index the pointer is hovering ────────────────
  const getOverIndex = useCallback((clientY) => {
    const rects = dragState.current.rects
    for (let i = 0; i < rects.length; i++) {
      if (clientY < rects[i].mid) return i
    }
    return rects.length - 1
  }, [])

  // ── Drag start (touch or mouse) ─────────────────────────────
  const startDrag = useCallback((idx, clientY) => {
    dragState.current.fromIndex = idx
    dragState.current.startY = clientY
    dragState.current.rects = measureItems()
    setDraggingIndex(idx)
    setOverIndex(idx)
  }, [measureItems])

  // ── Drag move ───────────────────────────────────────────────
  const moveDrag = useCallback((clientY) => {
    if (dragState.current.fromIndex === null) return
    const over = getOverIndex(clientY)
    setOverIndex(over)
  }, [getOverIndex])

  // ── Drag end ────────────────────────────────────────────────
  const endDrag = useCallback(() => {
    const { fromIndex } = dragState.current
    if (fromIndex !== null && overIndex !== null && overIndex !== fromIndex) {
      onReorder(fromIndex, overIndex)
    }
    dragState.current.fromIndex = null
    setDraggingIndex(null)
    setOverIndex(null)
  }, [overIndex, onReorder])

  // ── Container props (touch events bubble up here) ───────────
  const containerProps = {
    ref: containerRef,
    onTouchMove: useCallback((e) => {
      if (dragState.current.fromIndex === null) return
      e.preventDefault() // prevent scroll while dragging
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

  // ── Per-item handle props ───────────────────────────────────
  const handleProps = useCallback((idx) => ({
    onTouchStart: (e) => {
      e.stopPropagation()
      startDrag(idx, e.touches[0].clientY)
    },
    onMouseDown: (e) => {
      e.preventDefault()
      e.stopPropagation()
      startDrag(idx, e.clientY)
    },
    style: { cursor: 'grab', touchAction: 'none' },
  }), [startDrag])

  // ── Per-item wrapper props ──────────────────────────────────
  const itemProps = useCallback((idx) => {
    const isDragging = draggingIndex === idx
    const isOver = overIndex === idx && draggingIndex !== null && draggingIndex !== idx
    return {
      'data-drag-idx': idx,
      style: {
        opacity: isDragging ? 0.4 : 1,
        transform: isOver
          ? draggingIndex < idx ? 'translateY(4px)' : 'translateY(-4px)'
          : 'translateY(0)',
        transition: isDragging ? 'none' : 'transform 0.15s ease, opacity 0.15s ease',
        position: 'relative',
        zIndex: isDragging ? 10 : 1,
      },
    }
  }, [draggingIndex, overIndex])

  return { containerProps, handleProps, itemProps, draggingIndex, overIndex }
}
