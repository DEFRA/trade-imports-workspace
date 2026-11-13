import { describe, test, expect } from 'vitest'
import { linkedTestChange, testBlockTitled } from './test-blocks.js'

const JS_FILE = 'src/origin.test.js'
const JAVA_FILE = 'src/test/java/OriginTest.java'

describe('#testBlockTitled in JavaScript', () => {
  test('Should give the whole call, brackets in strings, comments, regexes and templates included', () => {
    const source = [
      "it('keeps the brackets', () => {",
      "  const text = ')}]'",
      '  // a ) in a comment',
      '  /* and } here */',
      '  expect(text).toMatch(/[)}]+\\//)',
      `  expect(\`\${text})\`).toBe(text + ")")`,
      '})',
      "it('another', () => {})"
    ].join('\n')

    const found = testBlockTitled(source, 'keeps the brackets', JS_FILE)

    expect(found).toEqual({
      found: 'one',
      block: source.split('\nit(')[0]
    })
  })

  test('Should find a test by any quote style, and through .only, .skip and test.describe', () => {
    const source = [
      'test.only("double", () => {})',
      "test.skip('it\\'s single', () => {})",
      'test.describe(`plain template`, () => {})'
    ].join('\n')

    const titles = ['double', "it's single", 'plain template']

    expect(
      titles.map((title) => testBlockTitled(source, title, JS_FILE).found)
    ).toEqual(['one', 'one', 'one'])
  })

  test('Should drop trailing spaces from each line of the block', () => {
    const source = "it('spaced', () => {   \n  run()\t\n})"

    expect(testBlockTitled(source, 'spaced', JS_FILE)).toEqual({
      found: 'one',
      block: "it('spaced', () => {\n  run()\n})"
    })
  })

  test('Should not take a method call, a comment, a string or an interpolated template for a test', () => {
    const source = [
      "pattern.test('title')",
      "// test('title', () => {})",
      'const text = "test(\'title\', () => {})"',
      `test(\`\${prefix}title\`, () => {})`
    ].join('\n')

    expect(testBlockTitled(source, 'title', JS_FILE)).toEqual({
      found: 'none'
    })
  })

  test('Should say a title names more than one test', () => {
    const source = "test('twice', () => {})\ntest('twice', () => {})"

    expect(testBlockTitled(source, 'twice', JS_FILE)).toEqual({
      found: 'many'
    })
  })

  test('Should say a file it cannot read is unreadable', () => {
    const source = "test('open', () => {\n  const text = 'never closed\n})"

    expect(testBlockTitled(source, 'open', JS_FILE)).toEqual({
      found: 'unreadable'
    })
  })
})

describe('#testBlockTitled in Java', () => {
  const JAVA_SOURCE = [
    'class OriginTest {',
    '    @Test',
    '    @DisplayName("lists every country")',
    '    void listsEveryCountry() {',
    '        assertThat(text("}")).isEqualTo("}");',
    '    }',
    '',
    '    @ParameterizedTest',
    '    @ValueSource(strings = {"FR", "ES"})',
    '    void saves_aCountry(String code) {',
    '        assertThat(save(code)).isEqualTo(code);',
    '    }',
    '}'
  ].join('\n')

  test('Should give a test method with its annotations by its name', () => {
    expect(testBlockTitled(JAVA_SOURCE, 'saves_aCountry', JAVA_FILE)).toEqual({
      found: 'one',
      block: JAVA_SOURCE.split('\n').slice(7, 12).join('\n')
    })
  })

  test('Should give a test method by its display name', () => {
    expect(
      testBlockTitled(JAVA_SOURCE, 'lists every country', JAVA_FILE)
    ).toEqual({
      found: 'one',
      block: JAVA_SOURCE.split('\n').slice(1, 6).join('\n')
    })
  })
})

describe('#linkedTestChange', () => {
  const BASE = "it('kept', () => { one() })\nit('other', () => { two() })\n"

  test('Should find no change when only another test in the file changes', () => {
    const change = linkedTestChange({
      title: 'kept',
      file: JS_FILE,
      baseText: BASE,
      currentText: BASE.replace('two()', 'three()')
    })

    expect(change).toBeNull()
  })

  test('Should report an edit to the test block itself', () => {
    const change = linkedTestChange({
      title: 'kept',
      file: JS_FILE,
      baseText: BASE,
      currentText: BASE.replace('one()', 'uno()')
    })

    expect(change).toEqual({ change: 'edited' })
  })

  test('Should report a test whose title is gone, or a file that is gone, as deleted', () => {
    const changes = [BASE.replace("'kept'", "'renamed'"), null].map(
      (currentText) =>
        linkedTestChange({
          title: 'kept',
          file: JS_FILE,
          baseText: BASE,
          currentText
        })
    )

    expect(changes).toEqual([{ change: 'deleted' }, { change: 'deleted' }])
  })

  test('Should count any change to the file when the test turns ambiguous after the change', () => {
    const change = linkedTestChange({
      title: 'kept',
      file: JS_FILE,
      baseText: BASE,
      currentText: `${BASE}it('kept', () => {})\n`
    })

    expect(change).toEqual({
      change: 'edited',
      fileLevel:
        '"kept" names more than one test in the file, so any change to the file counts.'
    })
  })

  test('Should count any change to the file when the file is new to the base', () => {
    const change = linkedTestChange({
      title: 'kept',
      file: JS_FILE,
      baseText: null,
      currentText: BASE
    })

    expect(change).toEqual({
      change: 'edited',
      fileLevel:
        'Can\'t find "kept" in the file before the change, so any change to the file counts.'
    })
  })
})
