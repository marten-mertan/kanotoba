type JsonObject = Record<string, unknown>

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Extracts a collection from either a raw array or a common API response
 * envelope, for example { items: [] }, { data: [] }, or { data: { items: [] } }.
 * This helper only normalizes collection responses; it has no HTTP/domain logic.
 */
export function extractCollection<T>(payload: unknown, resourceKey?: string): T[] | null {
  if (Array.isArray(payload)) {
    return payload as T[]
  }

  if (!isJsonObject(payload)) {
    return null
  }

  const keys = [resourceKey, 'items', 'results', 'data'].filter(
    (key): key is string => Boolean(key),
  )

  for (const key of keys) {
    const collection = extractCollection<T>(payload[key], resourceKey)

    if (collection !== null) {
      return collection
    }
  }

  return null
}
