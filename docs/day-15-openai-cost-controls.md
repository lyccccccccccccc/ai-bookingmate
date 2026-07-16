# Day 15: OpenAI Assistant Cost Controls

Day 15 adds simple backend guardrails for OpenAI usage in the customer assistant.

## Default Model

The backend defaults to:

```env
OPENAI_MODEL="gpt-5.6-luna"
```

This project uses `gpt-5.6-luna` by default to keep assistant responses cost-conscious during local development and demos.

## Allowed Models

The backend only allows these configured models:

```text
gpt-5.6-luna
gpt-5.4-nano
gpt-5.4-mini
```

If `OPENAI_MODEL` is missing or set to anything else, the backend falls back to `gpt-5.6-luna`. This prevents accidental use of an expensive model from a copied environment file.

## Output Token Limit

The backend reads:

```env
OPENAI_MAX_OUTPUT_TOKENS="300"
```

If the value is missing or invalid, the backend uses `300`.

If the value is higher than `500`, the backend caps it at `500`.

The assistant prompt also asks OpenAI to answer in 2-4 short sentences unless the user asks for details.

## API Key Safety

`OPENAI_API_KEY` belongs only in `backend/.env`.

The frontend never receives the OpenAI key and never calls OpenAI directly. The browser calls the backend assistant endpoint, and the backend decides whether to use OpenAI or retrieval fallback mode.

## Manual Testing

Use a safe backend `.env`:

```env
OPENAI_API_KEY="your-api-key"
OPENAI_MODEL="gpt-5.6-luna"
OPENAI_MAX_OUTPUT_TOKENS="300"
```

Restart the backend:

```cmd
cd backend
npm run start:dev
```

Ask the assistant:

```cmd
curl -X POST http://localhost:3000/assistant/ask -H "Content-Type: application/json" -d "{\"question\":\"What is the cancellation policy?\"}"
```

To test the allowlist, temporarily set `OPENAI_MODEL` to an unsupported value in `backend/.env`, restart the backend, and confirm the assistant still works by falling back internally to `gpt-5.6-luna`.
