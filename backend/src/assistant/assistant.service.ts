import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { BusinessRule } from '@prisma/client';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { faqEntries, type FaqEntry } from './faq-data';

type MatchedRule = {
  id: string;
  title: string;
  category: string;
};

type MatchedFaq = {
  sourceId: string;
  matchedQuestion: string;
  category: string;
};

export type AssistantAnswer = {
  answer: string;
  mode: 'openai' | 'retrieval_fallback';
  confidence: number;
  matchedRules: MatchedRule[];
  matchedFaq: MatchedFaq | null;
};

type ScoredItem<T> = {
  item: T;
  score: number;
  matchedTokens: Set<string>;
  questionTokenCount: number;
};

const fallbackAnswer =
  'The business rules do not specify the answer to that question. Please check the services page, your bookings page, or contact the business directly.';

const defaultOpenAiModel = 'gpt-5.6-luna';
const defaultMaxOutputTokens = 300;
const maxAllowedOutputTokens = 500;
const allowedOpenAiModels = new Set([
  'gpt-5.6-luna',
  'gpt-5.4-nano',
  'gpt-5.4-mini',
]);
const lowConfidenceThreshold = 0.35;
const faqPreferenceMargin = 2;
const stopWords = new Set([
  'a',
  'an',
  'and',
  'are',
  'can',
  'did',
  'do',
  'does',
  'for',
  'how',
  'i',
  'if',
  'in',
  'is',
  'it',
  'my',
  'of',
  'on',
  'or',
  'the',
  'to',
  'today',
  'what',
  'when',
  'where',
  'why',
  'you',
]);
const genericTokens = new Set([
  'available',
  'booking',
  'business',
  'customer',
  'page',
  'service',
  'slot',
  'status',
  'time',
]);

