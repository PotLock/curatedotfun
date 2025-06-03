import { useCallback, useState } from "react";

import type { PinResponse } from "pinata-web3";

import * as client from "./client";

export const useFileUpload = () => {
  const [file, setFile] = useState<File>();
  const [isPending, setIsPending] = useState(false);
  const [response, setResponse] = useState<PinResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const upload = useCallback(async (): Promise<PinResponse> => {
    if (!file) {
      const err = new Error("No file selected for upload.");
      setError(err);
      throw err;
    }
    setIsPending(true);
    setResponse(null);
    setError(null);
    try {
      const result = await client.upload({ file });
      setResponse(result);
      return result;
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      throw err;
    } finally {
      setIsPending(false);
    }
  }, [file, setIsPending, setResponse, setError]);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFile(e.target?.files?.[0]);
      setError(null);
      setResponse(null);
    },
    [setFile, setError, setResponse],
  );

  return {
    isPending,
    handleFileInputChange,
    upload,
    data: response ?? undefined,
    error: error ?? undefined,
    hasFile: !!file,
  };
};
