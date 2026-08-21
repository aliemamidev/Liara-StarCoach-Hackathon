import { createHash } from "node:crypto";
import { loadDocuments, normalizeText } from "../src/lib/docs-search.js";
import { prisma } from "../src/lib/prisma.js";

const documents = await loadDocuments();
const grouped = new Map();

for (const chunk of documents) {
  const current = grouped.get(chunk.path) || {
    sourcePath: chunk.path,
    title: chunk.title,
    url: chunk.url,
    imageUrl: chunk.imageUrl,
    category: chunk.category,
    service: chunk.service,
    documentType: chunk.documentType,
    rawContent: chunk.rawContent || chunk.body,
    chunks: [],
  };
  current.chunks.push(chunk);
  grouped.set(chunk.path, current);
}

await prisma.$transaction(async (transaction) => {
  await transaction.knowledgeDocument.updateMany({ data: { isActive: false } });
  for (const document of grouped.values()) {
    const rawContent = document.rawContent;
    const saved = await transaction.knowledgeDocument.upsert({
      where: { sourcePath: document.sourcePath },
      update: {
        title: document.title,
        url: document.url,
        imageUrl: document.imageUrl,
        category: document.category,
        service: document.service,
        documentType: document.documentType,
        rawContent,
        contentHash: createHash("sha256").update(rawContent).digest("hex"),
        isActive: true,
      },
      create: {
        sourcePath: document.sourcePath,
        title: document.title,
        url: document.url,
        imageUrl: document.imageUrl,
        category: document.category,
        service: document.service,
        documentType: document.documentType,
        rawContent,
        contentHash: createHash("sha256").update(rawContent).digest("hex"),
        isActive: true,
      },
    });
    await transaction.knowledgeChunk.deleteMany({ where: { documentId: saved.id } });
    await transaction.knowledgeChunk.createMany({
      data: document.chunks.map((chunk, chunkIndex) => ({
        documentId: saved.id,
        section: chunk.section,
        content: chunk.body,
        normalizedText: normalizeText(`${chunk.title} ${chunk.section} ${chunk.path} ${chunk.body}`),
        chunkIndex,
        isActive: true,
      })),
    });
  }
}, { timeout: 120000 });

console.log(`Synchronized ${grouped.size} documents and ${documents.length} searchable chunks.`);
await prisma.$disconnect();
