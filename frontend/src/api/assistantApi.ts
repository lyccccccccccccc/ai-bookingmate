import { apiClient } from './apiClient'

export type AssistantResponse = {
  answer: string
  mode: 'openai' | 'retrieval_fallback'
  confidence: number
  matchedRules: {
    id: string
    title: string
    category: string
  }[]
  matchedFaq: {
    sourceId: string
    matchedQuestion: string
    category: string
  } | null
}

export async function askAssistant(question: string) {
  const response = await apiClient.post<AssistantResponse>('/assistant/ask', {
    question,
  })
  return response.data
}
