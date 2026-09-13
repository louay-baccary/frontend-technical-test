import { validateMessageBody } from '../validateMessageBody'

describe('validateMessageBody', () => {
  it('rejects an empty string', () => {
    expect(validateMessageBody('')).toEqual({ valid: false, error: 'empty' })
  })

  it('rejects a whitespace-only string', () => {
    expect(validateMessageBody('   \n\t  ')).toEqual({ valid: false, error: 'empty' })
  })

  it('accepts a normal message', () => {
    expect(validateMessageBody('Hello there')).toEqual({ valid: true })
  })

  it('accepts a message at exactly the 2000-character boundary', () => {
    const body = 'a'.repeat(2000)
    expect(validateMessageBody(body)).toEqual({ valid: true })
  })

  it('rejects a message one character over the boundary', () => {
    const body = 'a'.repeat(2001)
    expect(validateMessageBody(body)).toEqual({ valid: false, error: 'tooLong' })
  })

  it('trims surrounding whitespace before checking length', () => {
    const body = `  ${'a'.repeat(2000)}  `
    expect(validateMessageBody(body)).toEqual({ valid: true })
  })
})