@Injectable()
export class AssistantService {
  private readonly openai: OpenAI | null;
  private readonly model: string;
  private readonly maxOutputTokens: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.model = this.getAllowedModel(
      this.configService.get<string>('OPENAI_MODEL'),
    );
    this.maxOutputTokens = this.getMaxOutputTokens(
      this.configService.get<string>('OPENAI_MAX_OUTPUT_TOKENS'),
    );
    this.openai = apiKey ? new OpenAI({ apiKey }) : null;
  }

  async answerQuestion(question: string): Promise<AssistantAnswer> {
    const questionTokens = this.tokenize(question);
    const normalizedQuestion = questionTokens.join(' ');

    if (questionTokens.length === 0) {
      return this.fallbackResponse();
    }

    const activeRules = await this.prisma.businessRule.findMany({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });

    const matchedRules = activeRules
      .map((rule) => this.scoreBusinessRule(rule, questionTokens))
      .filter((match) => match.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const bestFaqMatch = faqEntries
      .map((entry) =>
        this.scoreFaqEntry(entry, questionTokens, normalizedQuestion),
      )
      .sort((a, b) => b.score - a.score)[0];

    const ruleConfidence = this.toConfidence(matchedRules[0]);
    const faqConfidence = this.toConfidence(bestFaqMatch);
    const confidence = Math.max(ruleConfidence, faqConfidence);
    const matchedFaq =
      bestFaqMatch && faqConfidence >= lowConfidenceThreshold
        ? this.toMatchedFaq(bestFaqMatch.item)
        : null;

    if (matchedRules.length === 0 && !matchedFaq) {
      return this.fallbackResponse();
    }

    const fallbackResponse = this.toFallbackAnswer({
      matchedRules,
      matchedFaq,
      bestFaqMatch,
      confidence,
    });

    if (!this.openai) {
      return {
        ...fallbackResponse,
        answer: `OpenAI is not configured, so I am showing the best rule-based answer. ${fallbackResponse.answer}`,
      };
    }

    try {
      const response = await this.openai.responses.create({
        model: this.model,
        max_output_tokens: this.maxOutputTokens,
        input: [
          {
            role: 'system',
            content:
              'You are AI BookingMate Assistant. Answer only using the provided business rules and FAQ context. Do not invent policies. Answer in 2-4 short sentences unless the user asks for details. If the answer is not specified in the context, say that the business rules do not specify this and suggest contacting the business.',
          },
          {
            role: 'user',
            content: [
              `Customer question: ${question}`,
              '',
              'Matched business rules:',
              this.formatRulesForPrompt(matchedRules),
              '',
              'FAQ fallback context:',
              matchedFaq
                ? this.formatFaqForPrompt(matchedFaq.sourceId)
                : 'No relevant FAQ context was found.',
              '',
              'Write a concise customer-friendly answer.',
            ].join('\n'),
          },
        ],
      });

      const generatedAnswer = response.output_text.trim();

      if (!generatedAnswer) {
        return fallbackResponse;
      }

      return {
        ...fallbackResponse,
        answer: generatedAnswer,
        mode: 'openai',
      };
    } catch {
      return fallbackResponse;
    }
  }

  private scoreBusinessRule(
    rule: BusinessRule,
    questionTokens: string[],
  ): ScoredItem<BusinessRule> {
    const titleTokens = this.tokenize(rule.title);
    const categoryTokens = this.tokenize(rule.category);
    const contentTokens = this.tokenize(rule.content);
    let score = 0;
    const matchedTokens = new Set<string>();

    score += this.scoreWeightedTokens({
      searchableTokens: titleTokens,
      questionTokens,
      matchedTokens,
      weight: 3,
    });
    score += this.scoreWeightedTokens({
      searchableTokens: categoryTokens,
      questionTokens,
      matchedTokens,
      weight: 3,
    });
    score += this.scoreWeightedTokens({
      searchableTokens: contentTokens,
      questionTokens,
      matchedTokens,
      weight: 1,
    });

    return {
      item: rule,
      score,
      matchedTokens,
      questionTokenCount: questionTokens.length,
    };
  }

  private scoreFaqEntry(
    entry: FaqEntry,
    questionTokens: string[],
    normalizedQuestion: string,
  ): ScoredItem<FaqEntry> {
    const keywordTokens = entry.keywords.flatMap((keyword) =>
      this.tokenize(keyword),
    );
    const faqQuestionTokens = this.tokenize(entry.question);
    const faqAnswerTokens = this.tokenize(entry.answer);
    const normalizedFaqQuestion = faqQuestionTokens.join(' ');
    let score = 0;
    const matchedTokens = new Set<string>();

    if (normalizedQuestion && normalizedQuestion === normalizedFaqQuestion) {
      score += 12;
    } else if (
      normalizedQuestion &&
      normalizedFaqQuestion.includes(normalizedQuestion)
    ) {
      score += 8;
    }

    score += this.scoreWeightedTokens({
      searchableTokens: faqQuestionTokens,
      questionTokens,
      matchedTokens,
      weight: 4,
    });
    score += this.scoreWeightedTokens({
      searchableTokens: keywordTokens,
      questionTokens,
      matchedTokens,
      weight: 2,
    });
    score += this.scoreWeightedTokens({
      searchableTokens: faqAnswerTokens,
      questionTokens,
      matchedTokens,
      weight: 0.5,
    });

    return {
      item: entry,
      score,
      matchedTokens,
      questionTokenCount: questionTokens.length,
    };
  }

  private toConfidence(match: ScoredItem<unknown> | undefined) {
    if (!match) {
      return 0;
    }

    const coverage = match.matchedTokens.size / match.questionTokenCount;
    const scoreBoost = Math.min(match.score / (match.questionTokenCount * 4), 1);

    return Number(Math.min((coverage + scoreBoost) / 2, 1).toFixed(2));
  }

  private toFallbackAnswer({
    matchedRules,
    matchedFaq,
    bestFaqMatch,
    confidence,
  }: {
    matchedRules: ScoredItem<BusinessRule>[];
    matchedFaq: MatchedFaq | null;
    bestFaqMatch?: ScoredItem<FaqEntry>;
    confidence: number;
  }): AssistantAnswer {
    const bestRule = matchedRules[0]?.item;
    const bestRuleScore = matchedRules[0]?.score ?? 0;
    const bestFaqScore = bestFaqMatch?.score ?? 0;
    const faqEntry = matchedFaq
      ? faqEntries.find((entry) => entry.id === matchedFaq.sourceId)
      : undefined;

    if (faqEntry && bestFaqScore + faqPreferenceMargin >= bestRuleScore) {
      return {
        answer: faqEntry.answer,
        mode: 'retrieval_fallback',
        confidence,
        matchedRules: matchedRules.map((match) => this.toMatchedRule(match.item)),
        matchedFaq,
      };
    }

    if (bestRule) {
      return {
        answer: bestRule.content,
        mode: 'retrieval_fallback',
        confidence,
        matchedRules: matchedRules.map((match) => this.toMatchedRule(match.item)),
        matchedFaq,
      };
    }

    return {
      answer: faqEntry?.answer ?? fallbackAnswer,
      mode: 'retrieval_fallback',
      confidence,
      matchedRules: [],
      matchedFaq,
    };
  }

  private toMatchedRule(rule: BusinessRule): MatchedRule {
    return {
      id: rule.id,
      title: rule.title,
      category: rule.category,
    };
  }

  private toMatchedFaq(entry: FaqEntry): MatchedFaq {
    return {
      sourceId: entry.id,
      matchedQuestion: entry.question,
      category: entry.category,
    };
  }

  private formatRulesForPrompt(matchedRules: ScoredItem<BusinessRule>[]) {
    if (matchedRules.length === 0) {
      return 'No relevant business rules were found.';
    }

    return matchedRules
      .map(
        (match, index) =>
          `${index + 1}. ${match.item.title} (${match.item.category}): ${
            match.item.content
          }`,
      )
      .join('\n');
  }

  private formatFaqForPrompt(sourceId: string) {
    const entry = faqEntries.find((faqEntry) => faqEntry.id === sourceId);

    if (!entry) {
      return 'No relevant FAQ context was found.';
    }

    return `${entry.question} (${entry.category}): ${entry.answer}`;
  }

  private tokenize(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .map((token) => this.normalizeToken(token))
      .filter((token) => token.length > 1 && !stopWords.has(token));
  }

  private normalizeToken(token: string) {
    if (token.endsWith('ies') && token.length > 4) {
      return `${token.slice(0, -3)}y`;
    }

    if (token.endsWith('s') && token.length > 3) {
      return token.slice(0, -1);
    }

    return token;
  }

  private getAllowedModel(configuredModel: string | undefined) {
    if (configuredModel && allowedOpenAiModels.has(configuredModel)) {
      return configuredModel;
    }

    return defaultOpenAiModel;
  }

  private getMaxOutputTokens(configuredValue: string | undefined) {
    const parsedValue = Number(configuredValue);

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      return defaultMaxOutputTokens;
    }

    return Math.min(Math.floor(parsedValue), maxAllowedOutputTokens);
  }

  private scoreWeightedTokens({
    searchableTokens,
    questionTokens,
    matchedTokens,
    weight,
  }: {
    searchableTokens: string[];
    questionTokens: string[];
    matchedTokens: Set<string>;
    weight: number;
  }) {
    let score = 0;

    for (const token of questionTokens) {
      if (searchableTokens.includes(token)) {
        const adjustedWeight = genericTokens.has(token) ? weight * 0.5 : weight;
        score += adjustedWeight;
        matchedTokens.add(token);
      }
    }

    return score;
  }

  private fallbackResponse(): AssistantAnswer {
    return {
      answer: fallbackAnswer,
      mode: 'retrieval_fallback',
      confidence: 0,
      matchedRules: [],
      matchedFaq: null,
    };
  }
}
