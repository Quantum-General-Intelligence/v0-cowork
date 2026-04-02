# Q-Inference + Qualtron Platform — Local Setup

Everything runs on the same machine. Two repos, three services.

## Architecture

```
Browser → Qualtron Platform (:17860) → Q-Inference API (:8000) → SGLang → GPU
                                     → Supabase (cloud DB)
```

## Prerequisites

- Both repos cloned in `/workspace/`:
  - `/workspace/QGI-Cashed-LLM` — Q-Inference API (Python/FastAPI)
  - `/workspace/v0-cowork` — Qualtron Platform (Next.js)
- 2× NVIDIA GPUs (tested on RTX PRO 6000 96GB)
- Redis running (`redis-server --daemonize yes`)
- Node.js + pnpm installed

## Step 1: Start SGLang Models

Pick which models to run based on your GPU memory:

```bash
# Option A: Two small models (27GB total)
CUDA_VISIBLE_DEVICES=0 sglang serve \
  --model-path nvidia/NVIDIA-Nemotron-3-Nano-4B-BF16 \
  --attention-backend flashinfer --sampling-backend pytorch \
  --tensor-parallel-size 1 --mem-fraction-static 0.15 \
  --disable-cuda-graph --schedule-policy lpm \
  --host 127.0.0.1 --port 18000 \
  --download-dir /workspace/models --kv-cache-dtype auto &

CUDA_VISIBLE_DEVICES=1 sglang serve \
  --model-path Qwen/Qwen3.5-4B \
  --attention-backend triton --sampling-backend pytorch \
  --tensor-parallel-size 1 --mem-fraction-static 0.10 \
  --disable-cuda-graph --schedule-policy lpm \
  --host 127.0.0.1 --port 18001 \
  --download-dir /workspace/models --kv-cache-dtype auto &

# Option B: One large model (130GB, uses both GPUs)
CUDA_VISIBLE_DEVICES=0,1 sglang serve \
  --model-path Qwen/Qwen3.5-122B-A10B-FP8 \
  --attention-backend flashinfer --sampling-backend pytorch \
  --tensor-parallel-size 2 --mem-fraction-static 0.65 \
  --disable-cuda-graph --schedule-policy lpm \
  --host 127.0.0.1 --port 18003 \
  --download-dir /workspace/models --kv-cache-dtype auto \
  --trust-remote-code &
```

Wait for ready:
```bash
curl http://127.0.0.1:18000/health  # should return 200
curl http://127.0.0.1:18001/health  # if running Option A
```

## Step 2: Start Redis

```bash
redis-server --daemonize yes --port 6379
```

## Step 3: Start Q-Inference API

```bash
cd /workspace/QGI-Cashed-LLM

# Set environment (adjust MODEL_PORTS for whichever models you started)
export DATABASE_URL="postgresql+asyncpg://postgres.ibpoxcjoswktwtsmmcps:TheoSym%242025@aws-1-us-east-2.pooler.supabase.com:6543/postgres"
export REDIS_URL="redis://localhost:6379/0"
export SGLANG_HOST="127.0.0.1"
export SGLANG_DEFAULT_PORT="18000"
export MODEL_PORTS="nvidia/NVIDIA-Nemotron-3-Nano-4B-BF16:18000,Qwen/Qwen3.5-4B:18001"

# Start API
python3 -m uvicorn cagent.api.main:app --host 0.0.0.0 --port 8000 --log-level info
```

Verify:
```bash
curl http://localhost:8000/health
# {"status":"ok","gpu_available":true,...}
```

## Step 4: Start Qualtron Platform

```bash
cd /workspace/v0-cowork

# Install deps (first time only)
pnpm install

# Start the platform
pnpm dev --filter qualtron-platform
```

Opens at: **http://localhost:17860**

The `.env.local` is already configured:
- `CACHEDLLM_URL=http://localhost:8000` → Q-Inference API
- `CACHEDLLM_API_KEY=cag_prod_...` → API key (seeded in Supabase)
- `NEXT_PUBLIC_SUPABASE_URL` → shared Supabase project

## Step 5: Use the Platform

- **Deploy page**: http://localhost:17860/llm/deploy
  - Browse 17 Qualtron model variants
  - Filter by family (Nano, Mini, Coder, Thinker, Coder Pro)
  - Deploy models to GPU
  - See deployed models with status

