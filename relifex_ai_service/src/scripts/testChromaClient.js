const { ChromaClient } = require('chromadb');

async function testConnection() {
  const client = new ChromaClient({ path: 'http://localhost:8000' });
  try {
    console.log('[Test]: Fetching heartbeat...');
    const hb = await client.heartbeat();
    console.log('[Test]: Heartbeat response:', hb);

    console.log('[Test]: Fetching or creating collection...');
    const col = await client.getOrCreateCollection({ name: 'relifex_diabetes_kb' });
    console.log('[Test]: Collection created/retrieved:', col.name);

    console.log('[Test]: Querying collection...');
    const res = await col.query({
      queryTexts: ['How does post-meal walking lower blood sugar spikes?'],
      nResults: 2,
    });
    console.log('[Test]: Query result:', JSON.stringify(res, null, 2));

  } catch (e) {
    console.error('[Chroma JS Client Error]:', e);
  }
}

testConnection();
