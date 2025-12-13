/**
 * Replace strategy used before uploads.
 */
export type IgniterStorageReplaceStrategy =
  /** Replace by filename only (any extension) within the same folder. */
  | 'BY_FILENAME'
  /** Replace by filename + extension within the same folder. */
  | 'BY_FILENAME_AND_EXTENSION'

export type IgniterStorageUploadOptions = {
  /**
   * When set, deletes existing objects before uploading.
   *
   * - `BY_FILENAME`: deletes any file with the same base name.
   * - `BY_FILENAME_AND_EXTENSION`: deletes only the same name+extension.
   */
  replace?: IgniterStorageReplaceStrategy
}
