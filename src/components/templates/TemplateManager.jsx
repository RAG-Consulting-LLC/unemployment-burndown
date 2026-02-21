import { useState, useRef, useEffect } from 'react'

function SaveIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
      <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
    </svg>
  )
}

export default function TemplateManager({
  templates,
  activeTemplateId,
  onLoad,
  onSave,
  onSaveNew,
  onRename,
  onDelete,
}) {
  const [open, setOpen] = useState(false)
  // 'idle' | 'saving-new' | 'renaming:{id}'
  const [mode, setMode] = useState('idle')
  const [inputVal, setInputVal] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const dropdownRef = useRef(null)
  const inputRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
        setMode('idle')
        setConfirmDeleteId(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Auto-focus input when mode changes
  useEffect(() => {
    if ((mode === 'saving-new' || mode.startsWith('renaming:')) && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [mode])

  const activeTemplate = templates.find(t => t.id === activeTemplateId)

  function handleSaveClick() {
    if (activeTemplateId) {
      // Overwrite existing — flash confirmation
      onSave(activeTemplateId)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2000)
    } else {
      // No active template — open Save As flow
      setOpen(true)
      setMode('saving-new')
      setInputVal('My Config')
    }
  }

  function handleSaveNew() {
    const name = inputVal.trim()
    if (!name) return
    onSaveNew(name)
    setMode('idle')
    setInputVal('')
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2000)
  }

  function handleStartRename(id, currentName) {
    setMode(`renaming:${id}`)
    setInputVal(currentName)
  }

  function handleCommitRename(id) {
    if (inputVal.trim()) onRename(id, inputVal.trim())
    setMode('idle')
    setInputVal('')
  }

  function handleLoad(id) {
    onLoad(id)
    setOpen(false)
    setMode('idle')
  }

  function handleDelete(id) {
    if (confirmDeleteId === id) {
      onDelete(id)
      setConfirmDeleteId(null)
    } else {
      setConfirmDeleteId(id)
    }
  }

  function formatSavedAt(iso) {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  }

  return (
    <div className="flex items-center gap-2" ref={dropdownRef}>
      {/* Furlough badge */}
      <span className="hidden sm:inline text-xs bg-amber-900/60 text-amber-300 border border-amber-700/50 px-3 py-1 rounded-full font-medium">
        On Furlough
      </span>

      {/* Save button */}
      <button
        onClick={handleSaveClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          savedFlash
            ? 'bg-emerald-700 text-white border border-emerald-500'
            : activeTemplateId
            ? 'bg-blue-700 hover:bg-blue-600 text-white border border-blue-500'
            : 'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-500'
        }`}
        title={activeTemplateId ? `Save to "${activeTemplate?.name}"` : 'Save as new template'}
      >
        <SaveIcon />
        <span>{savedFlash ? 'Saved!' : activeTemplateId ? 'Save' : 'Save'}</span>
      </button>

      {/* Templates dropdown trigger */}
      <div className="relative">
        <button
          onClick={() => { setOpen(o => !o); setMode('idle'); setConfirmDeleteId(null) }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-500 transition-colors"
        >
          <span className="max-w-[100px] truncate">
            {activeTemplate ? activeTemplate.name : 'Templates'}
          </span>
          <ChevronDownIcon />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 w-72 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl z-50 overflow-hidden">

            {/* Save As new template */}
            {mode === 'saving-new' ? (
              <div className="p-3 border-b border-gray-700">
                <p className="text-xs text-gray-400 mb-2 font-medium">Save current config as:</p>
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveNew(); if (e.key === 'Escape') setMode('idle') }}
                    className="flex-1 bg-gray-700 border border-blue-500 rounded-lg px-2.5 py-1.5 text-white text-sm outline-none"
                    placeholder="Template name"
                  />
                  <button onClick={handleSaveNew} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 border-b border-gray-700">
                <button
                  onClick={() => { setMode('saving-new'); setInputVal('My Config') }}
                  className="w-full text-left text-sm text-blue-400 hover:text-blue-300 font-medium flex items-center gap-2 transition-colors"
                >
                  <span className="text-lg leading-none">+</span>
                  <span>Save current config as new template</span>
                </button>
              </div>
            )}

            {/* Template list */}
            <div className="max-h-72 overflow-y-auto">
              {templates.length === 0 ? (
                <p className="text-gray-600 text-xs text-center py-6 px-4">
                  No saved templates yet. Use "Save" to create one.
                </p>
              ) : (
                templates.map(t => (
                  <div
                    key={t.id}
                    className={`group flex items-center gap-2 px-3 py-2.5 border-b border-gray-700/50 last:border-0 transition-colors ${
                      t.id === activeTemplateId ? 'bg-blue-950/40' : 'hover:bg-gray-700/40'
                    }`}
                  >
                    {/* Load / rename inline */}
                    <div className="flex-1 min-w-0">
                      {mode === `renaming:${t.id}` ? (
                        <div className="flex gap-1.5">
                          <input
                            ref={inputRef}
                            type="text"
                            value={inputVal}
                            onChange={e => setInputVal(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleCommitRename(t.id); if (e.key === 'Escape') setMode('idle') }}
                            className="flex-1 bg-gray-700 border border-blue-500 rounded px-2 py-0.5 text-white text-sm outline-none"
                          />
                          <button onClick={() => handleCommitRename(t.id)} className="text-emerald-400 hover:text-emerald-300">
                            <CheckIcon />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleLoad(t.id)}
                          className="text-left w-full"
                        >
                          <p className={`text-sm font-medium truncate ${t.id === activeTemplateId ? 'text-blue-300' : 'text-white'}`}>
                            {t.id === activeTemplateId && <span className="text-blue-400 mr-1">●</span>}
                            {t.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">Saved {formatSavedAt(t.savedAt)}</p>
                        </button>
                      )}
                    </div>

                    {/* Action buttons */}
                    {mode !== `renaming:${t.id}` && (
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleStartRename(t.id, t.name)}
                          className="p-1 text-gray-500 hover:text-blue-400 rounded transition-colors"
                          title="Rename"
                        >
                          <PencilIcon />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className={`p-1 rounded transition-colors ${
                            confirmDeleteId === t.id
                              ? 'text-red-400 bg-red-950/40'
                              : 'text-gray-500 hover:text-red-400'
                          }`}
                          title={confirmDeleteId === t.id ? 'Click again to confirm delete' : 'Delete'}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
