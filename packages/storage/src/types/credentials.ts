import { IgniterStorageAdapter } from "../adapters/storage.adapter";

export type IgniterStorageAdapterKey = "s3" | "google";

export type IgniterStorageS3Credentials = {
  endpoint?: string;
  region?: string;
  bucket?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  signatureVersion?: string;
};

export type IgniterStorageGoogleCredentials = {
  bucket?: string;
  endpoint?: string;
  region?: string;
  /** JSON string credentials. */
  credentialsJson?: string;
  /** Base64 JSON credentials. */
  credentialsJsonBase64?: string;
};

export type IgniterStorageAdapterCredentialsMap = {
  s3: IgniterStorageS3Credentials;
  google: IgniterStorageGoogleCredentials;
};

export type IgniterStorageAdapterFactoryMap = {
  s3: (credentials: IgniterStorageS3Credentials) => IgniterStorageAdapter;
  google: (
    credentials: IgniterStorageGoogleCredentials,
  ) => IgniterStorageAdapter;
};
