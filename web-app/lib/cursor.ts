// Utilities to encode/decode composite cursor tokens for Firestore deep links
export function encodeCursorToken(payload: any) {
  const json = JSON.stringify(payload)
  return encodeURIComponent(Buffer.from(json).toString('base64'))
}

export function parseCursorToken(token: string | undefined) {
  if (!token) return null
  try {
    const raw = decodeURIComponent(token)
    const json = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'))
    return json
  } catch (e) {
    // fall back to plain value
    try {
      return decodeURIComponent(token)
    } catch (_) {
      return token
    }
  }
}
