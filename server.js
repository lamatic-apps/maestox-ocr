import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { handleUpload } from "@vercel/blob/client";

const app = express();
const port = Number.parseInt(process.env.PORT || "3000", 10);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/blob/upload", async (req, res) => {
  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        // NOTE: In production, authenticate users before issuing upload tokens.
        if (!pathname.startsWith("pdf-pages/")) {
          throw new Error("Invalid upload path.");
        }

        return {
          access: "public",
          addRandomSuffix: true,
          allowedContentTypes: ["image/png"],
          maximumSizeInBytes: 25 * 1024 * 1024
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log("Blob upload completed", {
          url: blob.url,
          pathname: blob.pathname,
          tokenPayload
        });
      }
    });

    return res.status(200).json(jsonResponse);
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Upload token route failed"
    });
  }
});

app.listen(port, () => {
  console.log(`App running at http://localhost:${port}`);
});
