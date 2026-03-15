import { upload } from "https://esm.sh/@vercel/blob/client@1.0.1";

const form = document.getElementById("pdf-form");
const fileInput = document.getElementById("pdf-file");
const submitBtn = document.getElementById("submit-btn");
const statusEl = document.getElementById("status");
const barEl = document.getElementById("bar");
const resultsEl = document.getElementById("results");

function setStatus(text) {
  statusEl.textContent = text;
}

function setProgress(done, total) {
  if (!total) {
    barEl.style.width = "0%";
    return;
  }

  const pct = Math.round((done / total) * 100);
  barEl.style.width = `${Math.min(Math.max(pct, 0), 100)}%`;
}

function clearResults() {
  resultsEl.innerHTML = "";
}

function appendResult({ page, url, error }) {
  const li = document.createElement("li");

  if (error) {
    li.className = "err";
    li.textContent = `Page ${page}: ${error}`;
  } else {
    li.className = "ok";
    const label = document.createElement("span");
    label.textContent = `Page ${page}: `;

    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = url;

    li.append(label, link);
  }

  resultsEl.appendChild(li);
}

function baseNameFromFile(fileName) {
  const noExt = fileName.replace(/\.pdf$/i, "");
  return noExt.trim().replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 60) || "pdf";
}

async function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("PNG conversion failed"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

async function uploadPage(file, pageNumber) {
  const pathname = `pdf-pages/${file.name}`;

  return upload(pathname, file, {
    access: "public",
    handleUploadUrl: "/api/blob/upload",
    clientPayload: JSON.stringify({ pageNumber }),
    multipart: file.size > 4_500_000
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearResults();

  const pdfFile = fileInput.files?.[0];
  if (!pdfFile) {
    setStatus("Select a PDF first.");
    return;
  }

  if (pdfFile.type !== "application/pdf") {
    setStatus("Only PDF files are supported.");
    return;
  }

  submitBtn.disabled = true;
  setProgress(0, 0);

  try {
    setStatus("Loading PDF...");
    const bytes = await pdfFile.arrayBuffer();
    const task = pdfjsLib.getDocument({ data: new Uint8Array(bytes) });
    const pdf = await task.promise;

    const total = pdf.numPages;
    const base = baseNameFromFile(pdfFile.name);

    for (let pageNumber = 1; pageNumber <= total; pageNumber += 1) {
      setStatus(`Converting page ${pageNumber}/${total}...`);
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 2 });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { alpha: false });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      if (!ctx) {
        throw new Error("Unable to create canvas context");
      }

      await page.render({ canvasContext: ctx, viewport }).promise;
      const pngBlob = await canvasToPngBlob(canvas);

      setStatus(`Uploading page ${pageNumber}/${total}...`);
      const pageFile = new File([pngBlob], `${base}-page-${pageNumber}.png`, {
        type: "image/png"
      });

      try {
        const uploaded = await uploadPage(pageFile, pageNumber);
        appendResult({ page: pageNumber, url: uploaded.url });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        appendResult({ page: pageNumber, error: message });
      }

      setProgress(pageNumber, total);
    }

    setStatus(`Done. Processed ${total} pages.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    setStatus(`Failed: ${message}`);
  } finally {
    submitBtn.disabled = false;
  }
});
