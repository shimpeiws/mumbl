import type {
  FollowUpStatus as FollowUpStatusType,
  IntervalType as IntervalTypeAlias,
} from '../../repositories/types.js';

export type FollowUpStatus = FollowUpStatusType;
export type IntervalType = IntervalTypeAlias;

export interface FollowUp {
  id: string;
  entryId: string;
  scheduledAt: Date;
  intervalType: IntervalType;
  status: FollowUpStatus;
  promptText: string | null;
  responseEntryId: string | null;
  createdAt: Date;
  shownAt: Date | null;
}

export interface FollowUpConfig {
  enabled: boolean;
  defaultInterval: IntervalType;
}

export interface FollowUpEvaluation {
  shouldFollowUp: boolean;
  interval: IntervalType;
  reason: string;
}
