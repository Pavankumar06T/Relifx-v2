require('dotenv').config();
const { ChromaClient, DefaultEmbeddingFunction } = require('chromadb');
const fs = require('fs');
const path = require('path');

async function runIngestion() {
  const chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000';
  console.log(`[Ingest]: Connecting to ChromaDB at ${chromaUrl}...`);

  const client = new ChromaClient({ path: chromaUrl });
  const collectionName = 'relifex_diabetes_kb';
  const embedder = new DefaultEmbeddingFunction();

  const kbPath = path.join(__dirname, '../../data/diabetes_knowledge.json');
  if (!fs.existsSync(kbPath)) {
    console.error(`[Ingest Error]: Knowledge base file not found at ${kbPath}`);
    process.exit(1);
  }

  const rawDocs = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
  console.log(`[Ingest]: Loaded ${rawDocs.length} knowledge documents from ${kbPath}`);

  try {
    try {
      await client.deleteCollection({ name: collectionName });
      console.log(`[Ingest]: Reset previous collection '${collectionName}'.`);
    } catch (_) {
      // Collection did not exist yet
    }

    const collection = await client.getOrCreateCollection({
      name: collectionName,
      embeddingFunction: embedder,
      metadata: { description: 'ReLifeX Diabetes & Metabolic Health Clinical Knowledge' },
    });

    const ids = rawDocs.map(d => d.id);
    const documents = rawDocs.map(d => `${d.topic}: ${d.content}`);
    const metadatas = rawDocs.map(d => ({ topic: d.topic }));

    await collection.add({
      ids: ids,
      documents: documents,
      metadatas: metadatas,
    });

    console.log(`[Ingest Success]: Successfully embedded and indexed ${documents.length} chunks into ChromaDB collection '${collectionName}'!`);
  } catch (error) {
    console.error('[Ingest Error]: Failed to ingest into ChromaDB:', error.message);
  }
}

if (require.main === module) {
  runIngestion();
}

module.exports = runIngestion;
