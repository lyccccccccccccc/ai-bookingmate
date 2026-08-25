import { isAxiosError } from 'axios'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useState, type FormEvent } from 'react'
import { askAssistant, type AssistantResponse } from '../api/assistantApi'
import { Reveal } from '../components/Reveal'
import '../workspace-v2.css'

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
  const reduceMotion = useReducedMotion()
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hi! Ask me about booking services, cancellations, time slots, statuses, or admin actions.',
    },
  ])
  const [question, setQuestion] = useState('')
  const [lastAskedQuestion, setLastAskedQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const latestMetadata = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant' && message.metadata)
    ?.metadata

  async function submitQuestion(questionText: string) {
    const trimmedQuestion = questionText.trim()

    if (!trimmedQuestion || isLoading) {
      return
    }

    setIsLoading(true)
    setError('')
    setQuestion('')
    setLastAskedQuestion(trimmedQuestion)

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

  const currentMode = latestMetadata
    ? latestMetadata.mode === 'openai'
      ? 'OpenAI'
      : 'Retrieval fallback'
    : 'Ready'

  return (
    <main className="page assistant-page assistant-v2-page">
      <Reveal>
        <header className="workspace-hero assistant-workspace-hero">
          <div>
            <p className="eyebrow">AI assistant</p>
            <h1>Answers grounded in your booking rules</h1>
            <p className="lede">
              Ask about services, cancellations, time slots, account access, or
              active business policies.
            </p>
          </div>
          <span className={`assistant-mode-v2 mode-${latestMetadata?.mode ?? 'ready'}`}>
            <span aria-hidden="true" /> {currentMode}
          </span>
        </header>
      </Reveal>

      <section className="assistant-workspace-v2">
        <Reveal className="assistant-guide-v2">
          <aside aria-label="Assistant information and suggested questions">
            <section className="assistant-guide-intro">
              <span className="assistant-guide-mark" aria-hidden="true">AI</span>
              <p className="eyebrow">Grounded support</p>
              <h2>Useful answers, with their sources visible.</h2>
              <p>
                Active business rules and the project FAQ are retrieved first.
                OpenAI can summarize that context, while fallback mode returns
                the strongest supported match.
              </p>
            </section>

            <section className="assistant-mode-panel-v2">
              <div>
                <span>Current mode</span>
                <strong>{currentMode}</strong>
              </div>
              <p>
                {latestMetadata?.mode === 'openai'
                  ? 'OpenAI is summarizing retrieved business context.'
                  : latestMetadata?.mode === 'retrieval_fallback'
                    ? 'The best supported rule or FAQ match is shown directly.'
                    : 'The answer mode appears after your first question.'}
              </p>
            </section>

            <section className="assistant-prompts-v2">
              <p className="eyebrow">Quick questions</p>
              <div>
                {suggestedQuestions.map((suggestedQuestion) => (
                  <button
                    className={`assistant-prompt-chip${
                      lastAskedQuestion === suggestedQuestion ? ' active' : ''
                    }`}
                    disabled={isLoading}
                    key={suggestedQuestion}
                    type="button"
                    onClick={() => void submitQuestion(suggestedQuestion)}
                    aria-pressed={lastAskedQuestion === suggestedQuestion}
                  >
                    {suggestedQuestion}
                    <span aria-hidden="true" />
                  </button>
                ))}
              </div>
            </section>

            <section className="assistant-topics-v2">
              <p className="eyebrow">Supported topics</p>
              <div>
                <span>Bookings</span><span>Cancellations</span><span>Time slots</span>
                <span>Services</span><span>Account access</span><span>Policies</span>
              </div>
            </section>
          </aside>
        </Reveal>

        <Reveal className="assistant-conversation-v2" delay={0.08}>
          <section aria-label="AI BookingMate chat">
            <header className="conversation-header-v2">
              <div>
                <span className="conversation-status-dot" aria-hidden="true" />
                <div><strong>AI BookingMate</strong><small>Business-rule support</small></div>
              </div>
              <span>{messages.length - 1} {messages.length - 1 === 1 ? 'message' : 'messages'}</span>
            </header>

            <div className="chat-thread chat-thread-v2" aria-live="polite">
              {messages.length === 1 ? (
                <div className="assistant-empty-v2">
                  <span aria-hidden="true">AI</span>
                  <h2>How can I help?</h2>
                  <p>
                    Choose a quick question or ask about your booking experience
                    in your own words.
                  </p>
                </div>
              ) : null}

              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <motion.article
                    className={`chat-message chat-message-v2 chat-message-${message.role}`}
                    key={message.id}
                    initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <span className="message-author">
                      {message.role === 'user' ? 'You' : 'AI BookingMate'}
                    </span>
                    <p>{message.text}</p>
                    {message.metadata ? (
                      <AssistantMetadata metadata={message.metadata} />
                    ) : null}
                  </motion.article>
                ))}
              </AnimatePresence>

              {isLoading ? <TypingIndicator /> : null}
            </div>

            {error ? (
              <div className="assistant-error-v2" role="alert">
                <span aria-hidden="true">!</span>
                <p><strong>Assistant unavailable.</strong> {error}</p>
              </div>
            ) : null}

            <form className="assistant-form assistant-form-v2" onSubmit={handleSubmit}>
              <label htmlFor="assistant-question">Ask a question</label>
              <div className="assistant-input-shell">
                <input
                  id="assistant-question"
                  maxLength={500}
                  placeholder="How do I cancel my booking?"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  disabled={isLoading}
                />
                <button
                  className="button primary"
                  disabled={isLoading || question.trim().length === 0}
                  type="submit"
                >
                  {isLoading ? 'Asking...' : 'Ask assistant'}
                </button>
              </div>
              <small>Answers use active business rules and FAQ context.</small>
            </form>
          </section>
        </Reveal>
      </section>
    </main>
  )
}

function TypingIndicator() {
  return (
    <div className="assistant-typing-v2" role="status" aria-label="Assistant is thinking">
      <span className="message-author">AI BookingMate</span>
      <div aria-hidden="true"><i /><i /><i /></div>
      <span className="sr-only">Assistant is thinking</span>
    </div>
  )
}

function AssistantMetadata({
  metadata,
}: {
  metadata: NonNullable<ChatMessage['metadata']>
}) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      className="assistant-metadata assistant-metadata-v2"
      aria-label="Answer source details"
      initial={reduceMotion ? false : { opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: reduceMotion ? 0 : 0.12 }}
    >
      <div className="assistant-metadata-chips">
        <span>{metadata.mode === 'openai' ? 'OpenAI' : 'Fallback'}</span>
        <span>{Math.round(metadata.confidence * 100)}% confidence</span>
      </div>

      {metadata.mode === 'retrieval_fallback' ? (
        <p>Retrieval fallback returned the strongest supported context.</p>
      ) : null}

      {metadata.matchedRules.length > 0 ? (
        <div className="assistant-sources-v2">
          <strong>Matched rules</strong>
          <div>
            {metadata.matchedRules.map((rule, index) => (
              <motion.span
                key={rule.id}
                initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduceMotion ? 0 : 0.16 + index * 0.04 }}
              >
                {rule.title} <small>{rule.category}</small>
              </motion.span>
            ))}
          </div>
        </div>
      ) : null}

      {metadata.matchedFaq ? (
        <div className="assistant-faq-source-v2">
          <strong>FAQ source</strong>
          <span>{metadata.matchedFaq.matchedQuestion}</span>
          <small>{metadata.matchedFaq.category}</small>
        </div>
      ) : null}
    </motion.div>
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
