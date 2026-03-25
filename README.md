# PyScape - 3D Spatial Web Application

PyScape is a 3D spatial web application that allows users to design, build, and interact with 3D scenes. It features a complete authentication system with Two-Factor Authentication (2FA), Voice Commands (via Gemini AI), and an extensive 3D model library (via Poly Pizza).

## 🚀 Tech Stack
- **Frontend**: Vanilla JavaScript, Vite, Three.js, Cannon-es (Physics)
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT, bcryptjs, Nodemailer (Email OTP for 2FA)

---

## 📋 Prerequisites
Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [PostgreSQL](https://www.postgresql.org/) (Running locally on port 5432, unless using a cloud database)
- [Git](https://git-scm.com/)

---

## 🛠️ Step-by-Step Setup Instructions

### 1. Database Setup
1. Open your PostgreSQL terminal (`psql`).
2. Create the database and connect to it:
   ```sql
   CREATE DATABASE pyscape;
   \c pyscape
   ```
3. Apply the initial schema (run this in your normal terminal from the project root):
   ```bash
   psql -U postgres -d pyscape -f server/migrations/schema.sql
   ```

### 2. Environment Variables Configuration
The project uses two environment files: one for the frontend and one for the backend.

#### Frontend (`/.env`)
Copy the template in the root directory to create your environment file:
```bash
cp .env-example .env
```
Open the `.env` file and configure your API keys:
- `VITE_GEMINI_API_KEY`: Your Google Gemini API key (for voice commands).
- `VITE_POLY_PIZZA_API_KEY`: Your Poly Pizza API key (for fetching 3D models).

#### Backend (`/server/.env`)
Navigate to the `server` directory and copy the template:
```bash
cd server
cp .env-example .env
```
Open `server/.env` and configure the following:
- **Server info**: `PORT` (default 5001), `JWT_SECRET` (your secure JWT secret string used for signing tokens).
- **Database**: 
  - *Option A (Cloud, Recommended for teams)*: Set `DATABASE_URL` to your Neon/Supabase/etc connection string.
  - *Option B (Local)*: Set `PG_HOST=localhost`, `PG_PORT=5432`, `PG_DATABASE=pyscape`, `PG_USER=postgres`, and `PG_PASSWORD=your_local_password`.
- **2FA Email Configuration**: Set `EMAIL_USER` to your system's Gmail address and `EMAIL_PASS` to its 16-character [Gmail App Password](https://support.google.com/accounts/answer/185833). This is strictly required for Two-Factor Authentication (OTP verification).

---

## 🏃 Running the Application

### 1. Start the Backend Server
Open a terminal, navigate to the `server` folder, install dependencies, and run the dev server:
```bash
cd server
npm install
npm run dev
```
You should see:
> `PyScape server running on port 5001`
> `PostgreSQL connected`

### 2. Start the Frontend Application
Open a **new** terminal (keep the backend running) in the **root** folder of the project, install dependencies, and run Vite:
```bash
npm install
npm run dev
```
You should see output indicating the server is running, typically:
> `➜ Local: http://localhost:5173/`

---

## 🎮 Accessing the App & Features
Open your web browser and navigate to **http://localhost:5173**.

1. **Sign Up & Auth**: Create a new account. The system will automatically email a One-Time Password (OTP) to verify your registration (2FA).
2. **Dashboard**: Once logged in, you can manage and load your saved projects.
3. **3D Workspace**:
   - Add objects from the sidebar (Furniture, Electronics, Vehicles, etc.).
   - Double-click objects to open the **Properties Panel** (change color, scale, add textures like custom carpet images, or adjust lamp intensity).
   - Use the **Voice Command** microphone to perform actions using AI (e.g., "Spawn a table", "Delete the chair").
   - View your scene in **Live AR** directly from your mobile device.

Enjoy building your virtual worlds in 3D!
