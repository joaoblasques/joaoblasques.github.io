## Project Overview

This [repository](https://github.com/joaoblasques/customer-analytics-pipeline) implements a production-grade ELT pipeline that automates the daily identification of high-value customers. Built as the capstone project for the DE101 course, it brings together Apache Airflow for orchestration, dbt-spark for transformation and data quality, and Apache Iceberg as the open table format — all running locally via Docker Compose.

---

## Key Concepts

- **Medallion Architecture:** Data flows through Bronze (raw), Silver (cleaned), and Gold (business-ready) layers, each serving a distinct purpose in the transformation chain.
- **Airflow Orchestration:** A single DAG wires together data generation, dbt runs, quality tests, and dashboard generation into a reliable daily schedule.
- **dbt Data Quality:** 38 automated tests gate pipeline output — if any test fails, downstream tasks are blocked and the sales mart is never written with bad data.
- **Apache Iceberg Table Format:** Iceberg provides schema evolution, time-travel queries, and efficient partition pruning on top of the local Spark engine.

<!--more-->

## The Problem

Ad hoc SQL queries don't scale. When sales teams need consistent customer rankings — updated daily, reproducible, and auditable — a manual approach breaks down quickly. Analysts re-run queries with slightly different filters, results drift, and no one agrees on the numbers.

This pipeline solves that by automating the full chain: synthetic customer data is generated, loaded into Iceberg tables, transformed through three dbt model layers, tested automatically, and finally written to a dashboard-ready output. The sales team always reads from the same Gold layer, built the same way, every day.

## Architecture

The pipeline follows a four-stage flow:

1. **Generate** — A Python script produces synthetic customer transaction data and writes it as Parquet files.
2. **Load** — Spark reads the Parquet files and writes them to Bronze Iceberg tables stored on local disk.
3. **Transform** — dbt-spark runs the full model graph (staging → core → sales mart), promoting data through Silver and into the Gold layer while running 38 data quality tests.
4. **Dashboard** — A DuckDB + Plotly script reads the Gold layer and generates an HTML report identifying high-value customer segments.

Each stage is a discrete Airflow task, making failures easy to isolate and retry without re-running the entire pipeline.

## DAG Design

The Airflow DAG chains four tasks in sequence:

```
dbt_run → dbt_test → dbt_docs_gen → generate_dashboard
```

The ordering is intentional. `dbt_test` runs immediately after `dbt_run` and acts as a quality gate: if any of the 38 tests fail, `generate_dashboard` is never triggered. This prevents stale or corrupt data from reaching the sales team. `dbt_docs_gen` runs before the dashboard so the documentation site stays in sync with each daily run.

## dbt Data Model

The dbt project is structured in three layers:

- **Staging** — One model per source table. Casts types, renames columns, and applies basic null guards. No business logic here.
- **Core** — Joins and enriches staged tables into a unified customer activity view. This is where revenue attribution and recency calculations live.
- **Sales Mart** — The final Gold model. Ranks customers by lifetime value and segments them into tiers that the dashboard reads directly.

The 38 tests cover not_null and unique constraints on every primary key, accepted_values checks on categorical fields, and relationship tests across model joins. Any broken foreign key or null in a business-critical column stops the pipeline before the output is written.

## Tech Stack

| Component | Version |
|---|---|
| Apache Airflow | 3.1 |
| dbt-spark | latest |
| Apache Spark | 4.0 |
| Apache Iceberg | 1.10 |
| DuckDB | latest |
| Plotly | latest |
| Python | 3.13 |
| Docker / Docker Compose | latest |

Everything runs locally inside Docker Compose. No cloud account required to reproduce the full pipeline.

## Quickstart

```bash
git clone https://github.com/joaoblasques/customer-analytics-pipeline.git
cd customer-analytics-pipeline
docker compose up -d
```

Once the stack is healthy, trigger the `customer_analytics` DAG from the Airflow UI at `http://localhost:8080`. The full run takes a few minutes and produces an HTML dashboard in the `output/` directory.

---

The full source code, dbt models, and setup instructions are available in the [GitHub repository](https://github.com/joaoblasques/customer-analytics-pipeline).