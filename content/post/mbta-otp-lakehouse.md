+++
date = '2026-06-23T10:00:00+01:00'
draft = false
title = 'Building a Self-Managing MBTA On-Time-Performance Lakehouse (Databricks + GCP)'
description = 'A live transit-data lakehouse that ingests MBTA real-time feeds, computes on-time performance, and runs, heals, and improves itself — with an agentic layer that writes its own insights and opens pull requests.'
tags = ['data engineering', 'databricks', 'gcp', 'lakehouse', 'spark', 'structured streaming', 'terraform', 'ci-cd', 'agentic']
+++

## Project Overview

[This project](https://github.com/joaoblasques/mbta-on-time-lakehouse) answers a deceptively simple
question — **"is the MBTA late, and where?"** — with a fully automated data lakehouse on
**Databricks + Google Cloud**. Every couple of minutes it captures Boston's live transit feed,
compares actual arrivals to the timetable, and publishes an **on-time-performance (OTP)**
scoreboard. The twist: the system **runs, heals, and improves itself**, and an agentic layer writes
its own nightly insights and opens pull requests with proposals.

The goal was to build *one* deep, end-to-end, production-shaped project rather than a pile of toy
demos — something that survives interview scrutiny.

---

## Key Concepts

- **Medallion architecture:** data flows Bronze (raw) → Silver (cleaned: how late is each stop?) →
  Gold (business-ready: the OTP marts), each layer with a clear job.
- **OTP is a product decision:** "on time" isn't given — it's a tunable band (e.g. −1 to +5 min).
  The hardest logic is *time reconciliation*: real-time arrivals are absolute UTC instants, the
  schedule is local time-of-day that can exceed 24:00:00 (after-midnight service). Getting that
  wrong silently corrupts every number — so it's covered by Spark integration tests.
- **Self-managing loop (agentic):** a nightly **"Dreamer"** reads the gold marts, narrates what's
  notable via an LLM, learns a drift-guarded baseline, and opens a **CI-gated pull request** with
  proposed new metrics. A **failure-monitor** watches the hourly job and either auto-retries it or
  files a deduplicated issue. Tiered autonomy: safe fixes are automatic; anything consequential is
  proposed for a human to merge.
- **Everything is code:** the cloud is **Terraform**; the Databricks job is a **Databricks Asset
  Bundle**; the shared transform logic ships as a tested **wheel** the notebooks import (no drift).

---

## Architecture

```
MBTA GTFS-Realtime  →  Cloud Run poller (2 min)  →  GCS
GCS  →  Cloud Run copier (15 min)  →  Databricks Volume
Volume  →  Medallion job (hourly): Bronze → Silver → Gold (OTP)
Gold  →  AI/BI dashboard  +  nightly Dreamer (insights → PR)
Failure-monitor (30 min): auto-retry / auto-issue
```

Two infrastructure-as-code layers, each native to its platform: **Terraform** owns GCP (storage,
Cloud Run, schedulers, secrets, IAM); **Asset Bundles** own Databricks (the job + notebooks +
wheel). CI runs lint, unit + Spark integration tests, and gates `terraform plan → apply` using
**keyless Workload Identity Federation** (GitHub mints an OIDC token, GCP exchanges it for a
short-lived credential — no service-account keys stored anywhere).

---

## Engineering Practices Worth Calling Out

- **Tested transforms, not tested copies.** The tricky silver/gold logic lives in one library,
  exercised on a real local Spark session (including the after-midnight wrap), and packaged as a
  dep-free wheel that the production notebooks import. The code that's tested is the code that runs.
- **Dev → prod discipline.** Changes are validated in an isolated bundle target before the live
  pipeline is touched — which paid off when a memory bug surfaced under real data volume.
- **The system caught its own bug.** When ingestion hit an out-of-memory error at scale, the
  failure-monitor detected it automatically — exactly what a self-managing layer is for.
- **Cost-aware by design:** Databricks Free Edition + GCP free credits, serverless throughout.

---

## What's Next: Streaming

Today the pipeline re-reads a bounded window of recent files each hour. The next step is **true
incremental ingestion** using **Structured Streaming + Auto Loader** with `Trigger.AvailableNow` —
a streaming query that wakes on schedule, processes only *new* files (tracked by a checkpoint), and
stops. It keeps full history without the per-run work growing, and demonstrates real streaming
within free-tier limits (no always-on cluster required). Built dev-first, then cut over in one
reviewed change.

---

## Takeaway

A modern lakehouse isn't just pipelines — it's reproducible infrastructure, tested logic, CI/CD,
and increasingly an **agentic layer** that operates and improves the system. This project is my
hands-on demonstration of all of it, end to end.
