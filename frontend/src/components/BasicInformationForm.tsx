import { useEffect, useState } from "react";
import { AuthUserInfo } from "../types/web3auth";
import { useWeb3Auth } from "../hooks/use-web3-auth";
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
import { Button } from "./ui/button";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useAuthStore } from "../store/auth-store";
import { toast } from "../hooks/use-toast";
import { Loading } from "./ui/loading";


const BasicInformationFormSchema = z.object({
  profileImage: z.string().optional(),
  feedName: z.string().min(3, "Feed name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  hashtags: z.string().min(1, "Please provide at least one hashtag"),
});

type FormValues = z.infer<typeof BasicInformationFormSchema>;

export default function BasicInformationForm() {
  const [userInfo, setUserInfo] = useState<Partial<AuthUserInfo>>();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { isLoggedIn, getUserInfo } = useWeb3Auth();
  const { showLoginModal } = useAuthStore();
  const [isLoading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(BasicInformationFormSchema),
    defaultValues: {
      profileImage: "",
      feedName: "",
      description: "",
      hashtags: "",
    },
  });

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const info = await getUserInfo();
        setUserInfo(info);
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    };

    if (isLoggedIn) {
      fetchUserInfo();
    } else {
      setUserInfo({});
    }
  }, [isLoggedIn, getUserInfo]);

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        setLoading(true);
        const formData = new FormData();
        formData.append("file", file);

        if (!import.meta.env.PUBLIC_PINATA_JWT_KEY) {
          throw new Error("Pinata JWT key is not configured");
        }

        const response = await fetch(
          "https://api.pinata.cloud/pinning/pinFileToIPFS",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${import.meta.env.PUBLIC_PINATA_JWT_KEY || ""}`,
            },
            body: formData,
          },
        );

        if (!response.ok) {
          throw new Error("Failed to upload file to Pinata");
        }

        const data = await response.json();
        const ipfsUrl = `https://ipfs.io/ipfs/${data.IpfsHash}`;
        setImagePreview(ipfsUrl);
        form.setValue("profileImage", ipfsUrl);
      } catch (error) {
        console.error("Error uploading file to Pinata:", error);
        toast({
          title: "Upload failed",
          description: "Failed to upload image. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const onSubmit = (data: FormValues) => {
    console.log("Form submitted:", data);
    // Here you would handle the form submission, like sending the data to an API
  };

  return (
    <div>
      {isLoggedIn && userInfo ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Image Upload */}
            <FormField
              control={form.control}
              name="profileImage"
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              render={({ field: { onChange, value, ...rest } }) => (
                <FormItem>
                  {/* <FormLabel>Profile Image</FormLabel> */}
                  <FormControl>
                    <div className="flex items-start flex-col gap-1">
                      <div className="flex gap-4 items-center">
                        <div className="relative h-24 w-24 overflow-hidden rounded-full bg-gray-100 flex items-center justify-center">
                          {imagePreview && !isLoading ? (
                            <img
                              src={imagePreview}
                              alt="Profile Preview"
                              className="h-full w-full object-cover"
                            />
                          ) : userInfo.profileImage ? (
                            <img
                              src={userInfo.profileImage}
                              alt="Profile"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="text-2xl font-medium text-[#64748B]">
                              {userInfo.name
                                ?.split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </div>
                          )}
                          {isLoading && (
                            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                              <Loading />
                            </div>
                          )}
                        </div>
                        <div>
                          <label
                            htmlFor="image-upload"
                            className="inline-flex items-center gap-2 cursor-pointer py-2 px-4 border rounded-md hover:bg-gray-50"
                          >
                            {/* <Upload className="h-4 w-4" /> */}
                            <span>Upload Image</span>
                          </label>
                          <input
                            id="image-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              handleImageUpload(e);
                              onChange(e);
                            }}
                            {...rest}
                          />
                        </div>
                      </div>
                      <p className="text-sm text-[#64748B] font-medium leading-4 ">
                        Recommended: Square image, at least 400x400px
                      </p>
                    </div>
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
                    <Input placeholder="Name of your feed" {...field} />
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
                      {...field}
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
                    <Input placeholder="Tag" {...field} />
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
          <Button onClick={showLoginModal}>Login</Button>
        </div>
      )}
    </div>
  );
}
