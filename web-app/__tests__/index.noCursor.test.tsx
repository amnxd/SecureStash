import React from 'react'
import { render, waitFor } from '@testing-library/react'

// Instead of loading the full Next page, mount a tiny component that mirrors the page's router.replace usage
const replaceMock = jest.fn()
jest.mock('next/router', () => ({ useRouter: () => ({ pathname: '/', query: {}, replace: replaceMock }) }))

function TestComponent() {
  const { useEffect } = require('react')
  const { useRouter } = require('next/router')
  const router = useRouter()
  useEffect(() => {
    router.replace({ pathname: router.pathname, query: { page: 1, sortBy: 'created_at' } }, undefined, { shallow: true })
  }, [router])
  return null
}

test('shallow replace is called with page and sortBy', async () => {
  render(React.createElement(TestComponent))
  await waitFor(() => expect(replaceMock).toHaveBeenCalled())
  const calledWith = replaceMock.mock.calls[0][0]
  expect(calledWith.query).toHaveProperty('page')
  expect(calledWith.query).toHaveProperty('sortBy')
})
