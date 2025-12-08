import express from 'express';
import cors from 'cors';
import Redis from 'ioredis';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// ==================== DATABASE CONNECTIONS ====================

// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'shm',
  password: process.env.MYSQL_PASS || '',
  database: process.env.MYSQL_DATABASE || 'shm',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

let mysqlConnected = false;

// Redis connection (for caching only)
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    if (times > 3) {
      console.log('Redis connection failed, running without cache');
      return null;
    }
    return Math.min(times * 100, 3000);
  },
});

let redisConnected = false;

redis.on('connect', () => {
  redisConnected = true;
  console.log('✓ Connected to Redis (cache)');
});

redis.on('error', (err) => {
  redisConnected = false;
  console.log('Redis error (caching disabled):', err.message);
});

// ==================== DATABASE INITIALIZATION ====================

const DEFAULT_BRANDING = {
  appName: 'SHM Admin',
  appTitle: 'SHM Admin',
  logoUrl: '',
  primaryColor: '#22d3ee',
  loginTitle: 'SHM Admin',
  loginSubtitle: 'Войдите в систему управления',
};

async function initDatabase() {
  try {
    const connection = await pool.getConnection();
    
    // Create admin_settings table if not exists
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(255) NOT NULL UNIQUE,
        setting_value JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Check if branding exists, if not insert default
    const [rows] = await connection.execute(
      'SELECT setting_value FROM admin_settings WHERE setting_key = ?',
      ['branding']
    );
    
    if (rows.length === 0) {
      await connection.execute(
        'INSERT INTO admin_settings (setting_key, setting_value) VALUES (?, ?)',
        ['branding', JSON.stringify(DEFAULT_BRANDING)]
      );
      console.log('✓ Default branding settings created');
    }
    
    connection.release();
    mysqlConnected = true;
    console.log('✓ Connected to MySQL');
    console.log('✓ Table admin_settings ready');
  } catch (error) {
    console.error('MySQL initialization error:', error.message);
    mysqlConnected = false;
  }
}

// Initialize database on startup
initDatabase();

// Middleware
app.use(cors());
app.use(express.json());

const CACHE_PREFIX = 'shm-admin:cache:';
const BRANDING_CACHE_KEY = 'shm-admin:branding';

// ==================== BRANDING API (MySQL storage) ====================

// Get branding settings
app.get('/api/branding', async (req, res) => {
  try {
    // Try cache first
    if (redisConnected) {
      const cached = await redis.get(BRANDING_CACHE_KEY);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    }
    
    // Get from database
    if (mysqlConnected) {
      const [rows] = await pool.execute(
        'SELECT setting_value FROM admin_settings WHERE setting_key = ?',
        ['branding']
      );
      
      if (rows.length > 0) {
        const branding = rows[0].setting_value;
        
        // Cache the result
        if (redisConnected) {
          await redis.setex(BRANDING_CACHE_KEY, 3600, JSON.stringify(branding));
        }
        
        return res.json(branding);
      }
    }
    
    res.json(DEFAULT_BRANDING);
  } catch (error) {
    console.error('Error getting branding:', error);
    res.json(DEFAULT_BRANDING);
  }
});

// Update branding settings
app.post('/api/branding', async (req, res) => {
  try {
    const branding = { ...DEFAULT_BRANDING, ...req.body };
    
    if (mysqlConnected) {
      await pool.execute(
        `INSERT INTO admin_settings (setting_key, setting_value) 
         VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE setting_value = ?`,
        ['branding', JSON.stringify(branding), JSON.stringify(branding)]
      );
      
      // Invalidate cache
      if (redisConnected) {
        await redis.del(BRANDING_CACHE_KEY);
      }
      
      return res.json({ success: true, data: branding });
    }
    
    res.status(500).json({ success: false, error: 'Database not connected' });
  } catch (error) {
    console.error('Error saving branding:', error);
    res.status(500).json({ success: false, error: 'Failed to save branding' });
  }
});

// Reset branding to defaults
app.delete('/api/branding', async (req, res) => {
  try {
    if (mysqlConnected) {
      await pool.execute(
        'UPDATE admin_settings SET setting_value = ? WHERE setting_key = ?',
        [JSON.stringify(DEFAULT_BRANDING), 'branding']
      );
      
      // Invalidate cache
      if (redisConnected) {
        await redis.del(BRANDING_CACHE_KEY);
      }
      
      return res.json({ success: true, data: DEFAULT_BRANDING });
    }
    
    res.status(500).json({ success: false, error: 'Database not connected' });
  } catch (error) {
    console.error('Error resetting branding:', error);
    res.status(500).json({ success: false, error: 'Failed to reset branding' });
  }
});

