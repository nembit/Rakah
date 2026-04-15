import * as React from 'react';
import { UploadClient } from '@uploadcare/upload-client'
const client = new UploadClient({ publicKey: process.env.EXPO_PUBLIC_UPLOADCARE_PUBLIC_KEY || '' });
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || '';

function useUpload() {
  const [loading, setLoading] = React.useState(false);
  const upload = React.useCallback(async (input) => {
    try {
      setLoading(true);
      let response;

      if ("reactNativeAsset" in input && input.reactNativeAsset) {
        let asset = input.reactNativeAsset;

        if (asset.file) {
          if (!apiBaseUrl) {
            throw new Error("Upload failed: EXPO_PUBLIC_API_BASE_URL is not configured.");
          }
          const formData = new FormData();
          formData.append("file", asset.file);

          response = await fetch(`${apiBaseUrl}/upload`, {
            method: "POST",
            body: formData,
          });
        } else {
          if (!process.env.EXPO_PUBLIC_UPLOADCARE_PUBLIC_KEY) {
            throw new Error("Upload failed: missing EXPO_PUBLIC_UPLOADCARE_PUBLIC_KEY.");
          }

          const result = await client.uploadFile(asset, {
            fileName: asset.name ?? asset.uri.split("/").pop(),
            contentType: asset.mimeType,
          });
          return { url: `https://ucarecdn.com/${result.uuid}/`, mimeType: result.mimeType || null };
        }
      } else if ("url" in input) {
        if (!apiBaseUrl) {
          throw new Error("Upload failed: EXPO_PUBLIC_API_BASE_URL is not configured.");
        }
        response = await fetch(`${apiBaseUrl}/upload`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ url: input.url })
        });
      } else if ("base64" in input) {
        if (!apiBaseUrl) {
          throw new Error("Upload failed: EXPO_PUBLIC_API_BASE_URL is not configured.");
        }
        response = await fetch(`${apiBaseUrl}/upload`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ base64: input.base64 })
        });
      } else {
        if (!apiBaseUrl) {
          throw new Error("Upload failed: EXPO_PUBLIC_API_BASE_URL is not configured.");
        }
        response = await fetch(`${apiBaseUrl}/upload`, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream"
          },
          body: input.buffer
        });
      }
      if (!response.ok) {
        if (response.status === 413) {
          throw new Error("Upload failed: File too large.");
        }
        throw new Error("Upload failed");
      }
      const data = await response.json();
      return { url: data.url, mimeType: data.mimeType || null };
    } catch (uploadError) {
      if (uploadError instanceof Error) {
        return { error: uploadError.message };
      }
      if (typeof uploadError === "string") {
        return { error: uploadError };
      }
      return { error: "Upload failed" };
    } finally {
      setLoading(false);
    }
  }, []);

  return [upload, { loading }];
}

export { useUpload };
export default useUpload;