import { useState, useCallback } from 'react'

const STORAGE_KEY = 'burndown_templates'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveToStorage(templates) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
  } catch {
    // localStorage full or unavailable — fail silently
  }
}

export function useTemplates() {
  const [templates, setTemplates] = useState(() => loadFromStorage())
  const [activeTemplateId, setActiveTemplateId] = useState(null)

  // Persist and update state together
  function persist(next) {
    setTemplates(next)
    saveToStorage(next)
  }

  // Save current app state as a new template
  const saveNew = useCallback((name, snapshot) => {
    const template = {
      id: Date.now(),
      name: name.trim() || 'Untitled',
      savedAt: new Date().toISOString(),
      snapshot,
    }
    const next = [template, ...templates]
    persist(next)
    setActiveTemplateId(template.id)
    return template
  }, [templates])

  // Overwrite an existing template's snapshot (keeping id, name)
  const overwrite = useCallback((id, snapshot) => {
    const next = templates.map(t =>
      t.id === id
        ? { ...t, snapshot, savedAt: new Date().toISOString() }
        : t
    )
    persist(next)
  }, [templates])

  // Rename a template
  const rename = useCallback((id, newName) => {
    const next = templates.map(t =>
      t.id === id ? { ...t, name: newName.trim() || t.name } : t
    )
    persist(next)
  }, [templates])

  // Delete a template
  const remove = useCallback((id) => {
    const next = templates.filter(t => t.id !== id)
    persist(next)
    if (activeTemplateId === id) setActiveTemplateId(null)
  }, [templates, activeTemplateId])

  // Get a template's snapshot by id
  const getSnapshot = useCallback((id) => {
    const t = templates.find(t => t.id === id)
    return t ? t.snapshot : null
  }, [templates])

  return {
    templates,
    activeTemplateId,
    setActiveTemplateId,
    saveNew,
    overwrite,
    rename,
    remove,
    getSnapshot,
  }
}
