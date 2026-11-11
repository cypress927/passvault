import type { Item } from './model'

/** Matches name, description, field keys, text values and attachment names. */
export function matchesQuery(item: Item, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  if (item.name.toLowerCase().includes(needle)) return true
  if (item.description.toLowerCase().includes(needle)) return true
  return item.fields.some((field) => {
    if (field.key.toLowerCase().includes(needle)) return true
    if (field.value.kind !== 'file') return field.value.text.toLowerCase().includes(needle)
    return field.value.filename.toLowerCase().includes(needle)
  })
}
