#!/bin/bash

# Deployment helper script
# This script prepares the project for a Vercel build with a Supabase-backed Postgres database

echo "🚀 TheCapsRepo Deployment Helper"
echo ""

# Step 1: Build frontend
echo "📦 Building frontend..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed. Please fix errors and try again."
  exit 1
fi

echo "✅ Frontend built successfully!"
echo ""
echo "Build output: ./dist/"
echo ""
echo "Next steps:"
echo "1. Set DATABASE_URL, JWT_SECRET, and the Supabase keys in your deployment environment"
echo "2. Import the SQL in supabase/migrations/20260509_initial_schema.sql into your Supabase project"
echo "3. Deploy to Vercel with npm run build as the build command and dist/ as the output directory"
echo "4. For local development, run npm run dev"

