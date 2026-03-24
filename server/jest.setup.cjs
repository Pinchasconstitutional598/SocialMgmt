process.env.GRAPH_API_VERSION = "v20.0";
process.env.FACEBOOK_APP_ID = "test_app_id";
process.env.FACEBOOK_APP_SECRET = "test_app_secret";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-for-jest-min-32-chars!!";
process.env.TOKEN_ENCRYPTION_KEY =
  process.env.TOKEN_ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
