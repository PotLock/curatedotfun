import { useFormContext } from "react-hook-form";
import { Switch } from "./ui/switch";
import { Button } from "./ui/button";
import { FormControl, FormField, FormItem, FormLabel } from "./ui/form";
import { Input } from "./ui/input";

export default function PublishingIntegrations() {
  const { control, watch, setValue } = useFormContext();
  const telegramEnabled = watch("telegramEnabled");

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
        </div>
        <div className="flex items-center gap-4 self-end md:self-auto">
          <FormField
            control={control}
            name="telegramEnabled"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </div>
      <div className=" ">
        {telegramEnabled && (
          <div className="space-y-4 md:space-y-6 border-t pt-4 md:pt-6 p-4 bg-white">
            <FormField
              control={control}
              name="telegramChannelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel ID</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter channel username or ID"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-gray-500">
                    Username or ID of your Channel/group
                  </p>
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="telegramThreadId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Thread ID (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter thread ID if applicable"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex flex-col md:flex-row gap-3 md:gap-0 md:justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setValue("telegramEnabled", false);
                }}
                className="order-2 md:order-1"
              >
                Close
              </Button>
              <Button
                className="order-1 md:order-2"
                onClick={() => {
                  console.log("Telegram settings saved to store:");
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
