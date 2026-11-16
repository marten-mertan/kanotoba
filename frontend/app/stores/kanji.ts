import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '~/composables/useApi'
import { API_ENDPOINTS } from '~/utils/api-endpoints'
import { extractCollection } from '~/utils/extract-collection'
import type { Status } from '~/types/store'

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Cannot load kanji from API.'
}

export const useKanjiStore = defineStore('kanji', () => {
  const api = useApi()

  const items = ref<KanjiData[]>([])
  const status = ref<Status>('idle')
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
      const payload = await api.get<unknown>(API_ENDPOINTS.kanji)
      const collection = extractCollection<KanjiData>(payload, 'kanji')

      if (collection === null) {
        throw new Error(`Unexpected response format from ${API_ENDPOINTS.kanji}. Expected an array of records.`)
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
