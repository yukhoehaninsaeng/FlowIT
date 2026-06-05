'use client'

import { useRef, useState } from 'react'
import { Search, X, Loader2 } from 'lucide-react'

interface SearchInputProps<T> {
  value: string
  onInputChange: (text: string) => void
  onSelect: (item: T) => void
  fetchOptions: (query: string) => Promise<T[]>
  renderOption: (item: T) => React.ReactNode
  placeholder?: string
  className?: string
}

export function SearchInput<T>({
  value,
  onInputChange,
  onSelect,
  fetchOptions,
  renderOption,
  placeholder = '검색...',
  className = '',
}: SearchInputProps<T>) {
  const [options, setOptions] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const containerRef = useRef<HTMLDivElement>(null)

  function handleType(text: string) {
    onInputChange(text)
    clearTimeout(debounceRef.current)
    if (!text.trim()) {
      setOptions([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const results = await fetchOptions(text)
        setOptions(results)
        setOpen(results.length > 0)
      } catch {
        setOptions([])
        setOpen(false)
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  function handleSelect(item: T) {
    onSelect(item)
    setOpen(false)
    setOptions([])
  }

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onBlur={e => {
        if (!containerRef.current?.contains(e.relatedTarget as Node)) {
          setOpen(false)
        }
      }}
    >
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          value={value}
          onChange={e => handleType(e.target.value)}
          onFocus={() => options.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full pl-8 pr-7 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {loading ? (
          <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
        ) : value ? (
          <button
            type="button"
            onMouseDown={e => {
              e.preventDefault()
              onInputChange('')
              setOptions([])
              setOpen(false)
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
          >
            <X size={13} />
          </button>
        ) : null}
      </div>
      {open && options.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-52 overflow-y-auto">
          {options.map((item, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={e => {
                e.preventDefault()
                handleSelect(item)
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-gray-50 last:border-0"
            >
              {renderOption(item)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
