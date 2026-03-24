# Maestrox OCR - PDF pages to Vercel Blob

This app does the following:

1. Upload a PDF from the browser.
2. Convert each PDF page to a separate PNG on the client side.
3. Upload each PNG directly from the browser to Vercel Blob.
4. Show a page-by-page uploaded URL list.

## Requirements

- Node.js 18+
- A Vercel project with a Blob store
- `BLOB_READ_WRITE_TOKEN` from that project
- A public Vercel Blob store for direct browser uploads

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create your local env file:

```bash
cp .env.example .env
```

3. Paste your token into `.env`:

```env
BLOB_READ_WRITE_TOKEN=...
```

4. Start the app:

```bash
npm run dev
```

5. Open:

- http://localhost:3000

## How client-side upload works

- Browser converts PDF pages to PNG with PDF.js.
- Browser uploads files using `upload()` from `@vercel/blob/client`.
- A small server route (`/api/blob/upload`) only issues short-lived upload tokens.
- File bytes do not pass through your Express server.

## Important note

For production, add auth/authorization checks in `/api/blob/upload` before issuing upload tokens.

## Direct upload limitation

This implementation uses Vercel Blob client uploads, which currently require `access: "public"`.

If your Blob store is private:

- Direct browser uploads will fail.
- The browser may only show a generic CORS or failed fetch error.
- You must either change the Blob store to public or change the app to upload through your server instead.
