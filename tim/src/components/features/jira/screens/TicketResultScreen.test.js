import { describe, test, expect } from 'vitest'
import { createElement } from 'react'
import { render } from 'ink-testing-library'
import TicketResultScreen from './TicketResultScreen.js'

const ticket = {
  id: 'EUDPA-200',
  summary: 'Build the CLI',
  status: 'In Dev',
  type: 'Story',
  assignee: 'Sam Farrington',
  priority: 'High',
  description: 'Plan + scaffold + ship.'
}

describe('TicketResultScreen', () => {
  test('renders the ticket id, summary and metadata', () => {
    const { lastFrame } = render(
      createElement(TicketResultScreen, { ticket, onReturn: () => {} })
    )

    const frame = lastFrame()
    expect(frame).toContain('EUDPA-200')
    expect(frame).toContain('Build the CLI')
    expect(frame).toContain('In Dev')
    expect(frame).toContain('Story')
    expect(frame).toContain('Sam Farrington')
    expect(frame).toContain('High')
  })

  test('falls back to placeholders for missing optional fields', () => {
    const sparse = { id: 'EUDPA-1', summary: '' }
    const { lastFrame } = render(
      createElement(TicketResultScreen, { ticket: sparse, onReturn: () => {} })
    )

    const frame = lastFrame()
    expect(frame).toContain('EUDPA-1')
    expect(frame).toMatch(/Unassigned|—/)
  })

  test('renders the press Enter prompt and calls onReturn on submit', async () => {
    let returned = false
    const { stdin } = render(
      createElement(TicketResultScreen, {
        ticket,
        onReturn: () => {
          returned = true
        }
      })
    )

    stdin.write('\r')
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(returned).toBe(true)
  })
})
