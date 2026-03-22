# PyScape Project

A 3D spatial web application with a NodeJS/Express backend, PostgreSQL database, and Vanilla JS + Three.js + Vite frontend.

## Prerequisites
- **Node.js**: v18+ recommended
- **PostgreSQL**: Running locally on port 5432
- **Git**

## 1. Database Setup

1. Open your PostgreSQL terminal (psql).
2. Create the completely new database and connect to it:
   ```sql
   CREATE DATABASE pyscape;
   \c pyscape
   ```
3. Apply the initial schema:
   ```bash
   psql -U postgres -d pyscape -f server/migrations/schema.sql
   ```

## 2. Environment Variables

The project includes two template environment files: `.env-example` (root) and `server/.env-example`.

### Root Directory (`/.env`)
Copy the template into a new `.env` file:
```bash
cp .env-example .env
```
Update the API keys inside.

### Server Directory (`/server/.env`)
Copy the server template into a new `.env` file:
```bash
cd server
cp .env-example .env
```
Update your newly created `server/.env` file. We **strongly recommend Option A (Cloud Database)** for team projects, as everyone connects to the exact same Postgres database out-of-the-box!

## 3. Running the Backend

Open a terminal and run:
```bash
cd server
npm install
npm run dev
```
You should see: `PyScape server running on port 5001` and `PostgreSQL connected`.

## 4. Running the Frontend

Open a **new** terminal (keep the backend running) and run:
```bash
npm install
npm run dev
```
You should see: `➜ Local: http://localhost:5173/`

## 5. Access the App
Open **http://localhost:5173** in your browser. 
Create an account to test the auth and email-verification flow, and enjoy building in 3D!
