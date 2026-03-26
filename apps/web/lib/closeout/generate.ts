import archiver from "archiver";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage/local";
import { Writable } from "stream";

interface CloseoutResult {
  zipBuffer: Buffer;
  fileKey: string;
  documentCount: number;
}

/**
 * Generate a close-out pack ZIP for a trade case.
 * Collects all approved documents and packages them into a ZIP archive.
 */
export async function generateCloseoutZip(tradeCaseId: string): Promise<CloseoutResult> {
  const tradeCase = await prisma.tradeCase.findUniqueOrThrow({
    where: { id: tradeCaseId },
    include: {
      documents: {
        where: { status: "APPROVED" },
        orderBy: { documentType: "asc" },
      },
      quote: {
        include: { rfq: true },
      },
    },
  });

  const archive = archiver("zip", { zlib: { level: 9 } });
  const chunks: Buffer[] = [];

  const writable = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      chunks.push(chunk);
      callback();
    },
  });

  archive.pipe(writable);

  // Add a summary manifest
  const manifest = {
    referenceCode: tradeCase.referenceCode,
    commodity: tradeCase.commodity,
    route: tradeCase.routeSummary,
    generatedAt: new Date().toISOString(),
    documents: tradeCase.documents.map((d) => ({
      type: d.documentType,
      originalName: d.originalName,
      issuedBy: d.issuedBy,
      issuedAt: d.issuedAt?.toISOString(),
      status: d.status,
    })),
  };
  archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });

  // Add each approved document
  let addedCount = 0;
  for (const doc of tradeCase.documents) {
    if (doc.fileKey) {
      const stream = await storage.getFileStream(doc.fileKey);
      if (stream) {
        const safeName = `${doc.documentType}_${doc.originalName ?? "document"}`;
        archive.append(stream, { name: safeName });
        addedCount++;
      }
    }
  }

  await archive.finalize();

  // Wait for writable to finish
  await new Promise<void>((resolve, reject) => {
    writable.on("finish", resolve);
    writable.on("error", reject);
  });

  const zipBuffer = Buffer.concat(chunks);
  const fileKey = `closeout/${tradeCase.referenceCode}/closeout-pack-${Date.now()}.zip`;

  // Store the ZIP
  await storage.putFile(fileKey, zipBuffer, "application/zip");

  return {
    zipBuffer,
    fileKey,
    documentCount: addedCount,
  };
}
