+++
date = '2025-06-21T09:30:00+01:00'
draft = false
title = 'Simple Data Pipeline'
description = 'A step by step guide of a simple data pipeline '
tags = ['data engineering', 'beginners', 'tutorial', 'docker', 'terraform', 'gcp', 'python', 'postgresql']
+++

## Project Overview

This [repository](https://github.com/joaoblasques/data-pipeline-simple) provides a comprehensive, step-by-step guide to building a simple data engineering pipeline using containerization (Docker), orchestration (Docker Compose), and Infrastructure as Code (Terraform), with a focus on ingesting and processing NYC taxi data. The project is hands-on and includes conceptual explanations, infrastructure setup, and several example pipeline flows.

This project is a practical template for data engineers to learn and implement containerized data pipelines, local and cloud database management, and automated cloud infrastructure provisioning using modern tools like Docker, Docker Compose, and Terraform. It is especially useful for those looking to understand the end-to-end workflow from local prototyping to cloud deployment in a reproducible, automated way.

## Key Features

1. **Data Pipeline Example**  
   - Demonstrates how to build a data pipeline that ingests raw CSV data (NYC yellow taxi trip data), processes it with Python (using pandas), and loads it into a PostgreSQL database.

2. **Containerization with Docker**  
   - Shows how to create Docker images for both the data ingestion script and the database.
   - Provides a `Dockerfile` for building a containerized Python environment to run the ingestion script.
   - Explains how to run PostgreSQL and pgAdmin (a database GUI) in containers.

3. **Orchestration with Docker Compose**  
   - Includes a `docker-compose.yaml` file to easily spin up a multi-container environment (Postgres + pgAdmin) with a single command.
   - Demonstrates Docker networking and persistent storage using volumes.

4. **Parameterizable Ingestion Script**  
   - The `ingest_data.py` script is parameterized to accept database credentials, table name, and data source URL as command-line arguments.
   - Downloads, decompresses, and processes large CSV files in chunks to efficiently load data into Postgres.

5. **Infrastructure as Code with Terraform**  
   - Provides instructions and examples for using Terraform to provision cloud infrastructure on Google Cloud Platform (GCP), including:
     - Creating a Google Cloud Storage bucket (for data lake storage).
     - Creating a BigQuery dataset (for analytics/data warehousing).
   - Explains how to manage GCP credentials and automate infrastructure deployment.

6. **Cloud Integration**  
   - Guides you through setting up GCP projects, service accounts, and permissions for secure, automated cloud resource management.

## Typical Workflow

1. **Local Development**:  
   - Build and test the data ingestion pipeline locally using Docker containers.
   - Use Docker Compose to manage multi-container setups (database, admin GUI, ingestion script).

2. **Data Ingestion**:  
   - Download NYC taxi data, process it in chunks, and load it into a Postgres database running in a container.

3. **Database Management**:  
   - Use pgAdmin (in a container) for database exploration and management.

4. **Cloud Deployment**:  
   - Use Terraform scripts to provision cloud resources (storage, data warehouse) on GCP for production-scale data engineering.
