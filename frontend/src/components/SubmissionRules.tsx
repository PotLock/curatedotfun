import { Info } from "lucide-react";
import { useFeedCreationStore } from "../store/feed-creation-store";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

export default function SubmissionRules() {
  const { submissionRules, setSubmissionRules } = useFeedCreationStore();
  const {
    minFollowers,
    minFollowersEnabled,
    minAccountAge,
    minAccountAgeEnabled,
    blueTickVerified,
    cryptoSettingsEnabled,
  } = submissionRules;

  return (
    <div className="w-full space-y-6 py-4">
      {/* Minimum Followers */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="minFollowers"
            checked={minFollowersEnabled}
            onCheckedChange={(checked) => {
              if (checked === true) {
                setSubmissionRules({ minFollowersEnabled: true });
              } else {
                // Reset minFollowers to 0 when disabling the checkbox
                setSubmissionRules({
                  minFollowersEnabled: false,
                  minFollowers: 0,
                });
              }
            }}
            className="h-4 w-4 rounded-[4px]"
          />
          <Label
            htmlFor="minFollowers"
            className="text-base font-medium flex items-center gap-2"
          >
            Minimum Followers
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-gray-500" />
                </TooltipTrigger>
                <TooltipContent>
                  Set a minimum follower count requirement
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
        </div>
        <Input
          id="minFollowersInput"
          className="h-12 border rounded-lg"
          type="number"
          value={minFollowers}
          onChange={(e) => {
            const value = e.target.value;
            const parsedValue = parseInt(value, 10);

            // Only update if it's a valid non-negative number
            if (!isNaN(parsedValue) && parsedValue >= 0) {
              setSubmissionRules({ minFollowers: parsedValue });
            } else if (value === "") {
              // Handle empty input by setting to 0
              setSubmissionRules({ minFollowers: 0 });
            }
            // If invalid (negative or NaN), we don't update the state
          }}
          disabled={!minFollowersEnabled}
        />
      </div>

      {/* Minimum Account Age */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="minAccountAge"
            checked={minAccountAgeEnabled}
            onCheckedChange={(checked) => {
              if (checked === true) {
                setSubmissionRules({ minAccountAgeEnabled: true });
              } else {
                // Reset minAccountAge to 0 when disabling the checkbox
                setSubmissionRules({
                  minAccountAgeEnabled: false,
                  minAccountAge: 0,
                });
              }
            }}
            className="h-4 w-4 rounded-[4px]"
          />
          <Label
            htmlFor="minAccountAge"
            className="text-base font-medium flex items-center gap-2"
          >
            Minimum Account Age
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-gray-500" />
                </TooltipTrigger>
                <TooltipContent>
                  Set a minimum account age requirement in days
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
        </div>
        <Input
          id="minAccountAgeInput"
          className="h-12 border rounded-lg"
          type="number"
          value={minAccountAge}
          onChange={(e) => {
            const value = e.target.value;
            const parsedValue = parseInt(value, 10);

            // Only update if it's a valid non-negative number
            if (!isNaN(parsedValue) && parsedValue >= 0) {
              setSubmissionRules({ minAccountAge: parsedValue });
            } else if (value === "") {
              // Handle empty input by setting to 0
              setSubmissionRules({ minAccountAge: 0 });
            }
            // If invalid (negative or NaN), we don't update the state
          }}
          disabled={!minAccountAgeEnabled}
        />
      </div>

      {/* Blue Tick (Verified Account) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label
            htmlFor="blueTickVerified"
            className="text-base font-medium flex items-center gap-2"
          >
            Blue Tick (Verified Account)
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-gray-500" />
                </TooltipTrigger>
                <TooltipContent>
                  Require users to have a verified account
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
        </div>
        <Switch
          id="blueTickVerified"
          checked={blueTickVerified}
          onCheckedChange={(checked) =>
            setSubmissionRules({ blueTickVerified: checked })
          }
        />
      </div>

      {/* Crypto Settings Enabled */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label
            htmlFor="cryptoSettings"
            className="text-base font-medium flex items-center gap-2"
          >
            Crypto Settings Enabled
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-gray-500" />
                </TooltipTrigger>
                <TooltipContent>
                  Enable cryptocurrency settings for submissions
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
        </div>
        <Switch
          id="cryptoSettings"
          checked={cryptoSettingsEnabled}
          onCheckedChange={(checked) =>
            setSubmissionRules({ cryptoSettingsEnabled: checked })
          }
        />
      </div>
    </div>
  );
}
