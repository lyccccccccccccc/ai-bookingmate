import { ConfigService } from '@nestjs/config'
import type { BusinessRule } from '@prisma/client'
import { AssistantService } from './assistant.service'
import { PrismaService } from '../prisma/prisma.service'

const mockResponsesCreate = jest.fn()

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    responses: {
      create: mockResponsesCreate,
    },
  })),
}))

const parkingRule = {
  id: 'rule-parking',
  title: 'Parking policy',
  category: 'parking',
  content: 'Complimentary parking is available for booked customers.',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
} satisfies BusinessRule

function createConfig(values: Record<string, string | undefined>) {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService
}

function createPrisma(rules: BusinessRule[]) {
  return {
    businessRule: {
      findMany: jest.fn().mockResolvedValue(rules),
    },
  } as unknown as PrismaService
}

describe('AssistantService', () => {
  beforeEach(() => {
    mockResponsesCreate.mockReset()
  })

  it('uses a mocked OpenAI response with retrieved rules as grounding context', async () => {
    mockResponsesCreate.mockResolvedValue({
      output_text: 'Yes. Complimentary parking is available for booked customers.',
    })
    const service = new AssistantService(
      createConfig({
        OPENAI_API_KEY: 'test-key',
        OPENAI_MODEL: 'gpt-5.6-luna',
        OPENAI_MAX_OUTPUT_TOKENS: '300',
      }),
      createPrisma([parkingRule]),
    )

    const answer = await service.answerQuestion(
      'Do you offer complimentary parking?',
    )

    expect(answer).toMatchObject({
      answer: 'Yes. Complimentary parking is available for booked customers.',
      mode: 'openai',
      matchedRules: [expect.objectContaining({ id: parkingRule.id })],
    })
    expect(mockResponsesCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-5.6-luna', max_output_tokens: 300 }),
    )
    expect(JSON.stringify(mockResponsesCreate.mock.calls[0][0].input)).toContain(
      parkingRule.content,
    )
  })

  it('falls back safely when the mocked OpenAI request fails', async () => {
    mockResponsesCreate.mockRejectedValue(new Error('Mocked API failure'))
    const service = new AssistantService(
      createConfig({ OPENAI_API_KEY: 'test-key' }),
      createPrisma([parkingRule]),
    )

    const answer = await service.answerQuestion(
      'Do you offer complimentary parking?',
    )

    expect(answer).toMatchObject({
      answer: parkingRule.content,
      mode: 'retrieval_fallback',
      matchedRules: [expect.objectContaining({ id: parkingRule.id })],
    })
    expect(mockResponsesCreate).toHaveBeenCalledTimes(1)
  })
})
