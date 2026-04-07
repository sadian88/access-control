# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MVP Portería Virtual Interactiva (V2)** — A web-based facial recognition and time-tracking system for building entrance control. Identifies residents/visitors via camera, tracks entry/exit state (IN/OUT), calculates stay duration, and alerts an admin dashboard in real time. Does **not** control physical door hardware.

## Planned Tech Stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI (Python) |
| Facial Recognition | InsightFace (512-dimensional embeddings) |
| Database | PostgreSQL + pgvector extension |
| Real-time | WebSockets |
| Frontend | Browser-based (Portería screen + Admin dashboard) |

## Architecture

The system has two frontends and one backend:

- **Portería Screen (Frontend)**: Runs on the entrance device. Captures camera frames, sends them as Base64 to the backend, and displays interactive status messages ("¡Bienvenido!", "¡Hasta luego! Tiempo: Xh Ym", "Aguarde...").
- **Admin Dashboard (Frontend)**: Receives real-time WebSocket pushes for arrivals, departures, and unknown visitor alerts. When an unknown is detected, automatically renders a visitor registration form (fields: Cédula, Nombre, Email, Teléfono, Dirección/Apto).
- **Backend (FastAPI)**: Central microservice handling identification, state machine logic, WebSocket broadcast, and database writes.

### Core API Endpoints (Planned)

- `POST /api/v1/identify` — Accepts a Base64 frame, runs InsightFace embedding extraction, queries pgvector for similarity, and returns a status message plus triggers WebSocket push.
- `POST /api/v1/visitors` — Registers an unknown visitor: receives form data + temporary image ID, creates a profile, links the embedding, and sets state to IN.

### State Machine Logic

Each person has a last-known state (`IN` or `OUT`). On identification:
- `OUT → IN`: Log entry timestamp, push arrival notification, display welcome message.
- `IN → OUT`: Calculate delta (now − entry timestamp), log exit, push departure + duration, display farewell message.
- **No match**: Save temporary image, push unknown-person alert with photo to admin.

### Database Design Notes

- pgvector is used for cosine/L2 similarity search on 512-dimensional face embeddings.
- Visitor/resident profiles store embedding alongside personal data.
- An immutable audit log records every movement event with timestamps and photo references.

## Project Status

Currently in the **specification/planning phase** — only `Readme.md.txt` exists. No code has been written yet. All architectural decisions are documented in that file (in Spanish).
