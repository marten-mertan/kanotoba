import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '~/composables/useApi'
import { API_ENDPOINTS } from '~/utils/api-endpoints'
import { extractCollection } from '~/utils/extract-collection'
import type { StoreStatus } from '~/types/store'

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Не удалось загрузить грамматику из API.'
}

export const useGrammarStore = defineStore('grammar', () => {
  const api = useApi()

  const items = ref<unknown[]>([])
  const status = ref<StoreStatus>('idle')
  const error = ref<string | null>(null)

  async function fetchAll(force = false): Promise<void> {
    if (status.value === 'loading') {
      return
    }

    if (!force && status.value === 'success') {
      return
    }

    status.value = 'loading'
    error.value = null

    try {
      const payload = await api.get<unknown>(API_ENDPOINTS.grammar)
      const collection = extractCollection<unknown>(payload, 'grammar')

      if (collection === null) {
        throw new Error(`Unexpected response format from ${API_ENDPOINTS.grammar}. Expected an array of records.`)
      }

      items.value = collection
      status.value = 'success'
    }
    catch (requestError) {
      status.value = 'error'
      error.value = getErrorMessage(requestError)
    }
  }

  return {
    items,
    status,
    error,
    fetchAll,
  }
})
