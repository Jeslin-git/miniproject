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

Create two `.env` files using following templates.

### Root Directory (`/.env`)
Create `.env` in the root folder with:
```env
PG_PASSWORD=your_postgres_password_here
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_POLY_PIZZA_API_KEY=your_poly_pizza_api_key
```

### Server Directory (`/server/.env`)
Create `.env` inside the `server` folder with:
```env
PORT=5001
JWT_SECRET=supersecretkey_change_in_production

# PostgreSQL connection
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=pyscape
PG_USER=postgres
PG_PASSWORD=your_postgres_password_here

# Email Verification (Gmail App Password)
EMAIL_USER=your_gmail_account@gmail.com
EMAIL_PASS=your_16_char_app_password
```
*(Note: If `EMAIL_USER` is empty, registration emails will just print to the server console as a fallback for local testing).*

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
