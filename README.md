# Deven's Wisdom Hub

A curated collection of quotes and insights gathered over 20 years. Built with Next.js 16, React 19, and Tailwind CSS.

## Features

- **Quote Browser** - Search, filter by tags and authors, reader mode
- **Admin Dashboard** - Full CRUD for managing quotes at `/admin`
- **AI-Powered Tagging** - Gemini 1.5 Pro automatically suggests tags when adding quotes
- **Dark Mode** - Full theme support
- **Responsive Design** - Works on mobile and desktop

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS
- **Database**: Vercel Postgres (Neon)
- **AI**: Google Gemini 1.5 Pro
- **Auth**: JWT-based simple password authentication
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/devenspear/deven-wisdom-hub.git
cd deven-wisdom-hub

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values
```

### Environment Variables

```env
# Database
POSTGRES_URL="your-postgres-connection-string"

# Admin Authentication
ADMIN_PASSWORD="your-secure-admin-password"
JWT_SECRET="your-jwt-secret"

# AI (for tag suggestions)
GEMINI_API_KEY="your-gemini-api-key"
```

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the quote browser.

### Admin Access

Navigate to `/admin` and enter your admin password to:
- Add, edit, and delete quotes
- Manage tags and authors
- AI auto-suggests tags when adding new quotes

## Database Schema

- **quotes** - Quote text, source, favorite status
- **authors** - Author name, bio, image
- **tags** - Tag names
- **quote_tags** - Many-to-many relationship

### Run Migrations

```bash
POSTGRES_URL="your-connection-string" pnpm run migrate
```

### Import Quotes

```bash
POSTGRES_URL="your-connection-string" pnpm run import-quotes
```

## API Routes

### Public
- `GET /api/quotes` - List quotes with filtering
- `GET /api/quotes/random` - Get a random quote
- `GET /api/quotes/related` - Get related quotes
- `GET /api/authors` - List all authors
- `GET /api/tags` - List all tags

### Admin (requires authentication)
- `POST /api/admin/login` - Authenticate
- `POST /api/admin/logout` - End session
- `GET /api/admin/session` - Check auth status
- `GET/POST /api/admin/quotes` - List/create quotes
- `GET/PUT/DELETE /api/admin/quotes/[id]` - Quote CRUD
- `GET/POST /api/admin/authors` - Author management
- `GET/POST /api/admin/tags` - Tag management
- `POST /api/admin/suggest-tags` - AI tag suggestions

## Deployment

Deploy to Vercel with one click or via CLI:

```bash
vercel --prod
```

## License

Private project by Deven Spear.
