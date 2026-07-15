## Project Overview

[Vitals](https://github.com/joaoblasques/vitals) is a governed **medallion lakehouse** for healthcare
data: raw, messy, multi-source clinical signals go in — FHIR resources, insurance claims, wearable
sensor streams, patient-reported surveys, free-text notes — and three trusted outputs come out:
**analytics marts**, an **ML feature store**, and a **vector index** for retrieval. Built on
Databricks/Delta with dbt, Airflow, and PySpark, and runnable end-to-end on a laptop via DuckDB with
one command (`make run`).

Healthcare data is about as messy as data gets: competing vocabularies, silent unit drift (mg/dL vs.
mmol/L), PHI everywhere, and free text where standardized codes belong. The job of this project is to
show what it takes to turn that into data that a business — and increasingly, an AI model — can
actually trust. See the [full write-up and live results](https://joaoblasques.com/vitals/).

---

## Key Concepts

- **Medallion + a healthcare layer:** Bronze (raw FHIR/claims/wearables/notes, mess intact) → Silver
  (de-identified, standardized to ICD-10/SNOMED/LOINC/RxNorm, conformed to the **OMOP CDM**) → Gold
  (three consumption shapes). The de-identification boundary sits at silver: a de-id assertion fails
  the build if any PHI column survives.
- **Three gold stores, not one:** analytics, classical ML, and RAG each need a different shape of the
  same clean data — a **dbt Kimball star + MetricFlow semantic layer** for BI, a **Feast** feature
  store (offline + online, parity-checked) for model training and low-latency inference, and a
  **pgvector** index for retrieval over clinical notes.
- **Data quality as a CI gate, not a dashboard.** **Great Expectations** validates 14 expectations on
  the silver coded-vocabulary contract — value sets, PHI boundary columns, range and uniqueness checks
  — and a violation exits non-zero and fails the build.
- **Cross-engine parity as a correctness proof.** The same silver/gold logic runs on four different
  engines (local DuckDB, Databricks Delta, PySpark, and a real Kafka streaming path for the wearable
  feed), and each is checked against the others for identical output. That parity check is what
  caught a real bug: a DuckDB-only defect that was silently dropping quoted-JSON billed amounts —
  found only because the Databricks Delta path disagreed with it.

---

## The catch: a de-identification gap that wasn't

ADR 0002 documented `patient_key` as a *salted* hash — the standard way to pseudonymize an ID without
making it reversible. The implementation didn't match the ADR: every engine was shipping a bare
`md5(id)`. Synthea's patient IDs are a small, sequential, guessable space, so an unsalted hash over
them is trivially reversible with a dictionary or rainbow-table attack. The "de-identified" silver
layer could have been re-identified.

The fix: a single shared secret salt (`VITALS_SALT`, read from environment, gitignored `.env` locally,
a Databricks job secret in production), applied to `patient_key` and the per-patient date-shift on all
four engine paths — DuckDB, Databricks Delta, PySpark, and streaming. The salt has to be the *same*
value across every row and table, not per-row random, or cross-table joins on `patient_key` would
break. Verified after the fact: keys changed from the old unsalted output, zero orphaned keys across
all five child silver tables, and the full test suite plus the Great Expectations gate stayed green
with the salt supplied only via environment.

This is exactly the class of bug a written ADR is supposed to prevent and didn't — the design was
right, the code drifted from it, and nothing caught the gap until it was deliberately checked for.

---

## Architecture

```
BRONZE  raw & messy: FHIR (Synthea) · claims · wearable sensor streams · PRO surveys · notes
        (schema drift, dupes, mixed units, missingness, PHI present & gated)
   ↓
SILVER  de-identified (HIPAA Safe Harbor + salted date-shift) = PHI boundary; FHIR flattened;
        codes standardized (ICD-10/SNOMED/LOINC/RxNorm); OMOP CDM; DQ contracts (Great Expectations)
   ↓
GOLD    analytics marts (dbt + MetricFlow) + feature store (Feast) + vector index (pgvector)
   ↓
PROVE   MLflow surgery-risk demo model (features) + a RAG demo (vectors)
```

Production deploys as one scheduled serverless Databricks job — generate → bronze → silver → gold →
drift monitoring, unattended, with the de-id assertion and dbt tests running as in-job gates.

---

## Results (600 synthetic patients, seeded and reproducible)

- Silver recovers 100% ICD-10 coding from 81.3% in bronze (112 conditions recovered from free text),
  removes 29 exact-duplicate patient rows, and standardizes glucose units from two units down to one.
- The Great Expectations silver gate: **14/14 checks pass** in CI.
- The wearable stream: **15,169 events** through a real local Kafka broker, byte-for-byte parity
  against the file-source path.
- A demo surgery-risk model (logistic regression, MLflow-tracked) scores **ROC-AUC 0.748** on a
  curated 10-feature subset of the Feast store — with clinically coherent coefficients (disability
  score, age, and pain raise risk; adherence and activity lower it).

Full numbers, the dbt mart breakdowns, and the RAG demo are on the
[Results page](https://joaoblasques.com/vitals/results/).

---

## Takeaway

The interesting engineering in a health-data lakehouse isn't the pipeline shape — bronze/silver/gold
is well-trodden — it's everything domain-specific layered on top: de-identification that has to
survive scrutiny, vocabulary standardization that has to be provably complete, and a data-quality gate
that can't be skipped. Cross-engine parity testing turned out to be the thing that actually caught a
real bug, and treating an ADR as a claim to verify — not just a document to write — is what caught the
de-identification gap before it shipped anywhere real.
