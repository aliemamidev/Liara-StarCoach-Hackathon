process.loadEnvFile?.(".env.local");
const { prisma } = await import("../src/lib/prisma.js");
const { searchDocumentation } = await import("../src/lib/docs-search.js");

const limit = Number(process.env.RAG_EVAL_LIMIT || 0);
const concurrency = Math.max(1, Number(process.env.RAG_EVAL_CONCURRENCY || 8));

const documents = await prisma.knowledgeDocument.findMany({
  where: { isActive: true },
  orderBy: { sourcePath: "asc" },
  select: { title: true, sourcePath: true },
});

const titleCounts = new Map();
for (const document of documents) titleCounts.set(document.title, (titleCounts.get(document.title) || 0) + 1);

const cases = documents
  .filter((document) => titleCounts.get(document.title) === 1)
  .flatMap((document) => [
    { type: "direct", query: document.title, expected: document.sourcePath },
    { type: "natural", query: `چطور ${document.title}؟`, expected: document.sourcePath },
  ])
  .slice(0, limit > 0 ? limit * 2 : undefined);

const results = [];
let cursor = 0;

async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= cases.length) return;
    const current = cases[index];
    const startedAt = performance.now();
    try {
      const response = await searchDocumentation(current.query);
      const paths = [...new Set(response.hits.map((hit) => hit.path))];
      const rank = paths.indexOf(current.expected);
      results[index] = {
        ...current,
        rank: rank < 0 ? null : rank + 1,
        latencyMs: Math.round(performance.now() - startedAt),
        top: paths.slice(0, 10),
      };
    } catch (error) {
      results[index] = {
        ...current,
        rank: null,
        latencyMs: Math.round(performance.now() - startedAt),
        top: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, cases.length) }, worker));

const metric = (at) => {
  const relevant = results.filter((result) => result.rank !== null && result.rank <= at);
  return relevant.length / Math.max(results.length, 1);
};
const reciprocalRanks = results.filter((result) => result.rank !== null).map((result) => 1 / result.rank);
const ndcg10 = results.map((result) => (result.rank && result.rank <= 10 ? 1 / Math.log2(result.rank + 1) : 0));
const foundRanks = results.filter((result) => result.rank !== null).map((result) => result.rank);
const averageLatency = results.reduce((sum, result) => sum + result.latencyMs, 0) / Math.max(results.length, 1);

console.log(JSON.stringify({
  documents: documents.length,
  uniqueTitleDocuments: cases.length / 2,
  cases: results.length,
  recallAt1: metric(1),
  recallAt3: metric(3),
  recallAt5: metric(5),
  recallAt10: metric(10),
  mrr: reciprocalRanks.reduce((sum, value) => sum + value, 0) / Math.max(results.length, 1),
  ndcgAt10: ndcg10.reduce((sum, value) => sum + value, 0) / Math.max(results.length, 1),
  averageRankingPosition: foundRanks.reduce((sum, value) => sum + value, 0) / Math.max(foundRanks.length, 1),
  notFound: results.filter((result) => result.rank === null).length,
  averageLatencyMs: Math.round(averageLatency),
  failures: results.filter((result) => result.rank === null || result.rank > 1).slice(0, 30),
}, null, 2));

await prisma["$disconnect"]();
