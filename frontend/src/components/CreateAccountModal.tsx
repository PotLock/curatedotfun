import React, { useState, useEffect } from "react";
import { useWeb3Auth } from "../hooks/use-web3-auth";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Modal } from "./Modal";
import { usernameSchema } from "../lib/validation/user";
import { useCreateUserProfile } from "../lib/api";

interface CreateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateAccountModal = ({
  isOpen,
  onClose,
}: CreateAccountModalProps) => {
  const {
    nearPublicKey,
    getUserInfo,
    web3auth, // Needed for authenticateUser to get ID token
    setCurrentUserProfile, // To update profile state on success
    logout,
    provider,
    getNearCredentials,
  } = useWeb3Auth();
  const [chosenUsername, setChosenUsername] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const createUserMutation = useCreateUserProfile();

  const nearAccountSuffix = ".users.curatedotfun.near"; // TODO: Make this configurable (app config)

  // Reset state when modal opens/closes or relevant context changes
  useEffect(() => {
    if (isOpen) {
      setChosenUsername("");
      setValidationError(null);
      createUserMutation.reset();
    }
  }, [isOpen, createUserMutation]);

  const handleClose = () => {
    // Optionally, you could force logout if they close without creating
    logout();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chosenUsername || !web3auth) return;

    const validationResult = usernameSchema.safeParse(chosenUsername);
    if (!validationResult.success) {
      setValidationError(validationResult.error.errors[0]?.message || 
        "Username must be 2-32 characters, lowercase letters and numbers only.");
      return;
    }
    
    setValidationError(null);

    try {
      // Get user info again to ensure we have fresh data if needed
      const userInfo = await getUserInfo();
      
      // If nearPublicKey is not available, try to get it directly
      let publicKey = nearPublicKey;
      if (!publicKey && provider) {
        try {
          // Get credentials directly from the provider
          const credentials = await getNearCredentials(provider);
          publicKey = credentials.publicKey;
          console.log("Generated public key:", publicKey);
        } catch (keyError) {
          console.error("Failed to generate NEAR public key:", keyError);
          setValidationError("Failed to generate NEAR public key. Please try again.");
          return;
        }
      }
      
      if (!publicKey) {
        setValidationError("NEAR public key is required but not available. Please try logging in again.");
        return;
      }

      console.log("Creating user profile with public key:", publicKey);
      const profile = await createUserMutation.mutateAsync({
        username: chosenUsername.toLowerCase(),
        near_public_key: publicKey,
        name: userInfo.name,
        email: userInfo.email
      });

      // Update the profile state in the context
      setCurrentUserProfile(profile);
      console.log("Account and profile created successfully:", profile);
      onClose(); // Close the modal on success
    } catch (err) {
      console.error("Error creating account:", err);
    }
  };

  const error = validationError || (createUserMutation.error instanceof Error 
    ? createUserMutation.error.message 
    : createUserMutation.error ? "An unexpected error occurred" : null);

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="max-w-[425px] mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Choose Your NEAR Account Name</h2>
          <p className="text-gray-600">
            This will be your unique identifier on the NEAR blockchain
            associated with this app.
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right col-span-1">
                Username
              </Label>
              <Input
                id="username"
                value={chosenUsername}
                onChange={(e) =>
                  setChosenUsername(e.target.value.toLowerCase())
                }
                placeholder="your-choice"
                className="col-span-3"
                required
                disabled={createUserMutation.isPending}
                pattern="[a-z0-9]{2,32}"
                title="2-32 characters, lowercase letters and numbers only."
              />
            </div>
            <div className="col-span-4 text-sm text-muted-foreground text-center px-6">
              Your full account ID will be: <br />
              <span className="font-mono break-all">
                {chosenUsername || "[username]"}
                {nearAccountSuffix}
              </span>
            </div>
            {error && (
              <div className="col-span-4 text-red-600 text-sm text-center bg-red-100 p-2 rounded">
                {error}
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createUserMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createUserMutation.isPending || !chosenUsername}
            >
              {createUserMutation.isPending ? "Creating..." : "Create Account"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
