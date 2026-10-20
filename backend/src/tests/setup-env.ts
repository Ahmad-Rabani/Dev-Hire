process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/devhire-test';
process.env.FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:3001';
process.env.PUBLIC_API_URL = process.env.PUBLIC_API_URL ?? 'http://localhost:5000';
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? 'test-access-secret-min-32-chars!!';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-min-32-chars!';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.COOKIE_SECURE = 'false';
process.env.UPLOAD_DIR = process.env.UPLOAD_DIR ?? 'uploads-test';
process.env.MAX_FILE_SIZE_MB = process.env.MAX_FILE_SIZE_MB ?? '5';
