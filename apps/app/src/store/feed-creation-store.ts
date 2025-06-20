import { create } from "zustand";

export interface FeedCreationState {
  // Basic Information
  profileImage: string;
  feedName: string;
  description: string;
  hashtags: string;
  createdAt: Date | null;

  // Approvers
  approvers: Array<{
    id: number;
    name: string;
    handle: string;
  }>;

  // Submission Rules
  submissionRules: {
    minFollowers: number;
    minFollowersEnabled: boolean;
    minAccountAge: number;
    minAccountAgeEnabled: boolean;
    blueTickVerified: boolean;
    cryptoSettingsEnabled: boolean;
  };

  // Telegram Configuration
  telegramEnabled: boolean;
  telegramChannelId: string;
  telegramThreadId: string;

  // Actions
  setBasicInfo: (data: {
    profileImage?: string;
    feedName?: string;
    description?: string;
    hashtags?: string;
    createdAt?: Date;
  }) => void;

  setApprovers: (
    approvers: Array<{
      id: number;
      name: string;
      handle: string;
    }>,
  ) => void;

  setSubmissionRules: (rules: {
    minFollowers?: number;
    minFollowersEnabled?: boolean;
    minAccountAge?: number;
    minAccountAgeEnabled?: boolean;
    blueTickVerified?: boolean;
    cryptoSettingsEnabled?: boolean;
  }) => void;

  setTelegramConfig: (data: {
    telegramEnabled?: boolean;
    telegramChannelId?: string;
    telegramThreadId?: string;
  }) => void;
}

export const useFeedCreationStore = create<FeedCreationState>((set) => ({
  // Basic Information
  profileImage: "",
  feedName: "",
  description: "",
  hashtags: "",
  createdAt: new Date(),

  // Approvers
  approvers: [],

  // Submission Rules
  submissionRules: {
    minFollowers: 1000,
    minFollowersEnabled: true,
    minAccountAge: 30,
    minAccountAgeEnabled: true,
    blueTickVerified: true,
    cryptoSettingsEnabled: false,
  },

  // Telegram Configuration
  telegramEnabled: false,
  telegramChannelId: "",
  telegramThreadId: "",

  // Actions
  setBasicInfo: (data) =>
    set((state) => ({
      ...state,
      ...data,
    })),

  setApprovers: (approvers) =>
    set((state) => ({
      ...state,
      approvers,
    })),

  setSubmissionRules: (rules) =>
    set((state) => ({
      ...state,
      submissionRules: {
        ...state.submissionRules,
        ...rules,
      },
    })),

  setTelegramConfig: (data) =>
    set((state) => ({
      ...state,
      ...data,
    })),
}));
