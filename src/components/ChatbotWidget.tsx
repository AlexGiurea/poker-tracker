import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'

type ChatMessage = {
  id: string
  role: 'assistant' | 'user'
  content: string
}

type ChatSession = {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: ChatMessage[]
}

const systemPrompt = `You are the Poker Tracker chatbot, speaking with a fun Vegas casino vibe and poker slang.
You answer questions about sessions, players, and statistics from the CSV data included below.
Be helpful and concise. If the data is missing, say so and suggest what is available.
Do not make up new sessions or players.`

const csvDataUrl = '/data/players-results.csv'
const chatStorageKey = 'pokerTrackerChatSessions'

const getApiKey = () => import.meta.env.VITE_OPENAI_API_KEY as string | undefined
const getModel = () =>
  (import.meta.env.VITE_OPENAI_MODEL as string | undefined) ?? 'gpt-5-nano'
const formatCsvContext = (csvText: string) =>
  `CSV data (header + rows):\n${csvText}`

const welcomeMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Howdy, high roller. Ask about players, buy-ins, profits, or sessions and I will deal the details.',
}

const buildNewSession = (): ChatSession => {
  const now = Date.now()
  return {
    id: `chat-${now}`,
    title: 'New chat',
    createdAt: now,
    updatedAt: now,
    messages: [welcomeMessage],
  }
}

const loadSessions = (): ChatSession[] => {
  if (typeof window === 'undefined') return [buildNewSession()]
  const stored = window.localStorage.getItem(chatStorageKey)
  if (!stored) return [buildNewSession()]
  try {
    const parsed = JSON.parse(stored) as ChatSession[]
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [buildNewSession()]
    }
    return parsed
  } catch {
    return [buildNewSession()]
  }
}

