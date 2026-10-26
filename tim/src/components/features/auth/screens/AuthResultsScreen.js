import { createElement } from 'react'
import { Box, Text } from 'ink'
import TextInput from 'ink-text-input'

const userLabel = (user = {}) =>
  user.displayName ?? user.user ?? '(unknown user)'

const Row = ({ result }) => {
  if (result.ok) {
    return createElement(
      Box,
      null,
      createElement(Text, { color: 'green', bold: true }, '✓ '),
      createElement(Text, null, `${result.service} — signed in as `),
      createElement(Text, { color: 'green' }, userLabel(result.user))
    )
  }
  return createElement(
    Box,
    { flexDirection: 'column' },
    createElement(
      Box,
      null,
      createElement(Text, { color: 'red', bold: true }, '✗ '),
      createElement(Text, null, `${result.service} — `),
      createElement(Text, { color: 'red' }, result.error?.code ?? 'FAILED')
    ),
    createElement(
      Box,
      { marginLeft: 4 },
      createElement(Text, { color: 'gray' }, result.error?.message ?? '')
    )
  )
}

const AuthResultsScreen = ({ results = [], onReturn }) =>
  createElement(
    Box,
    { flexDirection: 'column', padding: 1 },
    createElement(
      Box,
      { marginBottom: 1 },
      createElement(Text, { bold: true, color: 'cyan' }, 'Auth')
    ),
    ...results.map((result, index) =>
      createElement(Row, { key: result.service ?? index, result })
    ),
    onReturn
      ? createElement(
          Box,
          { flexDirection: 'column', marginTop: 1 },
          createElement(Text, { color: 'gray' }, 'Press Enter to go back'),
          createElement(TextInput, {
            value: '',
            onChange: () => {},
            onSubmit: onReturn
          })
        )
      : null
  )

export default AuthResultsScreen
