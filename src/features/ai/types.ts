/**
 * AI insights domain contracts. `lib/ai` provides the provider-agnostic
 * client; this module defines the shape of insights the feature will
 * surface once a UI and API route are built on top of it.
 */
export type AiInsightCategory = 'spending' | 'budget' | 'savings' | 'anomaly';

export type AiInsight = {
  id: string;
  category: AiInsightCategory;
  title: string;
  summary: string;
  generatedAt: string;
};

export type AiInsightRequest = {
  userId: string;
  periodFrom: string;
  periodTo: string;
};
