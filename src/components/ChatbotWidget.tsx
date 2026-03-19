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

const chatStorageKey = 'pokerTrackerChatSessions'

const welcomeMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Ask about a player, a session, or the season totals.',
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

const readJsonSafely = async (response: Response) => {
  const text = await response.text()
  if (!text.trim()) {
    return null
  }

  try {
    return JSON.parse(text) as {
      outputText?: string
      error?: string
    }
  } catch {
    return null
  }
}

const ChatbotWidget = () => {
  const assistantName = 'Dealer AI'
  const [isOpen, setIsOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions())
  const [activeSessionId, setActiveSessionId] = useState('')
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...conversationMessages,
            {
              role: 'user',
              content: trimmed,
            },
          ],
        }),
      })

      const payload = await readJsonSafely(response)

      if (!response.ok) {
        const message = payload?.error ?? `Request failed (${response.status})`
        throw new Error(message)
      }

      const outputText = payload?.outputText ?? 'No response received.'

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
        content: message,
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
        </button>
      ) : null}

      {isOpen ? (
        <div className="chatbot-panel" role="dialog" aria-label="Poker chatbot">
          <div className="chatbot-header">
            <div>
              <strong>Poker concierge</strong>
              <p>Ask the data layer anything</p>
            </div>
            <div className="chatbot-header-actions">
              <button
                type="button"
                className="chatbot-action"
                onClick={() => setIsHistoryOpen((prev) => !prev)}
                aria-label="View past chats"
                aria-pressed={isHistoryOpen}
              >
                History
              </button>
              <button
                type="button"
                className="chatbot-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
              >
                X
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
              {isSending ? 'Thinking...' : 'Send'}
            </button>
          </form>
          {error ? <p className="chatbot-error">{error}</p> : null}
        </div>
      ) : null}
    </div>
  )
}

export default ChatbotWidget
