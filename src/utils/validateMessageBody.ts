const MAX_LENGTH = 2000

export type ValidateMessageBodyResult =
  | { valid: true }
  | { valid: false; error: 'empty' | 'tooLong' }

export function validateMessageBody(input: string): ValidateMessageBodyResult {
  const trimmed = input.trim()

  if (trimmed.length === 0) {
    return { valid: false, error: 'empty' }
  }

  if (trimmed.length > MAX_LENGTH) {
    return { valid: false, error: 'tooLong' }
  }

  return { valid: true }
}
