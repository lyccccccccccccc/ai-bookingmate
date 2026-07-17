import { isAxiosError } from 'axios'
import { useState, type FormEvent } from 'react'
import { askAssistant, type AssistantResponse } from '../api/assistantApi'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  metadata?: Pick<
    AssistantResponse,
    'mode' | 'confidence' | 'matchedRules' | 'matchedFaq'
  >
}

const suggestedQuestions = [
  'How do I book a service?',
  'How do I cancel my booking?',
  'Why did a time slot disappear?',
  'What can admins do?',
  'Do I need to log in to book?',
]

export function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hi! Ask me about booking services, cancellations, time slots, statuses, or admin actions.',
    },
  ])
  const [question, setQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const latestMetadata = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant' && message.metadata)
    ?.metadata

  async function submitQuestion(questionText: string) {
    const trimmedQuestion = questionText.trim()

    if (!trimmedQuestion) {
      return
    }

    setIsLoading(true)
    setError('')
    setQuestion('')

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: crypto.randomUUID(),
        role: 'user',
        text: trimmedQuestion,
      },
    ])

    try {
      const response = await askAssistant(trimmedQuestion)

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: response.answer,
          metadata: {
            mode: response.mode,
            confidence: response.confidence,
            matchedRules: response.matchedRules,
            matchedFaq: response.matchedFaq,
          },
        },
      ])
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Assistant is unavailable.'))
    } finally {
      setIsLoading(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submitQuestion(question)
  }

  return (
    <main className="page assistant-page">
      <section className="page-header">
        <p className="eyebrow">FAQ Assistant</p>
        <h1>Ask AI BookingMate</h1>
        <p className="lede">
          Get quick answers about services, bookings, time slots, and account
          rules.
        </p>
        <span className="assistant-mode-indicator">
          {latestMetadata
            ? latestMetadata.mode === 'openai'
              ? 'OpenAI mode'
              : 'Retrieval fallback'
            : 'Mode shown after your first answer'}
        </span>
      </section>

      <section className="two-column-layout assistant-layout">
        <aside className="assistant-sidebar">
          <section className="assistant-sidebar-card">
            <p className="eyebrow">Grounded answers</p>
            <h2>How answers stay reliable</h2>
            <p>
              Active admin business rules are retrieved first. OpenAI can
              synthesize that context, while fallback mode shows the strongest
              supported match.
            </p>
          </section>
          <section className="assistant-sidebar-card assistant-mode-card">
            <p className="eyebrow">Current mode</p>
            <strong>
              {latestMetadata
                ? latestMetadata.mode === 'openai'
                  ? 'OpenAI enabled'
                  : 'Retrieval fallback'
                : 'Waiting for a question'}
            </strong>
            <p>Each answer shows its confidence and matched rule or FAQ source.</p>
          </section>
          <section className="assistant-sidebar-card try-asking">
            <h3>Try asking</h3>
            {suggestedQuestions.slice(0, 4).map((suggestedQuestion) => (
              <button
                className="question-chip"
                disabled={isLoading}
                key={suggestedQuestion}
                type="button"
                onClick={() => void submitQuestion(suggestedQuestion)}
              >
                {suggestedQuestion}
              </button>
            ))}
          </section>
          <section className="assistant-sidebar-card supported-topics">
            <h3>Supported topics</h3>
            <div className="side-panel-facts">
              <span>Booking</span><span>Cancellations</span><span>Time slots</span>
              <span>Services</span><span>Account access</span><span>Policies</span>
            </div>
          </section>
        </aside>

        <div className="assistant-card" aria-label="FAQ assistant chat">
          <div className="suggested-questions" aria-label="Suggested questions">
            {suggestedQuestions.map((suggestedQuestion) => (
              <button
                className="question-chip"
                disabled={isLoading}
                key={suggestedQuestion}
                type="button"
                onClick={() => void submitQuestion(suggestedQuestion)}
              >
                {suggestedQuestion}
              </button>
            ))}
          </div>

          <div className="chat-thread">
            {messages.length === 1 ? (
              <div className="assistant-empty-state">
                <span className="assistant-orb" aria-hidden="true">AI</span>
                <div>
                  <strong>What can I help with?</strong>
                  <p>Ask about booking, cancellations, available time slots, or business policies.</p>
                </div>
              </div>
            ) : null}
            {messages.map((message) => (
              <article
                className={`chat-message chat-message-${message.role}`}
                key={message.id}
              >
                <p>{message.text}</p>
                {message.metadata ? (
                  <AssistantMetadata metadata={message.metadata} />
                ) : null}
              </article>
            ))}

            {isLoading ? (
              <p className="state-message">Assistant is thinking...</p>
            ) : null}
          </div>

          {error ? <p className="error-message">{error}</p> : null}

          <form className="assistant-form" onSubmit={handleSubmit}>
            <label className="assistant-input-label">
              Ask a question
              <input
                maxLength={500}
                placeholder="How do I cancel my booking?"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
              />
            </label>
            <button
              className="button primary"
              disabled={isLoading || question.trim().length === 0}
              type="submit"
            >
              {isLoading ? 'Asking...' : 'Ask'}
            </button>
          </form>
        </div>

      </section>
    </main>
  )
}

function AssistantMetadata({
  metadata,
}: {
  metadata: NonNullable<ChatMessage['metadata']>
}) {
  return (
    <div className="assistant-metadata" aria-label="Answer source details">
      <div className="assistant-metadata-row">
        <span>Mode: {metadata.mode === 'openai' ? 'OpenAI' : 'Fallback'}</span>
        <span>Confidence: {Math.round(metadata.confidence * 100)}%</span>
      </div>

      {metadata.mode === 'retrieval_fallback' ? (
        <p>Rule-based fallback is shown because OpenAI is not configured.</p>
      ) : null}

      {metadata.matchedRules.length > 0 ? (
        <p>
          Rules:{' '}
          {metadata.matchedRules
            .map((rule) => `${rule.title} (${rule.category})`)
            .join(', ')}
        </p>
      ) : null}

      {metadata.matchedFaq ? (
        <p>
          FAQ: {metadata.matchedFaq.matchedQuestion} (
          {metadata.matchedFaq.category})
        </p>
      ) : null}
    </div>
  )
}

function getErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message

    if (Array.isArray(message)) {
      return message.join(', ')
    }

    if (message) {
      return message
    }
  }

  return fallback
}
