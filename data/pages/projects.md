# Projects & Portfolio

Three projects I'm building now, and the open-source data-engineering work behind them.

## Featured

### Vitals — Health-Data Medallion Lakehouse

**Site**: [joaoblasques.com/vitals](https://joaoblasques.com/vitals/)  
**Code**: [joaoblasques/vitals](https://github.com/joaoblasques/vitals)  
**Technologies**: Databricks/Delta, dbt, Airflow, PySpark, Kafka, Feast, pgvector, Great Expectations, Terraform

**From raw clinical signals to trusted, AI-ready data.**

Healthcare data is the messiest data there is: many source systems, competing
vocabularies, silent unit drift, PHI everywhere, and free text where codes belong.
Vitals is a governed medallion lakehouse that takes raw FHIR, claims, wearable and
notes data in, and serves it three ways — because analytics, classical ML and RAG
each need something different:

| Output | Tech | Serves |
|---|---|---|
| Analytics marts | dbt (Kimball star) + MetricFlow | BI, cohorts, reporting |
| Feature store | Feast | risk features, online + point-in-time |
| Vector index | pgvector | RAG / semantic search over clinical notes |

Silver conforms to the OMOP CDM, a Great Expectations gate fails the build on any
coded-vocabulary violation, and the same silver/gold logic is proven identical across
four execution engines (DuckDB, Databricks Delta, PySpark, and a real Kafka streaming
path) — a parity check that has already caught a real cross-engine bug.

*Status: MVP through Phase 6 shipped — deployed on Databricks (Delta + Unity
Catalog), streaming, governed, and CI-gated.* [Read the write-up →](/post/vitals-medallion-lakehouse/)

---

### Corpus — A Knowledge Base That Tends Itself

**Site**: [joaoblasques.com/corpus](https://joaoblasques.com/corpus/)  
**Technologies**: LLM agents, retrieval, structured knowledge

**Sources in. Cited pages out.**

Most knowledge systems decay: notes pile up, links rot, nothing is findable a year
later. Corpus puts an LLM agent in the role of librarian — it reads everything,
writes it into a cross-linked web of citable pages, and keeps that web consistent as
new sources arrive.

Five intake channels (email, YouTube, PDF, Obsidian vaults, web articles) feed an
inbox; an ingest agent runs collection → clustering → ingestion → verification.
Provenance is non-negotiable by design: information without citations can't be
audited, and information without cross-links can't be discovered.

---

### Nora — Email-Native AI Executive Assistant

**Site**: [nora-bennett.com](https://nora-bennett.com/)  
**Docs**: [docs.nora-bennett.com](https://docs.nora-bennett.com/)  
**Technologies**: LLM agents, email integration, Astro

An AI executive assistant that lives in email rather than in another app you have to
remember to open.

The design constraint that shapes everything: **Nora drafts, the human sends.** That
asymmetry is the product's trust model — an assistant that can send on your behalf is
one bad inference away from an incident you can't take back.

## Data Engineering — Open Source

The pipeline work underneath. All public, each with a write-up.

### MBTA On-Time-Performance Lakehouse

**GitHub**: [joaoblasques/mbta-on-time-lakehouse](https://github.com/joaoblasques/mbta-on-time-lakehouse)  
**Technologies**: Databricks, GCP, Spark Structured Streaming, Terraform, CI/CD

A self-managing lakehouse answering "is the MBTA late, and where?" — it ingests
Boston's live transit feed, computes on-time performance, and runs, heals and
improves itself. An agentic layer writes nightly insights and opens its own pull
requests. Notably: the failure-monitor caught a real out-of-memory bug in production
by itself, and the transformations are tested against a real Spark session including
the after-midnight time-reconciliation case that silently corrupts naive
implementations. [Read the write-up →](/post/mbta-otp-lakehouse/)

---

### Customer Analytics Pipeline

**GitHub**: [joaoblasques/customer-analytics-pipeline](https://github.com/joaoblasques/customer-analytics-pipeline)  
**Technologies**: Airflow, dbt, Spark, Iceberg, Docker

A daily ELT pipeline identifying high-value customers for sales outreach, using
medallion architecture and Apache Iceberg. [Read the write-up →](/post/customer-analytics-pipeline/)

---

### Analytics Engineering with dbt

**GitHub**: [joaoblasques/data-pipeline-transformation-analytics](https://github.com/joaoblasques/data-pipeline-transformation-analytics)  
**Technologies**: dbt, BigQuery, Looker Studio

Raw NYC taxi data through dimensional models to business intelligence — with testing
and deployment strategy. [Read the write-up →](/post/data-pipeline-transformation-analytics/)

---

### Orchestration: Airflow & Kestra

**GitHub**: [airflow](https://github.com/joaoblasques/data-pipeline-orchestration-airflow) ·
[kestra](https://github.com/joaoblasques/data-pipeline-orchestration-kestra)

Orchestrating robust pipelines across local, GCP and Kubernetes deployments with
Airflow; and the same problem solved with Kestra, fully containerized.
[Airflow write-up →](/post/data-pipeline-orchestration-airflow/) ·
[Kestra write-up →](/post/data-pipeline-orchestration-kestra/)

---

### Also public

- [**e-commerce-analytics-platform**](https://github.com/joaoblasques/e-commerce-analytics-platform) — real-time analytics with Spark, PySpark and Kafka
- [**us_media_business_data_pipelines**](https://github.com/joaoblasques/us_media_business_data_pipelines) — GKE, Airflow, FastAPI ML endpoints, multi-environment Terraform
- [**data-pipeline-datawarehouse-bigquery**](https://github.com/joaoblasques/data-pipeline-datawarehouse-bigquery) — external tables, partitioning, clustering ([write-up](/post/data-warehouse-bigquery-pipeline/))
- [**wpp-multi-cloud-data-pipeline-marketing**](https://github.com/joaoblasques/wpp-multi-cloud-data-pipeline-marketing) — multi-cloud marketing pipeline in Terraform
- [**data-pipeline-simple**](https://github.com/joaoblasques/data-pipeline-simple) — the foundations, one tool at a time ([write-up](/post/data-pipeline-simple/))

---

Interested in any of these, or have a data problem you'd like to talk through?
[Get in touch](mailto:joaoeduardoblasques@gmail.com).
