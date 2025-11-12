import { parseCursorToken, encodeCursorToken } from '../lib/cursor'

test('parseCursorToken decodes composite base64 token', () => {
  const payload = { v: '2020-01-01T00:00:00.000Z', id: 'doc123' }
  const token = encodeCursorToken(payload)
  const decoded = parseCursorToken(token)
  expect(decoded).toEqual(payload)
})

