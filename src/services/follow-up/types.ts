export type IntervalType = '1d' | '3d' | '1w';
export type FollowUpStatus = 'pending' | 'shown' | 'dismissed' | 'responded';

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
