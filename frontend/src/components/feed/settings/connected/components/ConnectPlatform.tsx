import { capitalize } from "../../../../../utils/string";
import { Platform, PlatformName } from "@crosspost/types";
import { Twitter } from "lucide-react";
import React from "react";
import { useToast } from "../../../../../hooks/use-toast";
import { useConnectAccount } from "../../../../../store/platformAccountsStore";
import { Button } from "../../../../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../../../ui/tooltip";

interface ConnectPlatformProps {
  platform: PlatformName;
  className?: string;
  variant?:
    | "default"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
}

export function ConnectPlatform({
  platform,
  className = "",
  variant = "default",
  size = "sm",
  showIcon = true,
}: ConnectPlatformProps) {
  const connectAccount = useConnectAccount();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = React.useState(false);

  const handleConnect = async () => {
    if (isConnecting) return;

    setIsConnecting(true);
    const loadingToast = toast({
      title: `Connecting to ${capitalize(platform)}...`,
      description: "Please follow the instructions in the popup window.",
      duration: Infinity,
    });

    try {
        console.log('platform', platform);
      await connectAccount.mutateAsync({
        platform: platform as any,
      });

      loadingToast.update({
        title: `${capitalize(platform)} Account Connected!`,
        description: "Your account is now linked and ready to use.",
        variant: "success",
        duration: 5000,
      });
    } catch (error) {
      console.error(error);
      let errorMessage = `Failed to connect ${capitalize(platform)} account`;

      if (error instanceof Error) {
        if (
          error.message === "Popup blocked. Please allow popups for this site."
        ) {
          errorMessage = "Please allow popups to connect your account";
        } else if (error.message === "Authentication cancelled by user.") {
          errorMessage = "Connection cancelled";
        } else {
          errorMessage = error.message;
        }
      }

      loadingToast.update({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleConnect}
            disabled={isConnecting || connectAccount.isPending}
            size={size}
            variant={variant}
            className={`gap-2 ${className}`}
          >
            {showIcon && (
              <>
                {platform === Platform.TWITTER ? (
                  <Twitter size={size === "sm" ? 18 : 24} />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={size === "sm" ? 16 : 20}
                    height={size === "sm" ? 16 : 20}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                )}
              </>
            )}
            {isConnecting || connectAccount.isPending
              ? "Connecting..."
              : `Connect ${capitalize(platform)} Account`}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          To connect a different social account than the one currently logged
          in, open this page in an incognito window and try again
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
