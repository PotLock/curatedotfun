import { memo, useState, useEffect } from "react";
import { Control, useController } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../ui/form";
import { Input } from "../../ui/input";
import { FormValues } from "./types";

interface ModerationSectionProps {
  control: Control<FormValues>;
}

function TwitterApproversField({ control }: { control: Control<FormValues> }) {
  const {
    field,
    fieldState: { error },
  } = useController({
    name: "moderationApprovers",
    control,
  });

  const [localValue, setLocalValue] = useState(
    field.value?.twitter?.join(", ") || "",
  );

  // Sync local value when field value changes from external sources (like form reset)
  useEffect(() => {
    const formValue = field.value?.twitter?.join(", ") || "";
    setLocalValue(formValue);
  }, [field.value]);

  return (
    <FormItem>
      <FormLabel>Twitter Approvers (comma-separated usernames)</FormLabel>
      <FormControl>
        <Input
          placeholder="user1, user2, user3"
          value={localValue}
          onChange={(e) => {
            setLocalValue(e.target.value);
          }}
          onBlur={() => {
            const approvers = { ...field.value };
            approvers.twitter = localValue
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            field.onChange(approvers);
          }}
        />
      </FormControl>
      {error && <FormMessage>{error.message}</FormMessage>}
    </FormItem>
  );
}

function TwitterBlacklistField({ control }: { control: Control<FormValues> }) {
  const {
    field,
    fieldState: { error },
  } = useController({
    name: "moderationBlacklist",
    control,
  });

  const [localValue, setLocalValue] = useState(
    field.value?.twitter?.join(", ") || "",
  );

  // Sync local value when field value changes from external sources (like form reset)
  useEffect(() => {
    const formValue = field.value?.twitter?.join(", ") || "";
    setLocalValue(formValue);
  }, [field.value]);

  return (
    <FormItem>
      <FormLabel>Twitter Blacklist (comma-separated usernames)</FormLabel>
      <FormControl>
        <Input
          placeholder="spammer1, bot2, unwanted3"
          value={localValue}
          onChange={(e) => {
            setLocalValue(e.target.value);
          }}
          onBlur={() => {
            const blacklist = { ...field.value };
            blacklist.twitter = localValue
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            field.onChange(blacklist);
          }}
        />
      </FormControl>
      {error && <FormMessage>{error.message}</FormMessage>}
    </FormItem>
  );
}

export const ModerationSection = memo(function ModerationSection({
  control,
}: ModerationSectionProps) {
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <h3 className="font-medium">Moderation Settings</h3>
      <FormDescription>
        Configure content moderation rules and approvers
      </FormDescription>

      <div className="space-y-4">
        <TwitterApproversField control={control} />
        <TwitterBlacklistField control={control} />
      </div>
    </div>
  );
});
