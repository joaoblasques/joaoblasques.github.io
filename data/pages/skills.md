# Skills & Expertise

Everything on this page is backed by shipped, public work — mostly [Vitals](/projects/) (a governed
healthcare lakehouse) and [MBTA](/projects/) (a streaming transit lakehouse). If I can't point at
code or a write-up for a skill, it's in the "learning" tier, not the headline.

## Core — use daily, will defend in depth

| Area | Specifics | Evidence |
|------|-----------|----------|
| Python + SQL | pipelines, tested pure transforms, FastAPI services | all projects |
| Databricks | Unity Catalog, Delta, Asset Bundles, serverless Jobs, Lakeflow/DLT | MBTA (both Jobs + DLT paradigms live) |
| Lakehouse design | medallion, policy-in-gold, schema + provenance discipline | Vitals, MBTA |
| dbt | gold marts, tests, semantic layer | Vitals |
| Data quality gates | Great Expectations + dbt tests wired into CI, fail-the-build contracts | Vitals silver gate |
| CI/CD & IaC | GitHub Actions, Terraform on GCP incl. keyless WIF/OIDC plan-on-PR / apply-on-merge | MBTA |
| Cost discipline | budget alerts, per-job DBU attribution via system tables, paused-by-default schedules | MBTA, written up |

## Working — shipped with it, still deepening

| Area | Specifics | Evidence |
|------|-----------|----------|
| Spark Structured Streaming | Auto Loader, checkpointing, Kafka source with parity verification | MBTA cutover; Vitals wearable stream |
| Kafka | real broker integration, topic/offset semantics, producer + consumer | Vitals |
| GCP data stack | GCS, Pub/Sub, Cloud Run jobs, Cloud Scheduler, Secret Manager | MBTA live ingestion |
| Airflow | DAG design for batch orchestration | Vitals |
| Feature stores | Feast — apply → materialize → retrieve, online/offline parity | Vitals |
| Embeddings & search | pgvector serving store for clinical-note search | Vitals |
| ML plumbing | scikit-learn models, MLflow tracking, PSI drift monitoring | Vitals |
| Agentic/LLM systems | LLM-in-pipeline (propose-only patterns), agent-operated dev workflow | MBTA Dreamer/Monitor, Nora |
| Docker | containerized jobs and local serving stores | MBTA, Vitals |

## Familiar — used, not claiming depth

DuckDB & Postgres · BigQuery · Azure and AWS fundamentals (my cloud depth is GCP) ·
Kubernetes basics · Scala/Java (read comfortably, don't write daily) · Tableau/PowerBI basics

## How I work

- **Decisions get ADRs** — every significant choice written down with its trade-off, in the repo.
- **Claims get evidence** — tests, parity checks, live-run verification before "done".
- **Spec → plan → build** — with review gates, including for AI-generated code.
- **Stakeholder discipline** — definition-of-done agreed before building; progress visible early.

## Currently learning

Databricks certification prep (Data Engineer Associate) · deeper Spark internals ·
production LLM/agent patterns — logged publicly as I go.

---

*Updated 2026-07-16 — trimmed to what the public work actually evidences.
Questions? [Contact me](mailto:joaoeduardoblasques@gmail.com).*
