import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useCreateUserProfile } from "../lib/api";
import { Modal } from "./Modal";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { z } from "zod";

const usernameSchema = z
  .string()
  .min(2, "Username must be at least 2 characters")
  .max(32, "Username must be at most 32 characters")
  .regex(/^[a-z0-9]+$/, "Username must be lowercase letters and numbers only");

interface CreateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateAccountModal = ({
  isOpen,
  onClose,
}: CreateAccountModalProps) => {
  const { user, idToken, logout } = useAuth();
  const nearPublicKey = user?.near_public_key;

  const [chosenUsername, setChosenUsername] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const createUserMutation = useCreateUserProfile();

  const nearAccountSuffix = ".users.curatedotfun.near"; // TODO: Make this configurable (app config)

  // Reset state when modal opens/closes or relevant context changes
  useEffect(() => {
    if (isOpen) {
      setChosenUsername("");
      setValidationError(null);
    }
  }, [isOpen]);

  const handleClose = () => {
    logout();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chosenUsername || !idToken) {
      if (!idToken)
        console.error(
          "CreateAccountModal: idToken is missing, cannot create profile.",
        );
      return;
    }

    const validationResult = usernameSchema.safeParse(chosenUsername);
    if (!validationResult.success) {
      setValidationError(
        validationResult.error.errors[0]?.message ||
          "Username must be 2-32 characters, lowercase letters and numbers only.",
      );
      return;
    }

    setValidationError(null);

    try {
      if (!nearPublicKey) {
        setValidationError(
          "NEAR public key is required but not available. Ensure it was derived during login.",
        );
        return;
      }

      console.log("Creating user profile with public key:", nearPublicKey);
      const createdProfile = await createUserMutation.mutateAsync({
        username: chosenUsername.toLowerCase(),
        near_public_key: nearPublicKey,
        name: user?.username || user?.email?.split("@")[0],
        email: user?.email,
      });

      console.log("Account and profile created successfully:", createdProfile);
      onClose();
    } catch (err) {
      console.error("Error creating account:", err);

      if (err instanceof Error) {
        // TODO: This could be cleaned up
        try {
          const errorData = JSON.parse(err.message);

          // Check if it's a Zod validation error with issues array
          if (errorData.error && errorData.error.issues) {
            // TODO: Helper
            const issues = errorData.error.issues;
            const errorMessages = issues
              .map(
                (issue: { path: string[]; message: string }) =>
                  `${issue.path.join(".")}: ${issue.message}`,
              )
              .join(", ");
            setValidationError(errorMessages || "Validation failed");
            return;
          }

          // Check for JWT verification errors
          if (errorData.error && errorData.error.includes("JWT")) {
            // TODO: Helper
            setValidationError(
              "Authentication error. Please try logging in again.",
            );
            return;
          }

          if (errorData.error) {
            // TODO: Helper
            setValidationError(
              typeof errorData.error === "string"
                ? errorData.error
                : JSON.stringify(errorData.error),
            );
            return;
          }
        } catch {
          // If not JSON, use the error message directly
          setValidationError(err.message);
        }
      } else {
        setValidationError("An unexpected error occurred");
      }
    }
  };

  const error =
    validationError ||
    (createUserMutation.error instanceof Error
      ? createUserMutation.error.message
      : createUserMutation.error
        ? "An unexpected error occurred"
        : null);

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
