import { create, StateCreator } from "zustand";
import type { DistributorConfig, CreateFeedConfig } from "@curatedotfun/types";
import { immer } from "zustand/middleware/immer";
import { set, groupBy } from "lodash";

const TELEGRAM_PLUGIN_NAME = "@curatedotfun/telegram-distributor";

export type Approver = {
  handle: string;
  platform: string;
};

type FeedCreationState = {
  feedConfig: CreateFeedConfig;
  approvers: Approver[];
  setValue: (path: string, value: unknown) => void;
  setValues: (values: CreateFeedConfig) => void;
  setTelegramConfig: (config: {
    enabled?: boolean;
    channelId?: string;
    threadId?: string;
  }) => void;
  setApprovers: (approvers: Approver[]) => void;
};

const feedCreationStateCreator: StateCreator<
  FeedCreationState,
  [["zustand/immer", never]]
> = (setState) => ({
  feedConfig: {
    name: "",
    description: "",
    id: "",
    enabled: true,
    moderation: {
      approvers: {
        twitter: [],
      },
    },
    outputs: {
      stream: {
        enabled: true,
        transform: [
          {
            plugin: "@curatedotfun/object-transform",
            config: {
              mappings: {
                notes: "{{curatorNotes}}",
                author: "{{username}}",
                source: "https://x.com/{{username}}/status/{{tweetId}}",
                content: "{{content}}",
                submittedAt: "{{submittedAt}}",
              },
            },
          },
          {
            plugin: "@curatedotfun/ai-transform",
            config: {
              apiKey: "{{OPENROUTER_API_KEY}}",
              prompt:
                "Summarize the content into a concise news flash, incorporating relevant details from the curator's notes. Maintain a neutral, third-person tone. Mention the author if relevant, or simply convey the information. When processing social media-style content, convert @mentions into markdown links in the format: [@username](https://x.com/username). Ensure all mentions are accurately linked and preserve their original intent.",
              schema: {
                tags: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                  description: "Relevant tags for the content",
                },
                title: {
                  type: "string",
                  description: "Title derived from summary of content",
                },
                summary: {
                  type: "string",
                  description: "Summary of content influenced by curator notes",
                },
              },
            },
          },
        ],
        distribute: [],
      },
    },
  },
  approvers: [],
  setValue: (path, value) => {
    setState((state) => {
      set(state.feedConfig, path, value);
    });
  },
  setValues: (values) => {
    setState((state) => {
      state.feedConfig = { ...state.feedConfig, ...values };
    });
  },
  setTelegramConfig: ({ enabled, channelId, threadId }) => {
    setState((state) => {
      const distribute = state.feedConfig.outputs?.stream?.distribute ?? [];
      const telegramDistributorIndex = distribute.findIndex(
        (d) => d.plugin === TELEGRAM_PLUGIN_NAME,
      );

      if (enabled) {
        const newConfig: DistributorConfig = {
          plugin: TELEGRAM_PLUGIN_NAME,
          config: {
            botToken: "{{TELEGRAM_BOT_TOKEN}}",
            chatId: channelId ?? "",
            messageThreadId: threadId ?? "",
          },
        };
        if (telegramDistributorIndex > -1) {
          distribute[telegramDistributorIndex] = newConfig;
        } else {
          distribute.push(newConfig);
        }
      } else if (telegramDistributorIndex > -1) {
        distribute.splice(telegramDistributorIndex, 1);
      }

      set(state.feedConfig, "outputs.stream.distribute", distribute);
    });
  },
  setApprovers: (approvers) => {
    setState((state) => {
      state.approvers = approvers;
      const groupedByPlatform = groupBy(approvers, "platform");
      const moderationApprovers = Object.entries(groupedByPlatform).reduce(
        (acc, [platform, approversList]) => {
          acc[platform.toLowerCase()] = approversList.map((a) => a.handle);
          return acc;
        },
        {} as Record<string, string[]>,
      );
      set(state.feedConfig, "moderation.approvers", moderationApprovers);
    });
  },
});

export const useFeedCreationStore = create(immer(feedCreationStateCreator));
