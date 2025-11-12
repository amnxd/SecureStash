import React from 'react'
import { render, waitFor } from '@testing-library/react'

const replaceMock = jest.fn()
jest.mock('next/router', () => ({ useRouter: () => ({ pathname: '/', query: { cursor: encodeURIComponent('2020-01-01T00:00:00.000Z') }, replace: replaceMock }) }))

function TestComponent() {
  const { useEffect } = require('react')
  const { useRouter } = require('next/router')
  const router = useRouter()
  useEffect(() => {
    // on mount emulate page's behavior of pushing cursor back into URL
    router.replace({ pathname: router.pathname, query: { cursor: router.query.cursor } }, undefined, { shallow: true })
  }, [router])
  return null
}

test('Home-like component keeps cursor in URL', async () => {
  render(React.createElement(TestComponent))
  await waitFor(() => expect(replaceMock).toHaveBeenCalled())
  const calledWith = replaceMock.mock.calls[0][0]
  expect(calledWith.query.cursor).toBeDefined()
})
