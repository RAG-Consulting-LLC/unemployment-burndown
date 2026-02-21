import { useRef, useState } from 'react'

/**
 * useDragReorder — native HTML5 drag-and-drop reordering for any list.
 *
 * Usage:
 *   const { dragHandleProps, getItemProps, isDragging } = useDragReorder(items, setItems)
 *
 *   Spread `getItemProps(item.id)` onto each list row container.
 *   Spread `dragHandleProps(item.id)` onto the drag handle element inside the row.
 */
export function useDragReorder(items, setItems) {
  const dragId = useRef(null)   // id of item being dragged
  const overId = useRef(null)   // id of item currently hovered over
  const [draggingId, setDraggingId] = useState(null)
  const [overedId, setOveredId] = useState(null)

  function reorder(fromId, toId) {
    if (fromId === toId) return
    const fromIdx = items.findIndex(i => i.id === fromId)
    const toIdx   = items.findIndex(i => i.id === toId)
    if (fromIdx === -1 || toIdx === -1) return
    const next = [...items]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    setItems(next)
  }

  // Props spread onto the ⠿ drag handle element
  function dragHandleProps(id) {
    return {
      draggable: true,
      onDragStart(e) {
        dragId.current = id
        setDraggingId(id)
        // Required for Firefox
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', String(id))
      },
      onDragEnd() {
        dragId.current = null
        overId.current = null
        setDraggingId(null)
        setOveredId(null)
      },
      style: { cursor: 'grab' },
    }
  }

  // Props spread onto each full row container div
  function getItemProps(id) {
    return {
      onDragOver(e) {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        if (overId.current !== id) {
          overId.current = id
          setOveredId(id)
        }
      },
      onDrop(e) {
        e.preventDefault()
        const fromId = dragId.current
        if (fromId != null && fromId !== id) {
          reorder(fromId, id)
        }
        dragId.current = null
        overId.current = null
        setDraggingId(null)
        setOveredId(null)
      },
    }
  }

  return { dragHandleProps, getItemProps, draggingId, overedId }
}
