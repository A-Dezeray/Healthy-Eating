# Supabase Setup Guide

This directory contains the database schema and security policies for the Meal Tracker application.

## Setup Steps

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click "New Project"
4. Fill in the project details:
   - Project name: meal-tracker (or your preferred name)
   - Database Password: Create a strong password
   - Region: Choose the closest region to you
5. Wait for the project to be created (this may take a few minutes)

### 2. Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings > API**
2. Copy the following values:
   - Project URL (under "Project URL")
   - Anon/Public key (under "Project API keys" > "anon public")

### 3. Configure Environment Variables

1. In the root of this project, create a file named `.env.local`
2. Add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace `your-project-url-here` and `your-anon-key-here` with the values you copied.

### 4. Run the Database Schema

1. In your Supabase project dashboard, go to the **SQL Editor**
2. Click "New Query"
3. Copy the contents of `schema.sql` from this directory
4. Paste it into the SQL Editor
5. Click "Run" to execute the query
6. You should see a success message and your tables will be created

### 5. Set Up Row Level Security

1. Still in the **SQL Editor**, click "New Query" again
2. Copy the contents of `rls-policies.sql` from this directory
3. Paste it into the SQL Editor
4. Click "Run" to execute the query
5. Your RLS policies are now active

### 6. Verify the Setup

1. Go to **Table Editor** in your Supabase dashboard
2. You should see all the tables:
   - user_profiles
   - weeks
   - daily_logs
   - meals
   - meal_items
   - foods
   - weight_logs

## Database Schema Overview

- **user_profiles**: User information and daily nutrition goals
- **weeks**: Weekly periods (Wednesday to Tuesday)
- **daily_logs**: Daily nutrition totals for each day
- **meals**: Individual meals (breakfast, lunch, etc.)
- **meal_items**: Food items within each meal
- **foods**: Personal food library for quick entry
- **weight_logs**: Weight tracking over time

## Security

Row Level Security (RLS) is enabled on all tables to ensure:
- Users can only access their own data
- Dietitians have read-only access to client data
- All data is protected at the database level
