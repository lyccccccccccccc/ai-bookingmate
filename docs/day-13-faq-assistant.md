# Day 13: FAQ Assistant

Day 13 adds a simple customer FAQ assistant. It has a backend retrieval endpoint and a frontend chat-style page.

## What The FAQ Assistant Does

The assistant answers common customer questions about:

- Booking a service.
- Cancelling a booking.
- Booking statuses.
- Missing or unavailable time slots.
- Login requirements.
- Admin capabilities.
- Service pricing and duration.

The frontend page is available at:

```text
/assistant
```

The backend endpoint is:

```text
POST /assistant/ask
```

## OpenAI-Powered Mode

The assistant can optionally use OpenAI to turn the matched FAQ source into a friendlier answer.

Add these values to `backend/.env`:

```env
OPENAI_API_KEY="your-api-key"
OPENAI_MODEL="gpt-5.6"
```

The backend uses the OpenAI Responses API after the local FAQ retrieval step finds a confident match. If `OPENAI_API_KEY` is missing, or if the OpenAI request fails, the backend returns the deterministic FAQ answer instead.

The API key stays on the backend. The frontend never sees it.

## How Retrieval Works

The backend uses a simple scoring approach:

1. Convert the user question to lowercase.
2. Split the question into words.
3. Compare those words with each FAQ entry's question and keywords.
4. Give more weight to keyword matches than general question word overlap.
5. Return the highest scoring FAQ answer.
6. If the score is too low, return a fallback answer.
7. If OpenAI is configured, ask OpenAI to rephrase the matched FAQ answer using only that source.

This is a small RAG-style pattern: retrieve a relevant knowledge-base item first, then respond from that source. The model is instructed not to invent business rules beyond the selected FAQ answer.

## Response Shape

Example request:

```json
{
  "question": "How do I cancel my booking?"
}
```

Example response:

```json
{
  "answer": "Log in, open My Bookings, find the booking you want to cancel, and click Cancel Booking. Cancelled bookings stay in your history.",
  "confidence": 0.82,
  "matchedQuestion": "How do I cancel a booking?",
  "category": "Bookings",
  "sourceId": "faq-cancel-booking"
}
```

## Frontend Chat Page

The frontend uses `frontend/src/api/assistantApi.ts` to call the backend.

The chat page shows:

- User messages.
- Assistant replies.
- Confidence percentage.
- Category and source id.
- Suggested question buttons.
- Loading and error states.

## Limitations

This assistant only knows the static FAQ entries in `backend/src/assistant/faq-data.ts`.

It does not:

- Search the database.
- Understand complex multi-step questions.
- Use embeddings or semantic search.

## Future Improvements

A later version could replace or improve the simple scoring with:

- Embeddings.
- Vector search.
- A database-backed knowledge base.
- Richer OpenAI-based RAG with larger knowledge sources.
- Conversation memory.

## Manual Testing Steps

Start the backend:

```cmd
cd backend
npm run start:dev
```

Start the frontend:

```cmd
cd frontend
npm run dev
```

Test the API directly:

```cmd
curl -X POST http://localhost:3000/assistant/ask -H "Content-Type: application/json" -d "{\"question\":\"How do I cancel my booking?\"}"
```

Test the admin FAQ match:

```cmd
curl -X POST http://localhost:3000/assistant/ask -H "Content-Type: application/json" -d "{\"question\":\"What can admins do?\"}"
```

Test the fallback:

```cmd
curl -X POST http://localhost:3000/assistant/ask -H "Content-Type: application/json" -d "{\"question\":\"how are you today\"}"
```

Test the frontend:

1. Open `http://localhost:5173/assistant`.
2. Click each suggested question.
3. Ask a custom question such as `What does pending mean?`.
4. Ask an unrelated question and confirm the fallback answer appears.
5. Confirm the page works when logged out and logged in.

## Day 13 Acceptance Criteria

- `POST /assistant/ask` returns deterministic FAQ answers.
- The assistant endpoint is public.
- Validation rejects empty or too-long questions.
- The frontend has a public `/assistant` route.
- The NavBar shows an Assistant link for everyone.
- The chat page shows messages, confidence, category, and errors.
- OpenAI-powered answers work when `OPENAI_API_KEY` is configured.
- The deterministic FAQ answer still works when `OPENAI_API_KEY` is not configured.
- Frontend and backend builds pass.
