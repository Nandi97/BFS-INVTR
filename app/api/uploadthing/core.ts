import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  xlsUploader: f({
    blob: { maxFileSize: "16MB", maxFileCount: 1 },
  }).onUploadComplete(async ({ file }) => {
    // Nothing to do server-side after upload — the client POSTs the URL to import-xls
    return { url: file.ufsUrl };
  }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
