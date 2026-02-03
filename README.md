# Meal Tracker

A full-stack web application for tracking daily meals, nutrition, and weight loss journey. Built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Features

- **Weekly Meal Tracking**: Track meals from Wednesday to Tuesday to align with dietitian appointments
- **Nutrition Goals**: Set and monitor daily goals for calories, carbs, fat, fiber, protein, and water
- **Food Database**: Build a personal library of frequently eaten foods for quick entry
- **Weight Tracking**: Log weight over time with visual charts
- **Multi-User Access**: Secure login with role-based permissions (client and dietitian)
- **Meal Preparation Notes**: Add detailed notes about how meals were prepared
- **Mobile Responsive**: Works seamlessly on desktop, tablet, and mobile devices

## Tech Stack

- **Frontend**: Next.js 14+ with React and TypeScript
- **Styling**: Tailwind CSS v4 with shadcn/ui components
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for weight tracking visualization
- **Font**: EB Garamond

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier is fine)
- npm or pnpm package manager

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

Follow the detailed guide in [supabase/README.md](./supabase/README.md) to:
1. Create a Supabase project
2. Get your credentials
3. Set up the database schema
4. Configure Row Level Security

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

See `.env.local.example` for reference.

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
meal-tracker/
├── app/                      # Next.js app router pages
│   ├── (auth)/              # Authentication pages
│   ├── (app)/               # Protected application pages
│   ├── api/                 # API routes
│   ├── layout.tsx           # Root layout
│   └── globals.css          # Global styles
├── components/              # React components
│   ├── ui/                  # shadcn/ui components
│   ├── week/                # Week view components
│   ├── meals/               # Meal tracking components
│   ├── foods/               # Food library components
│   └── weight/              # Weight tracking components
├── lib/                     # Utilities and helpers
│   ├── supabase/           # Supabase client configuration
│   ├── utils/              # Utility functions
│   └── types.ts            # TypeScript type definitions
├── supabase/               # Database schema and policies
│   ├── schema.sql          # Database tables
│   ├── rls-policies.sql    # Row Level Security policies
│   └── README.md           # Supabase setup guide
└── hooks/                  # Custom React hooks
```

## Usage Guide

### For Clients (Users)

1. **Sign Up**: Create an account with your email
2. **Set Goals**: Configure your daily nutrition goals in Settings
3. **Track Meals**: Add foods to breakfast, lunch, dinner, and snacks
4. **Log Weight**: Record your weight regularly in the Weight page
5. **View Progress**: Monitor your nutrition vs. goals in the dashboard

### For Dietitians

1. **Sign Up**: Create a dietitian account
2. **View Client Data**: Access client meal logs and nutrition data (read-only)
3. **Monitor Progress**: Review weekly meal patterns and weight trends

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Adding shadcn/ui Components

```bash
npx shadcn@latest add [component-name]
```

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Import your repository
4. Add environment variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy

Vercel will automatically deploy your app and provide a URL.

### Production Supabase Setup

Make sure to use production Supabase credentials (not development) in your Vercel environment variables.

## License

Private project for personal use.

## Support

For issues or questions, please contact the developer.
