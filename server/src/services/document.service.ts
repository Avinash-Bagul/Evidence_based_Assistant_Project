import fs from 'fs';
import path from 'path';
import prisma from '../config/database';
import { getEmbedding } from '../ai/aiService';
import { logger } from '../utils/logger';

/**
 * Process an uploaded document:
 * 1. Extract text (PDF / DOCX / TXT)
 * 2. Split into overlapping chunks
 * 3. Generate embeddings for each chunk (optional — skipped if unavailable)
 * 4. Save chunks to database
 * 5. Update document status → EMBEDDED or CHUNKED
 */
export async function processDocument(documentId: string): Promise<void> {
  try {
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'PROCESSING' },
    });

    const document = await prisma.document.findUniqueOrThrow({
      where: { id: documentId },
    });

    const filePath = path.resolve(document.filename);
    let text = '';
    let pageCount: number | undefined;

    if (document.mimeType === 'application/pdf') {
      const pdfRes = await extractPdfText(filePath);
      text = pdfRes.text;
      pageCount = pdfRes.pageCount;
    } else if (
      document.mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      text = await extractDocxText(filePath);
    } else if (document.mimeType === 'text/plain') {
      text = fs.readFileSync(filePath, 'utf-8');
    } else {
      throw new Error(`Unsupported MIME type: ${document.mimeType}`);
    }

    // Normalize whitespace
    const normalizedText = text.replace(/\s+/g, ' ').trim();

    if (!normalizedText) {
      throw new Error('Document contains no extractable text.');
    }

    if (pageCount) {
      await prisma.document.update({
        where: { id: documentId },
        data: { pageCount },
      });
    }

    const chunks = splitIntoChunks(normalizedText, 1000, 200);

    if (chunks.length === 0) {
      throw new Error('Document could not be split into chunks.');
    }

    logger.info({ documentId, chunkCount: chunks.length }, 'Document chunked');

    // Mark as CHUNKED before saving chunks
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'CHUNKED' },
    });

    // Try embeddings once — if first chunk fails, skip all embeddings
    let embeddingAvailable = true;

    for (let index = 0; index < chunks.length; index++) {
      const content = chunks[index];
      let embedding: number[] | null = null;

      if (embeddingAvailable) {
        try {
          embedding = await getEmbedding(content);
        } catch (embErr) {
          embeddingAvailable = false;
          logger.warn(
            { documentId, error: (embErr as Error).message },
            'Embeddings unavailable — saving all chunks without embeddings'
          );
        }
      }

      if (embedding) {
        await prisma.$executeRaw`
          INSERT INTO document_chunks (id, content, chunk_index, token_count, embedding, document_id, created_at)
          VALUES (
            gen_random_uuid(),
            ${content},
            ${index},
            ${estimateTokenCount(content)},
            ${`[${embedding.join(',')}]`}::vector,
            ${document.id}::uuid,
            NOW()
          )
        `;
      } else {
        await prisma.documentChunk.create({
          data: {
            content,
            chunkIndex: index,
            tokenCount: estimateTokenCount(content),
            documentId: document.id,
          },
        });
      }
    }

    // EMBEDDED = chunks + embeddings, CHUNKED = chunks only (both usable for plan generation)
    const finalStatus = embeddingAvailable ? 'EMBEDDED' : 'CHUNKED';
    await prisma.document.update({
      where: { id: documentId },
      data: { status: finalStatus },
    });

    logger.info({ documentId, chunkCount: chunks.length, finalStatus }, 'Document processing complete');
  } catch (error) {
    logger.error({ error, documentId }, 'Document processing failed');
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'FAILED' },
    });
    throw error;
  }
}

async function extractPdfText(filePath: string): Promise<{ text: string; pageCount?: number }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfModule = require('pdf-parse');
  const buffer = fs.readFileSync(filePath);

  if (typeof pdfModule === 'function') {
    const data = await pdfModule(buffer);
    return { text: data.text || '', pageCount: data.numpages };
  }

  const PDFParse = pdfModule.PDFParse || pdfModule.default?.PDFParse;
  if (PDFParse) {
    const uint8 = new Uint8Array(buffer);
    const parser = new PDFParse(uint8);
    const result = await parser.getText();
    const text = typeof result === 'string' ? result : (result.text || '');
    const pageCount = result.total || result.pages?.length;
    return { text, pageCount };
  }

  throw new Error('Unable to initialize pdf-parse module');
}

async function extractDocxText(filePath: string): Promise<string> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value || '';
}

/**
 * Word-based chunker with overlap.
 * Splits by words so it works on any text regardless of punctuation.
 */
function splitIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
  const words = text.split(' ').filter(Boolean);

  if (words.length === 0) return [];

  const chunks: string[] = [];
  let start = 0;

  // Approximate words per chunk based on average 5 chars/word
  const wordsPerChunk = Math.floor(chunkSize / 5);
  const overlapWords = Math.floor(overlap / 5);

  while (start < words.length) {
    const end = Math.min(start + wordsPerChunk, words.length);
    const chunk = words.slice(start, end).join(' ').trim();
    if (chunk) chunks.push(chunk);
    if (end >= words.length) break;
    start = end - overlapWords;
  }

  return chunks;
}

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}
