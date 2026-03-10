# Insurance Agent - AI-Powered Claims Processing System

An intelligent insurance claims processing system built with Next.js and Python, featuring automated claim assessment using Azure OpenAI Vision and LangGraph agentic workflows.

## 🏗️ Architecture Overview

This project combines a modern web frontend with an AI-powered backend agent system:

- **Frontend**: Next.js 16 application with TypeScript, React 19, and Tailwind CSS
- **Backend**: Python FastAPI server with LangGraph multi-agent workflow
- **Database**: Neon Postgres (serverless PostgreSQL)
- **Storage**: Azure Blob Storage for claim images
- **AI**: Azure OpenAI (GPT-4o-mini) for vision analysis and decision-making

## 🎯 Features

- **Smart Claims Submission**: Upload insurance claims with policy validation
- **Automated Image Analysis**: AI-powered vehicle damage assessment using computer vision
- **Multi-Agent Processing**: LangGraph workflow with three specialized agents:
  1. **Policy Fetcher**: Validates and retrieves policy information
  2. **Vision Analyzer**: Analyzes damage images and generates reports
  3. **Claim Auditor**: Makes approval/escalation decisions based on policy tier and damage assessment
- **Real-time Status Updates**: Live polling of claim processing status
- **Fraud Detection**: Automated fraud score calculation
- **Responsive UI**: Modern, dark-mode-enabled interface

## 📁 Project Structure

```
Insurance-Agent/
├── insurance-agent/          # Next.js application
│   ├── app/
│   │   ├── api/
│   │   │   └── claims/      # Claims API endpoints
│   │   ├── claim/
│   │   │   ├── claim.tsx    # Claims submission UI component
│   │   │   ├── schema.tsx   # Zod validation schemas
│   │   │   └── temp.py      # Python FastAPI + LangGraph agent
│   │   ├── db.ts            # Neon database client
│   │   ├── layout.tsx       # App layout
│   │   └── page.tsx         # Home page
│   ├── public/              # Static assets
│   ├── package.json         # Node dependencies
│   └── tsconfig.json        # TypeScript config
└── README.md                # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ and npm/yarn/pnpm
- Python 3.11+
- Neon Postgres database account
- Azure OpenAI API access
- Azure Storage account

### Environment Variables

Create a `.env.local` file in the `insurance-agent` directory with the following variables:

#### Next.js Application Variables
```bash
# Database
DATABASE_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require

# Azure Storage
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
AZURE_STORAGE_CONTAINER_NAME=insurance-claims

# Python Agent Webhook
AGENT_WEBHOOK_URL=http://127.0.0.1:8080/process-claim
```

#### Python Agent Variables (for temp.py)
```bash
# Database
DATABASE_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require

