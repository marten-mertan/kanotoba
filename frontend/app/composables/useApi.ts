import { ofetch } from 'ofetch'
import type { FetchOptions } from 'ofetch'

/**
 * Options for requests to the external Kanotoba Worker API.
 * The base URL and development preview settings are configured centrally.
 */
export type ApiRequestOptions = Omit<FetchOptions<'json'>, 'baseURL'>

const PREVIEW_QUERY_PARAMETER = 'preview'
const PREVIEW_QUERY_VALUE = '1'
const PREVIEW_HEADER_NAME = 'X-Kanotoba-Preview-Key'

function withPreviewQuery(path: string, baseURL: string): string {
  const isAbsoluteUrl = /^[a-z][a-z\d+.-]*:/i.test(path)
  const url = new URL(path, `${baseURL}/`)

  url.searchParams.set(PREVIEW_QUERY_PARAMETER, PREVIEW_QUERY_VALUE)

  if (isAbsoluteUrl) {
    return url.toString()
  }

  return `${url.pathname}${url.search}${url.hash}`
}

export function useApi() {
  const runtimeConfig = useRuntimeConfig()
  const baseURL = String(runtimeConfig.public.apiUrl || '').trim().replace(/\/+$/, '')

  // Preview is deliberately available only while running the local Nuxt dev server.
  // The key is exposed to that browser session because the browser calls the Worker
  // directly. It must never be configured for a production build/deployment.
  const previewMode = import.meta.dev && runtimeConfig.public.previewMode === true
  const previewApiKey = String(runtimeConfig.public.previewApiKey || '').trim()

  const client = ofetch.create({
    baseURL,
    retry: 0,
    timeout: 15_000,
  })

  async function request<TResponse = unknown>(
    path: string,
    options: ApiRequestOptions = {},
  ): Promise<TResponse> {
    if (!baseURL) {
      throw new Error(
        'API_URL не задан. Создайте .env на основе .env.example и укажите адрес backend Worker.',
      )
    }

    const requestOptions: ApiRequestOptions = { ...options }
    let requestPath = path

    if (previewMode) {
      if (!previewApiKey) {
        throw new Error(
          'PREVIEW_MODE=true, но PREVIEW_API_KEY не задан. Укажите ключ Worker в локальном .env.',
        )
      }

      const headers = new Headers(requestOptions.headers)
      headers.set(PREVIEW_HEADER_NAME, previewApiKey)
      requestOptions.headers = headers
      requestPath = withPreviewQuery(path, baseURL)
    }

    return client<TResponse>(requestPath, requestOptions)
  }

  function get<TResponse = unknown>(
    path: string,
    options: Omit<ApiRequestOptions, 'method' | 'body'> = {},
  ): Promise<TResponse> {
    return request<TResponse>(path, {
      ...options,
      method: 'GET',
    })
  }

  return {
    request,
    get,
  }
}
