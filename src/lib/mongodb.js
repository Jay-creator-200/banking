import mongoose from 'mongoose';

// Fix querySrv ECONNREFUSED on local systems by fallback to public DNS resolvers
let dnsPromise = null;
if (typeof window === 'undefined' && process.env.NEXT_RUNTIME !== 'edge') {
  dnsPromise = import('dns')
    .then((dnsModule) => {
      dnsModule.setServers(['8.8.8.8', '1.1.1.1']);
    })
    .catch((e) => {
      console.warn('Could not set custom DNS servers for MongoDB resolution:', e);
    });
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside your configuration or .env file'
  );
}

/**
 * Global cache is used here to maintain a cached connection across hot-reloads
 * in development. This prevents database connections from growing exponentially
 * during fast refreshes in development, and optimizes reuse in serverless environments.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Connect to MongoDB Database using Mongoose singleton instance.
 * @returns {Promise<typeof mongoose>}
 */
export async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (dnsPromise) {
    await dnsPromise;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      // Optimized connection pool settings for serverless environments (Vercel)
      maxPoolSize: 10,
      minPoolSize: 2,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      // Register global event listeners for database connections
      mongoose.connection.on('connected', () => {
        console.log('MongoDB connection successfully established.');
      });

      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB connection disconnected.');
      });

      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('Failed to establish initial MongoDB connection:', e);
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
