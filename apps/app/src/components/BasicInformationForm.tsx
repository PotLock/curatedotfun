import { useAuth } from "../contexts/auth-context";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useFeedCreationStore } from "../store/feed-creation-store";
import { ImageUpload } from "./ImageUpload";
import { Button } from "./ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

const BasicInformationFormSchema = z.object({
  profileImage: z.string().optional(),
  feedName: z.string().min(3, "Feed name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  hashtags: z.string().min(1, "Please provide at least one hashtag"),
});

type FormValues = z.infer<typeof BasicInformationFormSchema>;

export default function BasicInformationForm() {
  const { isSignedIn, handleSignIn } = useAuth();

  const {
    profileImage: storedProfileImage,
    feedName,
    description,
    hashtags,
    setBasicInfo,
  } = useFeedCreationStore();

  const form = useForm<FormValues>({
    resolver: zodResolver(BasicInformationFormSchema),
    defaultValues: {
      profileImage: storedProfileImage || "",
      feedName: feedName || "",
      description: description || "",
      hashtags: hashtags || "",
    },
  });

  const onSubmit = (data: FormValues) => {
    console.log("Form submitted:", data);
    setBasicInfo({
      ...data,
      createdAt: new Date(),
    });
  };

  return (
    <div>
      {isSignedIn ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Image Upload */}
            <FormField
              control={form.control}
              name="profileImage"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ImageUpload
                      label="Profile Image"
                      initialImageUrl={field.value || null}
                      onUploadSuccess={(_ipfsHash, ipfsUrl) => {
                        field.onChange(ipfsUrl);
                        setBasicInfo({ profileImage: ipfsUrl });
                      }}
                      recommendedText="Recommended: Square, at least 400x400px. This will be your feed's avatar."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Feed Name */}
            <FormField
              control={form.control}
              name="feedName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feed Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Name of your feed"
                      required
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setBasicInfo({ feedName: e.target.value });
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
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
                      onChange={(e) => {
                        field.onChange(e);
                        setBasicInfo({ description: e.target.value });
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Hashtags */}
            <FormField
              control={form.control}
              name="hashtags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hashtag (without #)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Tag"
                      required
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setBasicInfo({ hashtags: e.target.value });
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
