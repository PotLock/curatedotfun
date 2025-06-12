import { Switch } from "./ui/switch";
import { Button } from "./ui/button";
import { useFeedCreationStore } from "../store/feed-creation-store";

export default function PublishingIntegrations() {
  const {
    telegramEnabled,
    telegramChannelId,
    telegramThreadId,
    setTelegramConfig,
  } = useFeedCreationStore();

  return (
    <div className="border border-gray-200 rounded-lg ">
      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-blue-50 gap-4 md:gap-0">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M12 24C18.6274 24 24 18.6274 24 12C24 5.3726 18.6274 0 12 0C5.3726 0 0 5.3726 0 12C0 18.6274 5.3726 24 12 24Z"
                  fill="url(#paint0_linear_2539_11306)"
                />
                <path
                  d="M4.46882 12.5872C5.87161 11.8145 7.43751 11.1696 8.90061 10.5214C11.4177 9.45968 13.9448 8.41638 16.4974 7.44508C16.9941 7.27958 17.8864 7.11773 17.9739 7.85373C17.926 8.89553 17.7289 9.93123 17.5937 10.9669C17.2506 13.2445 16.854 15.5143 16.4672 17.7844C16.334 18.5406 15.3867 18.932 14.7806 18.4481C13.324 17.4642 11.8562 16.4899 10.4182 15.4832C9.94716 15.0046 10.384 14.3172 10.8047 13.9754C12.0044 12.7931 13.2767 11.7886 14.4137 10.5452C14.7204 9.80458 13.8142 10.4288 13.5153 10.62C11.8729 11.7518 10.2707 12.9527 8.53906 13.9474C7.65456 14.4343 6.62366 14.0182 5.73956 13.7465C4.94685 13.4183 3.78524 13.0877 4.46874 12.5872L4.46882 12.5872Z"
                  fill="white"
                />
                <defs>
                  <linearGradient
                    id="paint0_linear_2539_11306"
                    x1="9.0014"
                    y1="1.0008"
                    x2="3.0014"
                    y2="15"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stop-color="#37AEE2" />
                    <stop offset="1" stop-color="#1E96C8" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold font-">Telegram</p>
              <p className="text-sm text-gray-500">
                Publish Content to Telegram channels or groups
              </p>
            </div>
          </div>
          {/* <div className="px-3 py-2 flex gap-[4px] bg-white border font-sans border-neutral-600 rounded-md text-sm font-medium self-start md:self-auto">
            <div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <g clipPath="url(#clip0_2539_9441)">
                  <path
                    d="M12.0607 6.91406C12.6909 7.14901 13.2517 7.53908 13.6912 8.0482C14.1307 8.55731 14.4348 9.16902 14.5752 9.82677C14.7157 10.4845 14.688 11.1671 14.4947 11.8113C14.3015 12.4555 13.9489 13.0406 13.4697 13.5125C12.9904 13.9843 12.3999 14.3277 11.7527 14.5109C11.1055 14.694 10.4226 14.7111 9.76717 14.5604C9.11169 14.4097 8.50479 14.0961 8.0026 13.6487C7.5004 13.2013 7.11913 12.6345 6.89404 12.0007M4.66732 4.00065H5.33398V6.66732M11.1407 9.25391L11.6074 9.72724L9.72738 11.6072M9.33398 5.33398C9.33398 7.54312 7.54312 9.33398 5.33398 9.33398C3.12485 9.33398 1.33398 7.54312 1.33398 5.33398C1.33398 3.12485 3.12485 1.33398 5.33398 1.33398C7.54312 1.33398 9.33398 3.12485 9.33398 5.33398Z"
                    stroke="#525252"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_2539_9441">
                    <rect width="16" height="16" fill="white" />
                  </clipPath>
                </defs>
              </svg>
            </div>
            150 $CURATE
          </div> */}
        </div>
        <div className="flex items-center gap-4 self-end md:self-auto">
          <Switch
            checked={telegramEnabled}
            onCheckedChange={(checked) =>
              setTelegramConfig({ telegramEnabled: checked })
            }
          />
        </div>
      </div>
      <div className=" ">
        {telegramEnabled && (
          <div className="space-y-4 md:space-y-6 border-t pt-4 md:pt-6 p-4 bg-white">
            {/* <div className="space-y-2">
              <label className="text-sm font-medium">Bot Token</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md text-sm md:text-base"
                placeholder="Enter your bot token"
              />
              <p className="text-xs text-gray-500">
                Your Telegram bot token from @BotFather
              </p>
            </div> */}

            <div className="space-y-2">
              <label className="text-sm font-medium">Channel ID</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md text-sm md:text-base"
                placeholder="Enter channel username or ID"
                value={telegramChannelId}
                onChange={(e) =>
                  setTelegramConfig({ telegramChannelId: e.target.value })
                }
              />
              <p className="text-xs text-gray-500">
                Username or ID of your Channel/group
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Thread ID (optional)
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md text-sm md:text-base"
                placeholder="Enter thread ID if applicable"
                value={telegramThreadId}
                onChange={(e) =>
                  setTelegramConfig({ telegramThreadId: e.target.value })
                }
              />
            </div>

            <div className="flex flex-col md:flex-row gap-3 md:gap-0 md:justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  // Optionally clear fields when closing, or just hide the section
                  setTelegramConfig({ telegramEnabled: false });
                }}
                className="order-2 md:order-1"
              >
                Close
              </Button>
              <Button
                className="order-1 md:order-2"
                onClick={() => {
                  // Data is already in the store due to onChange handlers
                  // This button can be used for explicit save confirmation if needed
                  // or to trigger other actions. For now, it doesn't need to do much
                  // if we rely on onChange to update the store.
                  // We can add a toast notification here if desired.
                  console.log("Telegram settings saved to store:", {
                    telegramChannelId,
                    telegramThreadId,
                  });
                }}
              >
                Save
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
