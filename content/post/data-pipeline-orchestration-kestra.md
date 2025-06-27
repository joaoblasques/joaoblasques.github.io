+++
date = '2025-06-21T09:30:00+01:00'
draft = false
title = 'Data Pipeline Orchestration using Kestra'
description = 'Workflow Orchestration using Kestra tool'
tags = ['data engineering', 'beginners', 'tutorial', 'docker', 'kestra', 'orchestration', 'bigquery', 'data warehouse']
+++

## Project Overview


This [repository](https://github.com/joaoblasques/data-pipeline-orchestration-kestra) demonstrates workflow orchestration for data engineering pipelines using [Kestra](https://kestra.io/). It guides users through building, running, and scheduling data pipelines that extract, transform, and load (ETL) data both locally (with PostgreSQL) and in the cloud (with Google Cloud Platform). The project is hands-on and includes conceptual explanations, infrastructure setup, and several example pipeline flows.

---

## Key Concepts

- **Workflow Orchestration:** Automating and managing complex workflows with dependencies, retries, logging, and monitoring.
- **Kestra:** An orchestration platform with a user-friendly UI and YAML-based workflow definitions (called "flows").
- **Data Lake & Data Warehouse:** Demonstrates moving data from raw storage (GCS) to structured analytics (BigQuery).
<!--more-->
---

## Repository Structure

- `flows/` — YAML files defining Kestra pipelines (flows) for various ETL tasks:
  - `01_getting_started_data_pipeline.yaml`: Simple demo pipeline (extract, transform, query with DuckDB)
  - `02_postgres_taxi.yaml`: Loads NYC taxi data into local PostgreSQL
  - `02_postgres_taxi_scheduled.yaml`: Adds scheduling/backfill to the above
  - `04_gcp_kv.yaml`: Sets up GCP credentials and config in Kestra's KV store
  - `05_gcp_setup.yaml`: Creates GCP resources (bucket, dataset)
  - `06_gcp_taxi.yaml`: Loads taxi data to GCS and BigQuery
  - `06_gcp_taxi_scheduled.yaml`: Scheduled/backfill version for GCP
- `images/` — Visual documentation (pipeline diagrams, UI screenshots, etc.)
- `ny_taxi_postgres_data/` — Persistent volume for the local PostgreSQL instance (.gitignored)
- `data_pgadmin/` — Persistent volume for pgAdmin (database management UI)(.gitignored)
- `docker-compose.yaml` — Defines the local infrastructure:
  - **postgres**: For Kestra metadata
  - **kestra**: Orchestration engine
  - **pgdatabase**: For NYC taxi data
  - **pgadmin**: Web UI for managing PostgreSQL
- `README.md` — In-depth tutorial, conceptual background, and step-by-step instructions

---

## Infrastructure & Setup

- **Local stack** is managed via Docker Compose:
  - Run `docker-compose -p kestra-postgres up -d` to start all services
  - Access Kestra UI at [http://localhost:8080](http://localhost:8080)
  - Access pgAdmin at [http://localhost:8090](http://localhost:8090)
- **Persistent volumes** ensure data is not lost between container restarts
- **pgAdmin** is included for easy database inspection (optional but recommended)

---

## Example Pipelines

- **Getting Started Pipeline:**
  - Extracts data from a REST API
  - Transforms it with Python
  - Queries it with DuckDB
- **Local Postgres Pipeline:**
  - Downloads NYC taxi CSV data
  - Loads it into a local PostgreSQL database
  - Handles deduplication and schema management
  - Supports backfill and scheduling
- **GCP Pipeline:**
  - Uploads data to Google Cloud Storage (GCS)
  - Creates external and native tables in BigQuery
  - Merges new data, avoiding duplicates
  - Supports scheduled and backfill runs

---

## Visual Documentation

- The `images/` directory contains diagrams and screenshots referenced in the README, illustrating pipeline architectures, UI walkthroughs, and data flow.

---

## How to Use

1. **Clone the repository** and review the `README.md` for conceptual background.
2. **Start the local stack** with Docker Compose.
3. **Access Kestra UI** to import and run flows from the `flows/` directory.
4. **(Optional) Use pgAdmin** to inspect the local PostgreSQL database.
5. **For GCP pipelines**, set up your credentials and resources as described in the relevant flows and README sections.

---

## References

- [Kestra Documentation](https://kestra.io/docs/)
- [NYC Taxi Data Source](https://github.com/DataTalksClub/nyc-tlc-data/releases)
- [Project Author's Simple Data Pipeline](https://github.com/joaoblasques/data-pipeline-simple) 