- **Playground**: http://localhost:17860/playground
  - Chat with deployed Qualtron models
  - Supports streaming

- **Agents**: http://localhost:17860/agents
  - Manage CAG agents with knowledge bases

## API Endpoints (Q-Inference)

From the platform or any client:

```bash
KEY="cag_prod_57ea0996e25f4f778f50f4e7a3bdba9c"

# Catalog (17 variants)
curl http://localhost:8000/v1/qinference/catalog \
  -H "Authorization: Bearer $KEY"

# Deploy a model
curl -X POST http://localhost:8000/v1/qinference/models \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"variant_id":"qualtron-nano-4b-262k"}'

# List deployed
curl http://localhost:8000/v1/qinference/models \
  -H "Authorization: Bearer $KEY"

# Completion
curl http://localhost:8000/v1/qinference/models/MODEL_ID/completions \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'

# Streaming
curl -N http://localhost:8000/v1/qinference/models/MODEL_ID/completions \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Count to 10"}],"stream":true}'
```

## CLI

```bash
export CAGENT_API_URL=http://localhost:8000
export CAGENT_API_KEY=cag_prod_57ea0996e25f4f778f50f4e7a3bdba9c

python3 -m cagent.maas.cli catalog
python3 -m cagent.maas.cli deploy qualtron-nano-4b-262k --wait
python3 -m cagent.maas.cli complete MODEL_ID "What is AI?"
python3 -m cagent.maas.cli cluster
```

## Qualtron Model Catalog (5 base × YaRN = 17 variants)

| Family | Base Model | VRAM | Latency | Context Options |
|--------|-----------|------|---------|-----------------|
| **Nano** | Nemotron-3-Nano-4B (Mamba-2) | 16GB | 0.06s | 262K, 524K, 786K, 1M |
| **Mini** | Qwen3.5-4B (GDN) | 11GB | 0.10s | 262K, 524K, 1M |
| **Coder** | Nemotron-Cascade-2-30B (Mamba+LatentMoE) | 64GB | 0.75s | 1M, 2M, 3M, 4M |
| **Thinker** | Qwen3.5-122B-A10B-FP8 (GDN+MoE) | 130GB | 1.0s | 262K, 1M |
| **Coder Pro** | Nemotron-3-Super-120B (Mamba-2 MoE) | 138GB | 1.7s | 1M, 2M, 3M, 4M |

## Supabase

Both repos share the same Supabase project (`ibpoxcjoswktwtsmmcps`):
- Python API uses Postgres via pooler (port 6543)
- Next.js uses Supabase JS client (publishable key)
- 7 tables: clients, agents, api_keys, deployments, ingest_jobs, maas_models, usage_logs

## Troubleshooting

**API returns 500**: Check if SGLang is running on the expected port
```bash
curl http://127.0.0.1:18000/health
```

**Auth fails**: The API key must be in the Supabase `api_keys` table with matching hash
```bash
# Re-seed if needed (from QGI-Cashed-LLM directory)
python3 -c "
import psycopg2, hashlib, uuid, time
conn = psycopg2.connect(host='aws-1-us-east-2.pooler.supabase.com', port=6543, dbname='postgres', user='postgres.ibpoxcjoswktwtsmmcps', password='TheoSym\$2025', sslmode='require')
conn.autocommit = True
cur = conn.cursor()
cur.execute('SELECT id FROM clients LIMIT 1')
cid = cur.fetchone()[0]
cur.execute('SELECT id FROM agents WHERE client_id=%s LIMIT 1', (cid,))
aid = cur.fetchone()[0]
raw_key = 'cag_prod_' + uuid.uuid4().hex[:36]
key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
cur.execute('INSERT INTO api_keys (id,agent_id,client_id,name,key_hash,prefix,is_active,created_at,requests_total) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)',
    (str(uuid.uuid4()), aid, cid, 'new-key', key_hash, raw_key[:12], True, int(time.time()), 0))
print(f'New key: {raw_key}')
conn.close()
"
```

**Platform can't reach API**: Check CACHEDLLM_URL in `.env.local`
```bash
curl http://localhost:8000/health
```
