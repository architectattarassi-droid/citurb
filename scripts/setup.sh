#!/bin/bash
set -e

echo "🚀 CITURBAREA Setup Script"
echo "=========================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check Node version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}❌ Node.js 18+ required. Current: $(node -v)${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v) detected${NC}"
echo ""

# 2. Install dependencies
echo "📥 Installing dependencies..."
echo "   This may take 5-10 minutes on first run..."
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# 3. Setup environment
if [ ! -f "apps/api/.env" ]; then
  echo "📝 Creating .env file from template..."
  cp apps/api/.env.example apps/api/.env
  echo -e "${YELLOW}⚠️  Please configure DATABASE_URL in apps/api/.env${NC}"
  echo "   Example: postgresql://postgres:postgres@localhost:5432/citurbarea"
  echo ""
  echo -e "${YELLOW}ℹ️  After configuring, run this script again to complete setup${NC}"
  exit 0
fi

echo -e "${GREEN}✅ .env file exists${NC}"
echo ""

# 4. Check database connection
echo "🗄️  Checking database connection..."
if cd apps/api && npx prisma db execute --schema ../../prisma/schema.prisma --stdin <<< "SELECT 1;" 2>/dev/null; then
  echo -e "${GREEN}✅ Database connection successful${NC}"
  cd ../..
  
  # 5. Generate Prisma client
  echo "🔧 Generating Prisma client..."
  npm run prisma:generate
  echo -e "${GREEN}✅ Prisma client generated${NC}"
  echo ""
  
  # 6. Run migrations
  echo "🔄 Running database migrations..."
  npm run prisma:migrate
  echo -e "${GREEN}✅ Migrations applied${NC}"
  echo ""
  
  # 7. Seed geo data (optional)
  echo "🌍 Seeding geographic data..."
  if npm run seed:geo 2>/dev/null; then
    echo -e "${GREEN}✅ Geographic data seeded${NC}"
  else
    echo -e "${YELLOW}⚠️  Geographic seeding skipped (optional)${NC}"
  fi
  echo ""
  
  echo -e "${GREEN}✅ Setup complete!${NC}"
  echo ""
  echo "🎯 Next steps:"
  echo "   1. Run 'npm run dev' to start development"
  echo "   2. API will be available at http://localhost:4000"
  echo "   3. Web will be available at http://localhost:5173"
  echo ""
  
else
  cd ../.. 2>/dev/null || true
  echo -e "${RED}❌ Database connection failed${NC}"
  echo ""
  echo "Please complete these steps:"
  echo ""
  echo "1. Install PostgreSQL 14+ with PostGIS:"
  echo "   - macOS: brew install postgresql@14 postgis"
  echo "   - Ubuntu: sudo apt-get install postgresql-14 postgresql-14-postgis-3"
  echo "   - Windows: Download from postgresql.org"
  echo ""
  echo "2. Create database and enable PostGIS:"
  echo "   psql -U postgres -c 'CREATE DATABASE citurbarea;'"
  echo "   psql -U postgres -d citurbarea -c 'CREATE EXTENSION postgis;'"
  echo ""
  echo "3. Configure DATABASE_URL in apps/api/.env:"
  echo "   DATABASE_URL=\"postgresql://postgres:YOUR_PASSWORD@localhost:5432/citurbarea?schema=public\""
  echo ""
  echo "4. Run this script again: npm run setup"
  echo ""
fi