const ChatbotWidget = () => {
  const assistantName = 'Chipster'
  const [isOpen, setIsOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions())
  const [activeSessionId, setActiveSessionId] = useState('')
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [csvContext, setCsvContext] = useState<string>('')
  const [isLoadingCsv, setIsLoadingCsv] = useState(false)
  const endRef = useRef<HTMLDivElement | null>(null)

  const activeSession =
    sessions.find((session) => session.id === activeSessionId) ?? sessions[0]
  const messages = activeSession?.messages ?? [welcomeMessage]

  useEffect(() => {
    if (!activeSessionId && sessions[0]) {
      setActiveSessionId(sessions[0].id)
    }
  }, [activeSessionId, sessions])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(chatStorageKey, JSON.stringify(sessions))
    }
  }, [sessions])

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [isOpen, messages])

  useEffect(() => {
    let isMounted = true
    setIsLoadingCsv(true)
    fetch(csvDataUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Unable to load CSV data file.')
        }
        return response.text()
      })
      .then((csvText) => {
        if (isMounted) {
          setCsvContext(formatCsvContext(csvText))
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('Unable to load CSV data. Check the file path.')
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingCsv(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const appendMessage = (message: ChatMessage) => {
    if (!activeSession) return
    setSessions((prev) =>
      prev.map((session) => {
        if (session.id !== activeSession.id) return session
        const nextMessages = [...session.messages, message]
        const nextTitle =
          session.title === 'New chat' && message.role === 'user'
            ? message.content.slice(0, 40)
            : session.title
        return {
          ...session,
          title: nextTitle,
          messages: nextMessages,
          updatedAt: Date.now(),
        }
      }),
    )
  }

  const handleNewChat = () => {
    const next = buildNewSession()
    setSessions((prev) => [next, ...prev])
    setActiveSessionId(next.id)
    setIsHistoryOpen(false)
  }

  const handleSelectChat = (sessionId: string) => {
    setActiveSessionId(sessionId)
    setIsHistoryOpen(false)
  }

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isSending) return

    const apiKey = getApiKey()
    if (!apiKey) {
      setError('Missing API key. Add VITE_OPENAI_API_KEY to your .env file.')
      return
    }
    if (!csvContext) {
      setError('CSV data is still loading. Try again in a moment.')
      return
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    }
    const conversationMessages = messages.filter(
      (message) => message.id !== welcomeMessage.id,
    )
    appendMessage(userMessage)
    setInput('')
    setIsSending(true)
    setError(null)

    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: getModel(),
          input: [
            {
              role: 'system',
              content: [
                {
                  type: 'input_text',
                  text: `${systemPrompt}\n\n${csvContext}`,
                },
              ],
            },
            ...conversationMessages.map((message) => ({
              role: message.role,
              content: [{ type: 'input_text', text: message.content }],
            })),
            {
              role: 'user',
              content: [{ type: 'input_text', text: trimmed }],
            },
          ],
        }),
      })

      const payload = (await response.json()) as {
        output_text?: string
        output?: Array<{
          type?: string
          content?: Array<{ type?: string; text?: string; value?: string }>
        }>
        error?: { message?: string }
      }

      if (!response.ok) {
        const message =
          payload.error?.message ?? `Request failed (${response.status})`
        throw new Error(message)
      }

      const outputText =
        payload.output_text ??
        payload.output
          ?.flatMap((item) => item.content ?? [])
          .map((part) => part.text ?? part.value ?? '')
          .find((text) => text.trim().length > 0) ??
        'No response received.'

      appendMessage({
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: outputText,
      })
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : 'Chat request failed. Try again.'
      setError(message)
      appendMessage({
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content:
          'Dealer error. The line is jammed. Check the API key and try again.',
      })
    } finally {
      setIsSending(false)
    }
  }

  const sortedSessions = [...sessions].sort(
    (a, b) => b.updatedAt - a.updatedAt,
  )

  return (
    <div className="chatbot-widget">
      {!isOpen ? (
        <button
          type="button"
          className="chatbot-toggle"
          onClick={() => setIsOpen(true)}
          aria-expanded={isOpen}
        >
          <span className="chatbot-toggle-label">Ask {assistantName}</span>
          <span className="chatbot-toggle-icon" aria-hidden="true">
            💬
          </span>
        </button>
      ) : null}
      {isOpen ? (
        <div className="chatbot-panel" role="dialog" aria-label="Poker chatbot">
          <div className="chatbot-header">
            <div>
              <strong>Poker Concierge</strong>
              <p>Vegas insights on demand</p>
            </div>
            <div className="chatbot-header-actions">
              <button
                type="button"
                className="chatbot-action"
                onClick={() => setIsHistoryOpen((prev) => !prev)}
                aria-label="View past chats"
                aria-pressed={isHistoryOpen}
              >
                🕘
              </button>
              <button
                type="button"
                className="chatbot-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
              >
                ×
              </button>
            </div>
          </div>
          {isHistoryOpen ? (
            <div className="chatbot-history">
              <div className="chatbot-history-header">
                <span>Past chats</span>
                <button
                  type="button"
                  className="chatbot-history-new"
                  onClick={handleNewChat}
                >
                  New chat
                </button>
              </div>
              {sortedSessions.length ? (
                <div className="chatbot-history-list">
                  {sortedSessions.map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      className={`chatbot-history-item ${
                        session.id === activeSession?.id ? 'active' : ''
                      }`}
                      onClick={() => handleSelectChat(session.id)}
                    >
                      <div className="chatbot-history-title">
                        {session.title}
                      </div>
                      <div className="chatbot-history-meta">
                        {new Date(session.updatedAt).toLocaleString()}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="chatbot-history-empty">
                  No past chats yet. Start a new one.
                </p>
              )}
            </div>
          ) : (
            <div className="chatbot-messages">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`chatbot-message ${message.role}`}
                >
                  <p>{message.content}</p>
                </div>
              ))}
              <div ref={endRef} />
            </div>
          )}
          <form className="chatbot-input" onSubmit={handleSend}>
            <input
              type="text"
              placeholder="Ask about profits, players, or sessions..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={isSending || isHistoryOpen}
            />
            <button
              type="submit"
              disabled={isSending || isHistoryOpen || !input.trim()}
            >
              {isSending ? 'Dealing...' : 'Send'}
            </button>
          </form>
          {isLoadingCsv ? (
            <p className="chatbot-status">Loading the CSV data...</p>
          ) : null}
          {error ? <p className="chatbot-error">{error}</p> : null}
        </div>
      ) : null}
    </div>
  )
}

export default ChatbotWidget
