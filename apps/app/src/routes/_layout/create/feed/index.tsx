import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { ImageUpload } from "@/components/ImageUpload";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { useFeedCreationStore } from "@/store/feed-creation-store";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { FeedWrappedResponse, FeedsWrappedResponse } from "@curatedotfun/types";

const BasicInformationFormSchema = z.object({
  name: z.string().min(3, "Feed name must be at least 3 characters").optional(),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .optional(),
  id: z.string().min(1, "Please provide at least one hashtag").optional(),
  image: z.string().optional(),
});

type FormValues = z.infer<typeof BasicInformationFormSchema>;

export const Route = createFileRoute("/_layout/create/feed/")({
  validateSearch: BasicInformationFormSchema,
  component: BasicInformationComponent,
});

function BasicInformationComponent() {
  const { isSignedIn, handleSignIn } = useAuth();
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const { feedConfig, setValues } = useFeedCreationStore();
  const queryClient = useQueryClient();
  const [isValidatingName, setIsValidatingName] = useState(false);
  const [isValidatingId, setIsValidatingId] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(BasicInformationFormSchema),
    defaultValues: {
      name: search.name ?? feedConfig.name ?? "",
      description: search.description ?? feedConfig.description ?? "",
      id: search.id ?? feedConfig.id ?? "",
      image: search.image ?? feedConfig.image ?? "",
    },
  });

  const onSubmit = (data: FormValues) => {
    setValues(data);
    navigate({
      to: "/create/feed/settings",
    });
  };

  const checkFeedId = async (id: string) => {
    if (!id) {
      form.clearErrors("id");
      return;
    }
    setIsValidatingId(true);
    try {
      const data = await queryClient.fetchQuery({
        queryKey: ["feed-details", id],
        queryFn: () =>
          apiClient.makeRequest<FeedWrappedResponse>("GET", `/feeds/${id}`),
        retry: false,
      });
      if (data?.data) {
        form.setError("id", {
          type: "manual",
          message: "This hashtag is already taken.",
        });
      } else {
        form.clearErrors("id");
      }
    } catch {
      form.clearErrors("id");
    } finally {
      setIsValidatingId(false);
    }
  };

  const checkFeedName = async (name: string) => {
    if (!name || name.length < 3) {
      form.clearErrors("name");
      return;
    }
    setIsValidatingName(true);
    try {
      const data = await queryClient.fetchQuery({
        queryKey: ["feeds"],
        queryFn: () =>
          apiClient.makeRequest<FeedsWrappedResponse>("GET", "/feeds"),
        retry: false,
      });
      const existingFeed = data?.data?.find(
        (feed) => feed.name.toLowerCase() === name.toLowerCase()
      );
      if (existingFeed) {
        form.setError("name", {
          type: "manual",
          message: "This feed name is already taken.",
        });
      } else {
        form.clearErrors("name");
      }
    } catch {
      form.clearErrors("name");
    } finally {
      setIsValidatingName(false);
    }
  };

  return (
    <div>
      {isSignedIn ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ImageUpload
                      label="Profile Image"
                      initialImageUrl={field.value || null}
                      onUploadSuccess={(_ipfsHash, ipfsUrl) => {
                        field.onChange(ipfsUrl);
                      }}
                      recommendedText="Recommended: Square, at least 400x400px. This will be your feed's avatar."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feed Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Name of your feed"
                      required
                      {...field}
                      onBlur={(e) => {
                        field.onBlur();
                        checkFeedName(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Description"
                      className="min-h-[100px]"
                      required
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hashtag (without #)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Tag"
                      required
                      {...field}
                      onChange={(e) => {
                        field.onChange(e.target.value.toLowerCase());
                      }}
                      onBlur={(e) => {
                        field.onBlur();
                        checkFeedId(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-sm font-normal text-[#64748b]">
                    This will be used as a unique identifier for your feed.
                  </p>
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={form.formState.isSubmitting || isValidatingName || isValidatingId}>
                {form.formState.isSubmitting ? "..." : isValidatingName || isValidatingId ? "Validating..." : "Next"}
              </Button>
            </div>
          </form>
        </Form>
      ) : (
        <div className="flex flex-col items-center justify-center py-10">
          <p className="mb-4 text-gray-600">Please login to create a feed</p>
          <Button onClick={handleSignIn}>Login</Button>
        </div>
      )}
    </div>
  );
}
