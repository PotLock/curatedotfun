import React, { useState, useEffect } from "react";
import { useWeb3Auth } from "../hooks/use-web3-auth";
import { Button } from "./ui/button"; // Assuming you have shadcn/ui Button
import { Input } from "./ui/input"; // Assuming you have shadcn/ui Input
import { Label } from "./ui/label"; // Assuming you have shadcn/ui Label
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  // DialogClose, // Removed as it's not explicitly used here
} from "./ui/dialog"; // Assuming shadcn/ui Dialog

interface CreateNearAccountModalProps {
  isOpen: boolean;
  onClose: () => void; // Function to call when the modal should close (e.g., set isOpen to false)
}

export const CreateNearAccountModal = ({ isOpen, onClose }: CreateNearAccountModalProps) => {
  const {
    nearPublicKey,
    getUserInfo,
    web3auth, // Needed for authenticateUser to get ID token
    setCurrentUserProfile, // To update profile state on success
    logout, // Allow user to cancel/logout
  } = useWeb3Auth();
  const [chosenUsername, setChosenUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nearAccountSuffix = ".users.curatedotfun.near"; // Make this configurable if needed

  // Reset state when modal opens/closes or relevant context changes
  useEffect(() => {
    if (isOpen) {
      setChosenUsername("");
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    // Optionally, you could force logout if they close without creating
    // logout(); // Uncomment if you want to force logout on close
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chosenUsername || !nearPublicKey || !web3auth) return;

    // Basic validation
    if (!/^[a-z0-9]+$/.test(chosenUsername) || chosenUsername.length < 2 || chosenUsername.length > 32) {
      setError("Username must be 2-32 characters, lowercase letters and numbers only.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get user info again to ensure we have fresh data if needed
      // Primarily need sub_id which is stable, but good practice
      const userInfo = await getUserInfo();

      // Get ID token for backend auth
      const idToken = await web3auth.authenticateUser();

      // Call backend POST /api/users
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken.idToken}`,
        },
        body: JSON.stringify({
          chosen_username: chosenUsername.toLowerCase(),
          near_public_key: nearPublicKey,
          user_info: { // Send optional info if available
            name: userInfo.name,
            email: userInfo.email,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific errors from backend if provided
        throw new Error(data.error || `Failed to create account (HTTP ${response.status})`);
      }

      // Success! Update the profile state in the context
      setCurrentUserProfile(data.profile);
      console.log("Account and profile created successfully:", data.profile);
      onClose(); // Close the modal on success

    } catch (err: unknown) {
      console.error("Error creating account:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Use Dialog component from shadcn/ui
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px]" onEscapeKeyDown={handleClose} onPointerDownOutside={handleClose}>
        <DialogHeader>
          <DialogTitle>Choose Your NEAR Account Name</DialogTitle>
          <DialogDescription>
            This will be your unique identifier on the NEAR blockchain associated with this app.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right col-span-1">
                Username
              </Label>
              <Input
                id="username"
                value={chosenUsername}
                onChange={(e) => setChosenUsername(e.target.value.toLowerCase())}
                placeholder="your-choice"
                className="col-span-3"
                required
                disabled={isLoading}
                pattern="[a-z0-9]{2,32}" // Basic pattern match
                title="2-32 characters, lowercase letters and numbers only."
              />
            </div>
            <div className="col-span-4 text-sm text-muted-foreground text-center px-6">
              Your full account ID will be: <br />
              <span className="font-mono break-all">{chosenUsername || "[username]"}{nearAccountSuffix}</span>
            </div>
            {error && (
              <div className="col-span-4 text-red-600 text-sm text-center bg-red-100 p-2 rounded">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !chosenUsername || !nearPublicKey}>
              {isLoading ? "Creating..." : "Create Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
