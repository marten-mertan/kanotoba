import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '~/composables/useApi'
import { API_ENDPOINTS } from '~/utils/api-endpoints'
import type { Status } from '~/types/store'

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Cannot load kanji from API.'
}

export const useKanjiItemStore = defineStore('kanjiItem', () => {
  const api = useApi()

  const item = ref<KanjiItemData>()
  const status = ref<Status>('idle')
  const error = ref<string | null>(null)

  async function fetchItem(kanjiId: string, force = false): Promise<void> {
    if (status.value === 'loading') {
      return
    }

    if (!force && status.value === 'success') {
      return
    }

    status.value = 'loading'
    error.value = null

    try {
      const payload = await api.get<KanjiItemData>(API_ENDPOINTS.kanjiItem(kanjiId))

      item.value = payload
      status.value = 'success'
    }
    catch (requestError) {
      status.value = 'error'
      error.value = getErrorMessage(requestError)
    }
  }

  return {
    item,
    status,
    error,
    fetchItem,
  }
})
