import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '~/composables/useApi'
import { API_ENDPOINTS } from '~/utils/api-endpoints'

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Cannot load grammar from API.'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isGrammarItem(value: unknown): value is GrammarItemData {
  if (!isRecord(value)) return false

  const category = value.category

  return (
    typeof value.id === 'number'
    && typeof value.slug === 'string'
    && typeof value.pattern === 'string'
    && typeof value.reading === 'string'
    && typeof value.romaji === 'string'
    && typeof value.meaningEn === 'string'
    && typeof value.meaningRu === 'string'
    && typeof value.explanationEn === 'string'
    && typeof value.explanationRu === 'string'
    && typeof value.jlptLevel === 'string'
    && Array.isArray(value.register)
    && Array.isArray(value.tags)
    && Array.isArray(value.tagLabels)
    && isRecord(category)
    && typeof category.slug === 'string'
    && typeof category.nameEn === 'string'
    && typeof category.nameRu === 'string'
  )
}

function isGrammarCollection(
  value: unknown,
): value is GrammarCollectionResponse {
  if (!isRecord(value) || !isRecord(value.pagination)) {
    return false
  }

  const pagination = value.pagination

  return (
    Array.isArray(value.items)
    && value.items.every(isGrammarItem)
    && typeof pagination.limit === 'number'
    && typeof pagination.offset === 'number'
    && typeof pagination.returned === 'number'
  )
}

export const useGrammarStore = defineStore('grammar', () => {
  const api = useApi()

  const items = ref<GrammarItemData[]>([])
  const pagination = ref<Pagination | null>(null)
  const previewMode = ref(false)

  const status = ref<Status>('idle')
  const error = ref<string | null>(null)

  let requestId = 0

  function reset(): void {
    requestId++

    items.value = []
    pagination.value = null
    previewMode.value = false

    status.value = 'idle'
    error.value = null
  }

  async function fetchAll(force = false): Promise<void> {
    if (!force && status.value === 'loading') {
      return
    }

    if (!force && status.value === 'success') {
      return
    }

    const currentRequestId = ++requestId

    status.value = 'loading'
    error.value = null

    try {
      const payload = await api.get<unknown>(API_ENDPOINTS.grammar)

      if (currentRequestId !== requestId) {
        return
      }

      if (!isGrammarCollection(payload)) {
        throw new Error(
          `Unexpected response format from ${API_ENDPOINTS.grammar}. Expected items and pagination.`,
        )
      }

      items.value = payload.items
      pagination.value = payload.pagination
      previewMode.value = payload.previewMode ?? false

      status.value = 'success'
    }
    catch (requestError) {
      if (currentRequestId !== requestId) {
        return
      }

      items.value = []
      pagination.value = null
      previewMode.value = false

      status.value = 'error'
      error.value = getErrorMessage(requestError)
    }
  }

  return {
    items,
    pagination,
    previewMode,
    status,
    error,
    fetchAll,
    reset,
  }
})