# Azure OpenAI
AZURE_OPENAI_API_KEY=your_azure_openai_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
```

### Database Setup

Run the following SQL in your Neon console to create the required tables:

```sql
-- Create policies table
CREATE TABLE IF NOT EXISTS policies (
  policy_number VARCHAR(50) PRIMARY KEY,
  is_active BOOLEAN DEFAULT true,
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('Basic', 'Standard', 'Premium')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create claims table
CREATE TABLE IF NOT EXISTS claims (
  id SERIAL PRIMARY KEY,
  policy_number VARCHAR(50) REFERENCES policies(policy_number),
  incident_description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'queued',
  damage_assessment JSONB,
  fraud_score DECIMAL(3, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample policies for testing
INSERT INTO policies (policy_number, tier, is_active) VALUES
  ('POL-001', 'Premium', true),
  ('POL-002', 'Standard', true),
  ('POL-003', 'Basic', true);
```

### Installation & Running

#### 1. Install Next.js Dependencies

```bash
cd insurance-agent
npm install
```

#### 2. Install Python Dependencies

```bash
# Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install required packages
pip install fastapi uvicorn psycopg2-binary langchain-openai langgraph python-dotenv pydantic
```

#### 3. Start the Python Agent (Backend)

In a separate terminal:

```bash
cd insurance-agent/app/claim
python temp.py
```

The FastAPI server will start on `http://127.0.0.1:8080`

#### 4. Start the Next.js Development Server

```bash
cd insurance-agent
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔄 Claim Processing Workflow

1. **User submits claim** with policy number, description, and damage image
2. **Next.js API** validates policy in database
3. **Image uploaded** to Azure Blob Storage
4. **Claim record created** in database with "queued" status
5. **Python agent triggered** via webhook:
   - **Agent 1** (fetch_policy): Retrieves policy tier from database
   - **Agent 2** (analyze_image): Uses Azure OpenAI Vision to analyze damage
   - **Agent 3** (audit_claim): Makes approval/escalation decision based on:
     - Damage severity (low/medium/high)
     - Policy tier (Basic/Standard/Premium)
     - Fraud indicators
6. **Real-time updates**: Frontend polls claim status every 2.5 seconds
7. **Final status**: Claim marked as "approved", "escalated", or "rejected"

## 🧠 Python Agent Architecture

The Python backend (`temp.py`) uses **LangGraph** to orchestrate a multi-agent workflow:

```python
# Agent State Management
class AgentState(TypedDict):
    claim_id: int
    image_url: str
    policy_tier: str
    damage_report: str
    final_decision: str

# Workflow Graph
fetch_policy → analyze_image → audit_claim → END
```

### Key Components:

- **FastAPI**: RESTful API server with `/process-claim` endpoint
- **LangGraph**: State machine for agent orchestration
- **Azure OpenAI**: GPT-4o-mini for vision analysis
- **psycopg2**: PostgreSQL database connection
- **Background Tasks**: Async claim processing

## 📦 Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **React Hook Form + Zod** - Form validation
- **Tailwind CSS v4** - Utility-first styling
- **Neon Serverless Driver** - Database client

### Backend
- **FastAPI** - Modern Python web framework
- **LangGraph** - Agent orchestration framework
- **LangChain OpenAI** - Azure OpenAI integration
- **psycopg2** - PostgreSQL adapter
- **Pydantic** - Data validation

### Infrastructure
- **Neon Postgres** - Serverless PostgreSQL database
- **Azure Blob Storage** - Image storage
- **Azure OpenAI** - AI/ML capabilities

## 🔗 Related Repository

This project's Python agent is based on the architecture from:
**[insurance-agent-ai](https://github.com/AbhishekatB/insurance-agent-ai)**

The `temp.py` file contains the FastAPI + LangGraph implementation for automated claim processing.

## 🛠️ Development

### Building for Production

```bash
cd insurance-agent
npm run build
npm start
```

### Linting

```bash
npm run lint
```

### Type Checking

```bash
npx tsc --noEmit
```

## 📊 Status Flow

```
queued → fetch_policy → analyzing_image → auditing_claim → [approved/escalated/rejected]
```

Terminal statuses:
- **approved**: Claim automatically approved
- **escalated**: Requires manual review (high damage, fraud indicators, or policy mismatch)
- **rejected**: Claim rejected
- **failed**: Processing error

## 🔒 Security Considerations

- Policy validation before image upload (prevents unnecessary Azure costs)
- Sanitized file names for blob storage
- Environment variables for sensitive credentials
- SQL injection protection via parameterized queries
- HTTPS required for Azure services

## 🐛 Troubleshooting

### Agent webhook fails
- Ensure Python FastAPI server is running on port 8080
- Check `AGENT_WEBHOOK_URL` in `.env.local`
- Verify all Python dependencies are installed

### Database connection errors
- Verify `DATABASE_URL` format and credentials
- Ensure Neon database is active
- Check SSL mode requirement

### Azure services failing
- Validate Azure credentials and resource names
- Ensure Azure OpenAI deployment name is correct
- Check Azure Storage container exists and is accessible

## 📝 License

This project is private and proprietary.

## 👥 Author

**Abhishek B** - [GitHub Profile](https://github.com/AbhishekatB)

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- LangChain/LangGraph for agent orchestration tools
- Azure OpenAI for powerful AI capabilities
- Neon for serverless PostgreSQL
