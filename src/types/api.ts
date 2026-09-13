// Shapes for request bodies / error responses not already covered by
// Conversation, Message, User (which we leave untouched).
// Note: these bodies include fields NOT documented in the swagger, but
// verified as necessary against the live server (see IMPLEMENTATION_PLAN.md
// Section 0, items 5-6).

export interface CreateConversationBody {
  recipientId: number
  senderId: number             // undocumented, but required for the middleware to ever match this record
  senderNickname: string       // undocumented, but required for display
  recipientNickname: string    // undocumented, but required for display
  lastMessageTimestamp: number
}

export interface CreateMessageBody {
  body: string
  timestamp: number
  conversationId: number       // undocumented, but required — the API does not infer it from the URL
  authorId: number              // undocumented, but required — same reason
}

export interface CreatedIdResponse {
  id: number
}

// A minimal discriminated result type so every API call has one honest shape
// to handle, instead of throwing raw fetch errors around the app.
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string }
