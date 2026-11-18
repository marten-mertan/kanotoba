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

  const item = ref<KanjiItemData | null>(null)
  const status = ref<Status>('idle')
  const error = ref<string | null>(null)

  let activeKanjiId: string | null = null
  let requestId = 0

  function resetItem(): void {
    requestId++
    activeKanjiId = null

    item.value = null
    status.value = 'idle'
    error.value = null
  }

  async function fetchItem(
    kanjiId: string,
    force = false,
  ): Promise<void> {
    if (!kanjiId) {
      resetItem()
      return
    }

    const isSameKanji = activeKanjiId === kanjiId

    if (
      !force
      && isSameKanji
      && (status.value === 'loading' || status.value === 'success')
    ) {
      return
    }

    const currentRequestId = ++requestId

    activeKanjiId = kanjiId
    item.value = null
    status.value = 'loading'
    error.value = null

    try {
      const payload = await api.get<KanjiItemData>(
        API_ENDPOINTS.kanjiItem(kanjiId),
      )

      if (currentRequestId !== requestId) return

      item.value = payload
      status.value = 'success'
    }
    catch (requestError) {
      if (currentRequestId !== requestId) return

      item.value = null
      status.value = 'error'
      error.value = getErrorMessage(requestError)
    }
  }

  return {
    item,
    status,
    error,
    fetchItem,
    resetItem,
  }
})
