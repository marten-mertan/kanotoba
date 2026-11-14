import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Shared API data for the Kanji and Grammar sections.
 * The item types will be defined when the frontend is connected to the API
 * response contracts. Until then, keep the payloads as unknown.
 */
export const useContentStore = defineStore('content', () => {
  const kanji = ref<unknown[]>([])
  const grammar = ref<unknown[]>([])

  const kanjiLoaded = ref(false)
  const grammarLoaded = ref(false)

  function setKanji(items: unknown[]) {
    kanji.value = items
    kanjiLoaded.value = true
  }

  function setGrammar(items: unknown[]) {
    grammar.value = items
    grammarLoaded.value = true
  }

  return {
    kanji,
    grammar,
    kanjiLoaded,
    grammarLoaded,
    setKanji,
    setGrammar,
  }
})
