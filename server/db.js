import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

// Use a single cloud URL if provided, otherwise fallback to local variables
const poolConfig = process.env.DATABASE_URL
    ? { 
        connectionString: process.env.DATABASE_URL, 
        ssl: { rejectUnauthorized: false } // Required for most cloud providers
      }
    : {
        host: process.env.PG_HOST || 'localhost',
        port: process.env.PG_PORT || 5432,
        database: process.env.PG_DATABASE || 'pyscape',
        user: process.env.PG_USER || 'postgres',
        password: process.env.PG_PASSWORD || '',
    };

const pool = new Pool(poolConfig);

pool.on('connect', () => {
    console.log('PostgreSQL connected');
});

pool.on('error', (err) => {
    console.error('PostgreSQL pool error:', err);
});

export default pool;
