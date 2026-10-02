import type { CompleteBrief } from '../types';
import { briefSentence } from './brief';

export const CHALLENGE_KEY = 'roulette-ni-snowi:challenge:v1';
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const BUILD_PLAN = [
  { title: 'Define the brand', work: 'Brand concept, positioning, audience, and brand name.' },
  { title: 'Create the identity', work: 'Logo, visual identity, and graphic direction.' },
  { title: 'Build the design system', work: 'Color palette, typography, and reusable UI components.' },
  { title: 'Design the website', work: 'Content, page structure, and responsive website design.' },
  { title: 'Develop the website', work: 'Build the experience. Test interactions and accessibility.' },
  { title: 'Bring it into the world', work: 'Brand assets, mockups, and final website refinements.' },
  { title: 'Finish and show your work', work: 'A complete brand presentation and a live website showcase.' },
] as const;

export type Challenge = {
  brief: CompleteBrief;
  drawnAt: number;
  acceptedAt: number | null;
  finishedAt: number | null;
  completed: boolean[];
};

const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 80;
const timestamp = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 8.64e15 - WEEK_MS;

export function isChallenge(value: unknown): value is Challenge | null {
  if (value === null) return true;
  if (!value || typeof value !== 'object') return false;
  const c = value as Challenge;
  return !!c.brief && text(c.brief.brand) && text(c.brief.category)
    && (c.brief.mood === null || text(c.brief.mood))
    && timestamp(c.drawnAt)
    && (c.acceptedAt === null || (timestamp(c.acceptedAt) && c.acceptedAt >= c.drawnAt))
    && (c.finishedAt === null || (c.acceptedAt !== null && timestamp(c.finishedAt) && c.finishedAt >= c.acceptedAt))
    && Array.isArray(c.completed) && c.completed.length === BUILD_PLAN.length
    && c.completed.every(item => typeof item === 'boolean')
    && (c.finishedAt === null || c.completed.every(Boolean));
}

export function createChallenge(brief: CompleteBrief): Challenge {
  return { brief, drawnAt: Date.now(), acceptedAt: null, finishedAt: null, completed: BUILD_PLAN.map(() => false) };
}

export function challengeSentence(brief: CompleteBrief): string {
  return `${briefSentence(brief)} Deliver the identity, design system, website, brand assets, mockups, and final showcase.`;
}
