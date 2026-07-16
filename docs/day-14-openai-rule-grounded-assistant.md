# Day 14: OpenAI Rule-Grounded Assistant

Day 14 upgrades the Day 13 FAQ assistant into an OpenAI-powered customer support assistant grounded in admin-managed business rules.

## Why Day 13 Was Retrieval-Only

Day 13 used a static FAQ list and simple keyword scoring. That made the assistant deterministic, easy to explain, and safe to run without API keys.

The limitation was that business policies lived in code. Admins could not change cancellation, refund, or availability guidance without a code change.

## What Day 14 Adds

Day 14 adds:

- A `BusinessRule` database model.
- Admin CRUD endpoints for business rules.
- An admin frontend page at `/admin/business-rules`.
- Rule retrieval before answering customer questions.
- Optional OpenAI-powered answer generation from matched rules.
- Safe fallback behavior when OpenAI is not configured or fails.

## Why OpenAI Calls Happen In The Backend

The OpenAI API key must never be exposed to the browser. The frontend calls the existing backend endpoint:

```text
POST /assistant/ask
```

The backend loads business rules, retrieves relevant context, and calls OpenAI if `OPENAI_API_KEY` is configured.

## Why Admin Rules Ground The Assistant

The assistant should answer from business-controlled policy, not imagination.

Admins can create rules for:

- Cancellation policy.
- Refund policy.
- Booking requirements.
- Pricing explanations.
- Late arrival policy.
- Admin confirmation rules.
- Time slot availability rules.
- Customer login requirements.

Only active rules are used as primary grounding context.

## How The Assistant Avoids Inventing Policies

The backend always performs deterministic retrieval first:

1. Load active `BusinessRule` records.
2. Score rules against the customer question using simple word overlap.
3. Select the top relevant rules.
4. Optionally include a matched FAQ as fallback context.
5. If OpenAI is configured, send only the matched rules and FAQ context.
6. Instruct OpenAI not to invent policies.
7. If context is insufficient, the assistant should say the business rules do not specify the answer.

If OpenAI is not configured, the backend returns the best matched rule content directly.

## BusinessRule Model

```prisma
model BusinessRule {
  id        String   @id @default(cuid())
  title     String
  category  String
  content   String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

`DELETE /business-rules/:id` is a soft delete. It sets `isActive=false` so the old rule remains in the database but no longer grounds assistant answers.

## Admin Rule Management

Admin-only endpoints:

```text
GET /business-rules
POST /business-rules
PATCH /business-rules/:id
DELETE /business-rules/:id
```

The admin UI at `/admin/business-rules` lets admins:

- View rules.
- Filter by category.
- Create a rule.
- Edit a rule.
- Deactivate a rule.

## Environment Setup

Add this to `backend/.env` manually:

```env
OPENAI_API_KEY="your-api-key"
OPENAI_MODEL="gpt-5.6"
```

If `OPENAI_API_KEY` is empty or missing, the assistant still works in retrieval fallback mode.

## Migration And Seed

Run from `backend/` after starting the database manually:

```cmd
npx prisma migrate dev --name add_business_rules
npm run seed
```

The seed script creates default rules for cancellation, refunds, login requirements, availability, confirmations, late arrivals, and pricing.

## Manual Testing Steps

Start the backend and frontend:

```cmd
cd backend
npm run start:dev
```

```cmd
cd frontend
npm run dev
```

Test admin rule management:

1. Log in as `admin@example.com / Password123!`.
2. Open `http://localhost:5173/admin/business-rules`.
3. Create a new rule.
4. Edit the rule.
5. Deactivate the rule.

Test assistant fallback:

1. Leave `OPENAI_API_KEY` empty.
2. Ask `What is the cancellation policy?`.
3. Confirm the assistant shows retrieval fallback mode and matched rule details.

Test OpenAI mode:

1. Add `OPENAI_API_KEY` to `backend/.env`.
2. Restart the backend.
3. Ask `What is the cancellation policy?`.
4. Confirm the assistant shows OpenAI mode and cites matched rules.

Test insufficient context:

```cmd
curl -X POST http://localhost:3000/assistant/ask -H "Content-Type: application/json" -d "{\"question\":\"Do you offer free parking?\"}"
```

The answer should say the business rules do not specify the answer.

## Day 14 Acceptance Criteria

- `BusinessRule` model and migration exist.
- Admins can manage business rules through API and frontend.
- Customers can use the public assistant endpoint.
- Assistant retrieves active business rules before answering.
- OpenAI calls happen only in the backend.
- The frontend never receives or stores `OPENAI_API_KEY`.
- Assistant falls back safely if OpenAI is not configured or fails.
- Frontend and backend builds pass.

## Future Improvement

The simple word-overlap retrieval can later be replaced with embeddings and vector search for better semantic matching across larger business rule and knowledge-base content.
