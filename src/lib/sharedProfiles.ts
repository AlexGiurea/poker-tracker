import type { PlayerProfileSnapshot } from './playerProfiles'

type SharedProfilePayload = {
  version: 1
  snapshot: PlayerProfileSnapshot
}

const SHARED_PROFILE_PARAM = 'shared'

const encodeBase64Url = (input: string) => {
  const bytes = new TextEncoder().encode(input)
  let binary = ''

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

const decodeBase64Url = (input: string) => {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padding = normalized.length % 4
  const padded = padding === 0 ? normalized : `${normalized}${'='.repeat(4 - padding)}`
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export const buildSharedProfileUrl = (snapshot: PlayerProfileSnapshot) => {
  const payload: SharedProfilePayload = {
    version: 1,
    snapshot,
  }
  const url = new URL(window.location.href)
  url.searchParams.set(
    SHARED_PROFILE_PARAM,
    encodeBase64Url(JSON.stringify(payload)),
  )
  return url.toString()
}

export const readSharedProfileFromSearch = (search: string) => {
  const params = new URLSearchParams(search)
  const encoded = params.get(SHARED_PROFILE_PARAM)

  if (!encoded) return null

  try {
    const parsed = JSON.parse(decodeBase64Url(encoded)) as SharedProfilePayload

    if (parsed.version !== 1 || !parsed.snapshot?.name) {
      return null
    }

    return parsed.snapshot
  } catch {
    return null
  }
}
