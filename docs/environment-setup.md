# Environment Variables Setup Guide

This guide covers all required environment variables for Magic Mailer's core functionality.

## Quick Setup Checklist

- [ ] **MongoDB**: Database connection configured
- [ ] **OpenAI API**: Key configured for embeddings and generation
- [ ] **Clerk**: Authentication keys configured
- [ ] **Encryption**: Security key configured
- [ ] **App URL**: Base URL configured for callbacks

## Required Environment Variables

### 1. Database Configuration (MongoDB)

```env
# REQUIRED: MongoDB connection string
MONGODB_URI=mongodb://localhost:27017/magic-mailer
# Or MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/magic-mailer

# OPTIONAL: Database name (defaults to 'magic-mailer')
MONGODB_DB_NAME=magic-mailer
```

**Where to get:**
- **Local MongoDB**: `mongodb://localhost:27017/magic-mailer`
- **MongoDB Atlas**: Create cluster at https://cloud.mongodb.com/

**Test connection:**
```bash
# Run the health check endpoint
curl http://localhost:3000/api/health
```

### 2. AI Services (OpenAI)

```env
# REQUIRED: OpenAI API key for embeddings and text generation
OPENAI_API_KEY=sk-proj-your-key-here
```

**Where to get:**
- Visit https://platform.openai.com/api-keys
- Create a new API key
- Format: `sk-proj-...` (project-scoped) or `sk-...` (legacy)

**Used for:**
- Text embeddings (`text-embedding-3-small` model)
- Content generation and style analysis
- Newsletter content optimization

### 3. Authentication (Clerk)

```env
# REQUIRED: Clerk publishable key (safe for client-side)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your-key-here

# REQUIRED: Clerk secret key (keep secret!)
CLERK_SECRET_KEY=sk_test_your-secret-here

# OPTIONAL: Custom URLs (defaults shown)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/projects
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/projects
```

**Where to get:**
- Create account at https://dashboard.clerk.com/
- Create new application
- Copy keys from "API Keys" section

**Test authentication:**
- Visit `/sign-in` and `/sign-up` pages
- Try accessing `/projects` (should redirect to sign-in)

### 4. Security (Encryption)

```env
# REQUIRED: Encryption key for storing sensitive API keys
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

**How to generate:**
```bash
# Generate a secure 32-byte (64 hex characters) key
openssl rand -hex 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Used for:**
- Encrypting user API keys (GetResponse, etc.)
- Secure storage of sensitive connection data

### 5. Application Configuration

```env
# REQUIRED: Base URL for callbacks and redirects
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Values:**
- **Development**: `http://localhost:3000`
- **Production**: `https://yourdomain.com`

## Optional Environment Variables

### GetResponse Integration

```env
# OPTIONAL: GetResponse API key for newsletter creation
GETRESPONSE_API_KEY=your-getresponse-api-key
```

**Where to get:**
- Login to GetResponse account
- Go to Account → Integrations & API → API
- Generate new API key

## Environment File Setup

### 1. Create `.env.local`

Create a `.env.local` file in your project root:

```bash
# Copy the example file
cp .env.example .env.local

# Edit with your values
nano .env.local  # or use your preferred editor
```

### 2. Minimum Required Configuration

For basic functionality, you need at minimum:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/magic-mailer

# AI Services
OPENAI_API_KEY=sk-proj-your-openai-key

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your-clerk-publishable-key
CLERK_SECRET_KEY=sk_test_your-clerk-secret-key

# Security
ENCRYPTION_KEY=your-64-character-hex-encryption-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Verification Steps

### 1. Database Connection

```bash
# Test MongoDB connection
curl http://localhost:3000/api/health

# Should return:
# {"ok": true, "status": "healthy", "timestamp": "..."}
```

### 2. OpenAI API

```bash
# Test embeddings endpoint (requires authentication)
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-clerk-jwt" \
  -d '{"text": "test content"}'
```

### 3. Clerk Authentication

1. Visit `http://localhost:3000/sign-in`
2. Sign up for a new account
3. Verify redirect to `/projects`
4. Check that protected routes require authentication

### 4. Encryption System

The encryption system will automatically use either:
- `ENCRYPTION_KEY` if provided (recommended)
- Derived key from `CLERK_SECRET_KEY` as fallback

## Troubleshooting

### Common Issues

#### MongoDB Connection Failed
```
Error: MONGODB_URI environment variable is not defined
```
**Solution:** Add `MONGODB_URI` to `.env.local`

#### OpenAI API Key Missing
```
Error: OPENAI_API_KEY environment variable is required
```
**Solution:** Add valid OpenAI API key to `.env.local`

#### Clerk Authentication Not Working
```
Error: Missing publishable key
```
**Solution:** Verify both `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are set

#### Encryption Key Invalid
```
Error: ENCRYPTION_KEY must be 64 hex characters (32 bytes)
```
**Solution:** Generate new key with `openssl rand -hex 32`

### Verification Script

Create a simple verification script:

```typescript
// scripts/verify-env.ts
import { config } from 'dotenv';
config({ path: '.env.local' });

const required = [
  'MONGODB_URI',
  'OPENAI_API_KEY', 
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'NEXT_PUBLIC_APP_URL'
];

const optional = [
  'MONGODB_DB_NAME',
  'ENCRYPTION_KEY',
  'GETRESPONSE_API_KEY'
];

console.log('🔍 Checking environment variables...\n');

let missing = 0;

required.forEach(key => {
  if (process.env[key]) {
    console.log(`✅ ${key}`);
  } else {
    console.log(`❌ ${key} (REQUIRED)`);
    missing++;
  }
});

optional.forEach(key => {
  if (process.env[key]) {
    console.log(`✅ ${key} (optional)`);
  } else {
    console.log(`⚠️  ${key} (optional, not set)`);
  }
});

console.log(`\n${missing === 0 ? '🎉' : '❌'} ${missing === 0 ? 'All required variables set!' : `${missing} required variables missing`}`);
```

Run with: `npx tsx scripts/verify-env.ts`

## Security Best Practices

1. **Never commit `.env.local`** - It's in `.gitignore` by default
2. **Use different keys for development and production**
3. **Rotate API keys regularly**
4. **Use environment-specific MongoDB databases**
5. **Generate strong encryption keys**

## Production Deployment

For production deployment, set these environment variables in your hosting platform:

### Vercel
```bash
vercel env add MONGODB_URI
vercel env add OPENAI_API_KEY
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
vercel env add CLERK_SECRET_KEY
vercel env add ENCRYPTION_KEY
vercel env add NEXT_PUBLIC_APP_URL
```

### Other Platforms
- **Railway**: Set in project settings
- **Heroku**: Use `heroku config:set`
- **Docker**: Use environment variables or secrets

## Support

If you encounter issues:
1. Check this documentation
2. Verify all required variables are set
3. Test each service independently
4. Check service status pages (OpenAI, Clerk, MongoDB Atlas)
