# 🧠 Evidence-Based Research Briefing Assistant

An AI-powered research assistant that enables users to upload documents and ask evidence-based questions. The application extracts text from uploaded documents, stores them in PostgreSQL, and leverages LLMs to generate contextual, citation-aware responses.

---

## ✨ Features

* 📄 Upload PDF and DOCX documents
* 🤖 AI-powered question answering using Groq LLM
* 🔍 Evidence-based responses from uploaded documents
* 🗂 Document management
* 🔐 JWT Authentication
* 📦 PostgreSQL database
* ⚡ Express + TypeScript backend
* ⚛ React + Vite frontend
* 📁 Local file storage
* 📜 Request validation using Zod
* 📝 Structured logging using Pino

---

# Tech Stack

## Frontend

* React 19
* TypeScript
* Vite
* React Router
* React Query
* React Hook Form
* Tailwind CSS
* Axios
* Zod

## Backend

* Node.js
* Express.js
* TypeScript
* PostgreSQL
* Prisma ORM
* JWT Authentication
* Multer
* Mammoth
* PDF Parse
* Pino Logger
* Zod

## AI

* Groq API
* Llama 3.3 70B Versatile

---

# Project Structure

```
Evidence_Based_Assistant_Project
│
├── client/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── .env
│
├── server/
│   ├── src/
│   ├── uploads/
│   ├── package.json
│   ├── database_schema.sql
│   └── .env
│
├── README.md
└── .gitignore
```

---

# Prerequisites

Install the following software before running the project.

* Node.js 22+
* PostgreSQL 16+
* Git
* npm

Verify installation

```
node -v
npm -v
psql --version
```

---

# Clone Repository

```
git clone https://github.com/Avinash-Bagul/Evidence_based_Assistant_Project.git

cd Evidence_based_Assistant_Project
```

---

# PostgreSQL Setup

Open PostgreSQL terminal

```
psql -U postgres
```

Create Database

```
CREATE DATABASE ai_db;
```

Connect Database

```
\c ai_db
```

Run schema

## Database Setup

To make the project setup easier, a **`database_schema.sql`** file is included in the repository.

This file contains all the required database schema, including:

* Tables
* Indexes
* Custom Types
* Constraints
* Extensions

### Step 1: Create the Database

Open PostgreSQL and create a new database:

```bash
CREATE DATABASE ai_db;
```

### Step 2: Import the Schema

Navigate to the `server` directory (or wherever `database_schema.sql` is located) and run:

```bash
psql -U postgres -d ai_db -f database_schema.sql
```

Alternatively, from inside the PostgreSQL terminal:

```sql
\c ai_db
\i database_schema.sql
```

After the import completes successfully, your database will contain all the required tables and schema needed to run the application. No additional SQL setup is required.


```
\i database_schema.sql
```

or

```
psql -U postgres -d ai_db -f database_schema.sql
```

---

# Backend Setup

Navigate to server

```
cd server
```

Install dependencies

```
npm install
```

Create `.env`

```
PORT=3001

NODE_ENV=development

DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/ai_db

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=YOUR_PASSWORD
DB_NAME=ai_db

JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

GROQ_API_KEY=YOUR_GROQ_API_KEY
GROQ_MODEL=llama-3.3-70b-versatile

UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=50

LOG_LEVEL=info
```

Run Backend

```
npm run dev
```

Build Backend

```
npm run build
```

Run Production

```
npm start
```

---

# Frontend Setup

Open another terminal

```
cd client
```

Install dependencies

```
npm install
```

Create `.env`

```
VITE_BASE_API=http://localhost:3001/api
```

Run frontend

```
npm run dev
```

The frontend will start on

```
http://localhost:5173
```

---

# Running Complete Application

Start Backend

```
cd server
npm run dev
```

Open another terminal

```
cd client
npm run dev
```

Application

```
Frontend
http://localhost:5173

Backend
http://localhost:3001
```

---

# File Uploads

Uploaded documents are stored locally inside

```
server/uploads
```

Supported files

* PDF
* DOCX

Maximum file size

```
50 MB
```

---

# AI Configuration

Create a free Groq API Key

https://console.groq.com/keys

Update

```
GROQ_API_KEY=YOUR_API_KEY
```

Model

```
llama-3.3-70b-versatile
```

---

# Available Scripts

## Backend

```
npm run dev
```

Development Server

```
npm run build
```

Compile TypeScript

```
npm start
```

Run Production Build

```
npm run lint
```

Lint Backend

---

## Frontend

```
npm run dev
```

Run Development Server

```
npm run build
```

Build Project

```
npm run preview
```

Preview Build

```
npm run lint
```

Lint Project

---

# API Overview

Authentication

```
POST /api/auth/login
POST /api/auth/register
```

Documents

```
POST /api/documents/upload
GET /api/documents
DELETE /api/documents/:id
```

AI

```
POST /api/chat
```

---

# Troubleshooting

## PostgreSQL Connection Error

Verify PostgreSQL service is running.

```
net start postgresql-x64-16
```

Windows

or

```
sudo systemctl start postgresql
```

Linux

---

## Port Already In Use

Change

```
PORT=3001
```

inside

```
server/.env
```

---

## Database Connection Failed

Verify

* Database exists
* Password is correct
* DATABASE_URL is correct

---

## Groq Authentication Failed

Verify

```
GROQ_API_KEY
```

is valid.

---



---



# License

This project is licensed under the MIT License.

---

# Author

**Avinash Bagul**

GitHub

https://github.com/Avinash-Bagul

