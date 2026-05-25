import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, MapPin, Search } from 'lucide-react'
import { BRAZILIAN_CITIES } from '../../data/brazilianCities'

interface CityValue {
  city: string
  state: string
  cityIbgeCode: number | null
}

interface Props {
  value: CityValue
  onChange: (value: CityValue) => void
  error?: string
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

function rankCity(normalizedName: string, normalizedUf: string, needle: string): number {
  if (normalizedName === needle) return 0
  if (normalizedName.startsWith(needle)) return 1
  if (normalizedUf === needle) return 2
  if (normalizedName.includes(needle)) return 3
  return 4
}

export function CityCombobox({ value, onChange, error }: Props) {
  const [query, setQuery] = useState(value.city ? `${value.city} - ${value.state}` : '')
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isLocked = value.cityIbgeCode !== null

  useEffect(() => {
    setQuery(value.city ? `${value.city} - ${value.state}` : '')
  }, [value.city, value.state])

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  const options = useMemo(() => {
    const needle = normalize(query.trim())
    if (!needle) return BRAZILIAN_CITIES.slice(0, 80)

    // UF-only search: exactly 2 letters → filter by state
    const isUfOnly = /^[a-z]{2}$/.test(needle)

    const filtered = BRAZILIAN_CITIES.filter(city => {
      const n = normalize(city.name)
      const u = normalize(city.uf)
      if (isUfOnly) return u === needle
      return n.includes(needle) || u.includes(needle)
    })

    return filtered
      .sort((a, b) => {
        const ra = rankCity(normalize(a.name), normalize(a.uf), needle)
        const rb = rankCity(normalize(b.name), normalize(b.uf), needle)
        if (ra !== rb) return ra - rb
        return normalize(a.name).localeCompare(normalize(b.name))
      })
      .slice(0, 80)
  }, [query])

  function selectCity(city: typeof BRAZILIAN_CITIES[number]) {
    onChange({ city: city.name, state: city.uf, cityIbgeCode: city.ibgeCode })
    setQuery(`${city.name} - ${city.uf}`)
    setOpen(false)
    inputRef.current?.blur()
  }

  function handleBlur() {
    window.setTimeout(() => {
      if (value.city && query !== `${value.city} - ${value.state}`) {
        setQuery(`${value.city} - ${value.state}`)
      }
    }, 120)
  }

  return (
    <div className="field city-combobox" ref={rootRef}>
      <label>Cidade / UF</label>
      <div className={`city-combobox-input ${error ? 'has-error' : ''} ${isLocked ? 'is-locked' : ''}`}>
        {isLocked
          ? <Check size={14} className="city-combobox-icon city-combobox-icon--locked" />
          : <Search size={14} className="city-combobox-icon" />
        }
        <input
          ref={inputRef}
          value={query}
          onChange={event => {
            setQuery(event.target.value)
            setOpen(true)
            onChange({ city: '', state: '', cityIbgeCode: null })
          }}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          placeholder="Pesquise e selecione a cidade correta"
          autoComplete="off"
        />
        {isLocked && (
          <span className="city-combobox-lock-badge">{value.state}</span>
        )}
      </div>

      {isLocked && !error && (
        <p className="field-hint city-combobox-hint">
          <MapPin size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
          Cidade travada · IBGE {value.cityIbgeCode}
        </p>
      )}

      {open && !isLocked && (
        <div className="city-combobox-list">
          {options.length === 0 ? (
            <div className="city-combobox-empty">Nenhuma cidade encontrada</div>
          ) : (
            options.map(city => (
              <button
                key={city.ibgeCode}
                type="button"
                className="city-combobox-option"
                onMouseDown={event => event.preventDefault()}
                onClick={() => selectCity(city)}
              >
                <span>{city.name}</span>
                <strong>{city.uf}</strong>
              </button>
            ))
          )}
        </div>
      )}

      {error && <p className="field-error">{error}</p>}
    </div>
  )
}