// ==================== GENERIC SETTINGS API ====================

// Get any setting
app.get('/api/settings/:key', async (req, res) => {
  try {
    if (mysqlConnected) {
      const [rows] = await pool.execute(
        'SELECT setting_value FROM admin_settings WHERE setting_key = ?',
        [req.params.key]
      );
      
      if (rows.length > 0) {
        return res.json({ data: rows[0].setting_value, found: true });
      }
    }
    
    res.json({ data: null, found: false });
  } catch (error) {
    console.error('Error getting setting:', error);
    res.status(500).json({ error: 'Failed to get setting' });
  }
});

// Save any setting
app.post('/api/settings/:key', async (req, res) => {
  try {
    if (mysqlConnected) {
      await pool.execute(
        `INSERT INTO admin_settings (setting_key, setting_value) 
         VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE setting_value = ?`,
        [req.params.key, JSON.stringify(req.body.value), JSON.stringify(req.body.value)]
      );
      
      return res.json({ success: true });
    }
    
    res.status(500).json({ success: false, error: 'Database not connected' });
  } catch (error) {
    console.error('Error saving setting:', error);
    res.status(500).json({ success: false, error: 'Failed to save setting' });
  }
});

// ==================== CACHE API ====================

// Get cached data
app.get('/api/cache/:key', async (req, res) => {
  try {
    if (!redisConnected) {
      return res.json({ data: null, cached: false });
    }
    
    const key = CACHE_PREFIX + req.params.key;
    const cached = await redis.get(key);
    
    if (cached) {
      return res.json({ data: JSON.parse(cached), cached: true });
    }
    
    res.json({ data: null, cached: false });
  } catch (error) {
    console.error('Error getting cache:', error);
    res.json({ data: null, cached: false });
  }
});

// Set cached data
app.post('/api/cache/:key', async (req, res) => {
  try {
    if (!redisConnected) {
      return res.json({ success: false, error: 'Redis not connected' });
    }
    
    const key = CACHE_PREFIX + req.params.key;
    const { data, ttl = 300 } = req.body; // default TTL 5 minutes
    
    await redis.setex(key, ttl, JSON.stringify(data));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error setting cache:', error);
    res.status(500).json({ success: false, error: 'Failed to set cache' });
  }
});

// Delete cached data
app.delete('/api/cache/:key', async (req, res) => {
  try {
    if (!redisConnected) {
      return res.json({ success: true });
    }
    
    const key = CACHE_PREFIX + req.params.key;
    await redis.del(key);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting cache:', error);
    res.status(500).json({ success: false, error: 'Failed to delete cache' });
  }
});

// Clear all cache
app.delete('/api/cache', async (req, res) => {
  try {
    if (!redisConnected) {
      return res.json({ success: true, deleted: 0 });
    }
    
    const keys = await redis.keys(CACHE_PREFIX + '*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    
    res.json({ success: true, deleted: keys.length });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ success: false, error: 'Failed to clear cache' });
  }
});

// ==================== HEALTH CHECK ====================

app.get('/api/health', async (req, res) => {
  res.json({
    status: 'ok',
    mysql: mysqlConnected,
    redis: redisConnected,
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 SHM Admin Backend running on http://localhost:${PORT}`);
  console.log(`\n   Branding API (MySQL):`);
  console.log(`   - GET    /api/branding       - Get branding settings`);
  console.log(`   - POST   /api/branding       - Update branding settings`);
  console.log(`   - DELETE /api/branding       - Reset to defaults`);
  console.log(`\n   Settings API (MySQL):`);
  console.log(`   - GET    /api/settings/:key  - Get any setting`);
  console.log(`   - POST   /api/settings/:key  - Save any setting`);
  console.log(`\n   Cache API (Redis):`);
  console.log(`   - GET    /api/cache/:key     - Get cached data`);
  console.log(`   - POST   /api/cache/:key     - Set cached data`);
  console.log(`   - DELETE /api/cache/:key     - Delete cached data`);
  console.log(`\n   Health:`);
  console.log(`   - GET    /api/health         - Health check\n`);
});
