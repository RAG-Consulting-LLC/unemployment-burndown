# Unemployment Burndown

A personal finance application that helps users visualize and manage their runway during periods of unemployment. Track your savings burndown, model different scenarios, and make informed financial decisions.

## Features

- **Burndown Visualization** — Interactive charts showing how long your savings will last
- **Scenario Modeling** — Create what-if scenarios with different income/expense assumptions
- **Bank Account Integration** — Connect accounts via Plaid for automatic balance tracking
- **Job Tracking** — Model potential job offers and their impact on your runway
- **Notifications** — Get alerts at key milestones (50% remaining, 30 days to zero, etc.)
- **Household Management** — Support for multiple users per household with roles/permissions
- **MFA Security** — Two-factor authentication for account protection

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 7.3, TailwindCSS 4.2, Recharts 3.7, Lucide React |
| Backend | Express 5, Node.js |
| Auth | JWT, bcrypt, OTP (otplib) |
| Banking | Plaid API |
| Infrastructure | AWS SAM, Amplify |

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Plaid API credentials (for bank integration)
- AWS CLI configured (for deployment)

### Installation

```bash
# Clone the repository
git clone https://github.com/RAG-Consulting-LLC/unemployment-burndown.git
cd unemployment-burndown

# Install dependencies
npm install
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Plaid API (required for bank integration)
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_secret
PLAID_ENV=sandbox

# JWT Secret (required for auth)
JWT_SECRET=your_jwt_secret

# AWS (required for deployment)
AWS_REGION=us-east-1
S3_BUCKET_NAME=your_bucket_name
```

### Running Locally

```bash
# Start the frontend dev server (Vite)
npm run dev

# Start the backend Express server (separate terminal)
npm run server

# Or run both concurrently
npm run dev:all
```

The frontend will be available at `http://localhost:5173` and the backend API at `http://localhost:3000`.

### Building for Production

```bash
npm run build
```

## Project Structure

```
unemployment-burndown/
├── src/                    # React frontend
│   ├── components/         # Reusable UI components
│   │   ├── auth/           # Login, signup, 2FA
│   │   ├── chart/          # Burndown chart components
│   │   ├── dashboard/      # Dashboard widgets
│   │   ├── finances/       # Income/expense management
│   │   ├── layout/         # App shell, nav, sidebar
│   │   ├── scenarios/      # What-if scenario modeling
│   │   └── statements/     # Bank statement upload/parse
│   ├── context/            # React context providers
│   ├── hooks/              # Custom React hooks
│   ├── pages/              # Route-level page components
│   └── utils/              # Utility functions
├── server/                 # Express dev server
├── backend/                # AWS SAM backend API
│   ├── src/                # Lambda function source
│   └── template.yaml       # SAM template
├── infrastructure/         # AWS infrastructure
│   ├── lambda/             # Lambda functions (statement parser)
│   └── template.yaml       # SAM template
├── docs/                   # Policy documents
└── scripts/                # Setup and utility scripts
```

## Documentation

- [Data Retention Policy](docs/data-retention-policy.md)
- [Information Security Policy](docs/information-security-policy.md)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

### Commit Convention

This project uses conventional commits:

- `feat:` — New features
- `fix:` — Bug fixes
- `chore:` — Maintenance tasks
- `docs:` — Documentation updates
- `refactor:` — Code refactoring

## License

Private — All rights reserved.

---

Built by [RAG Consulting LLC](https://github.com/RAG-Consulting-LLC)
