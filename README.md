# ClarifyPDF – AI PDF Tutor

An AI-powered PDF tutor that helps students understand documents through interactive chat and real-time annotations.

## Features

- 📄 **PDF Upload & Management**: Upload and organize your PDF documents
- 💬 **AI-Powered Chat**: Ask questions and get context-aware answers about your PDFs
- ✏️ **Smart Annotations**: AI highlights and circles important content in real-time
- 🎤 **Voice Interaction**: Speak questions naturally and hear responses
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile devices
- 💾 **Persistent Sessions**: Resume your learning where you left off

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **AI**: OpenAI GPT-4, Vercel AI SDK
- **Voice**: Web Speech API + OpenAI Whisper/TTS
- **Storage**: Vercel Blob Storage
- **UI Components**: shadcn/ui

## Prerequisites

- Node.js 18+ 
- npm or yarn
- PostgreSQL database
- OpenAI API key

## Installation

1. Clone the repository:
```bash
<<<<<<< HEAD
git clone <repository-url>
cd clarifypdf
=======
git clone https://github.com/hislordshipprof/studyFetchAI
cd studyfetch
>>>>>>> origin/master
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory with the following:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/clarifypdf_db"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-generate-with-openssl-rand-base64-32"

# OpenAI
OPENAI_API_KEY="sk-your-openai-api-key-here"

# Vercel Blob Storage (for production)
BLOB_READ_WRITE_TOKEN="vercel_blob_token_here"
```

4. Set up the database:
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma db push

# (Optional) Open Prisma Studio to view database
npx prisma studio
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── (auth)/          # Authentication pages
│   ├── api/             # API routes
│   ├── dashboard/       # Document dashboard
│   └── tutor/           # Main tutoring interface
├── components/          # React components
│   ├── auth/           # Authentication components
│   ├── chat/           # Chat interface components
│   ├── pdf/            # PDF viewer components
│   └── ui/             # shadcn/ui components
├── lib/                # Utility functions
├── hooks/              # Custom React hooks
└── types/              # TypeScript type definitions
```

## Development

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
```

### Deploying to Vercel
```bash
vercel --prod
```

## Environment Variables

See `.env.example` for all required environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_URL`: Application URL for authentication
- `NEXTAUTH_SECRET`: Secret for JWT encryption
- `OPENAI_API_KEY`: OpenAI API key for AI features
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob storage token

## API Documentation

### Authentication
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - User login
- `GET /api/auth/session` - Get current session

### Documents
- `POST /api/documents/upload` - Upload PDF document
- `GET /api/documents` - List user documents
- `GET /api/documents/[id]` - Get document details
- `DELETE /api/documents/[id]` - Delete document

### Chat
- `POST /api/chat/[documentId]/messages` - Send message
- `GET /api/chat/[documentId]` - Get chat history
- `GET /api/chat/[documentId]/stream` - SSE stream for real-time chat

### AI
- `POST /api/ai/analyze` - Analyze PDF content
- `POST /api/ai/chat` - Process AI chat message
- `POST /api/ai/annotate` - Generate annotations
- `POST /api/ai/voice/transcribe` - Speech to text
- `POST /api/ai/voice/synthesize` - Text to speech

## Contributing

This is a technical assessment project for ClarifyPDF. For any questions, contact me at beagyekum21@gmail.com

## License

Private - ClarifyPDF Technical Assessment

## Demo

[[Live Demo URL](https://study-fetch-ai.vercel.app/)] - Will be added upon deployment

<<<<<<< HEAD
## Support

For issues or questions about this assessment, please contact support@clarifypdf.com
=======
>>>>>>> origin/master
