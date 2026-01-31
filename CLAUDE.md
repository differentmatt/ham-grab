# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ham Grab is a ranked voting app for group decisions with no authentication required. Users create polls (movie-specific or general), share links, and vote using their choice of voting method (Borda Count, Condorcet, or Ranked Choice). The app is serverless, deployed on AWS with a React frontend.

**Live Site**: https://hamgrab.com

## Architecture

### Infrastructure (AWS Serverless)

- **Frontend**: React SPA hosted on S3, distributed via CloudFront
- **Backend**: Lambda functions behind API Gateway
- **Database**: DynamoDB with single-table design
- **IaC**: AWS SAM (Serverless Application Model)

**Key architectural decisions:**
- CloudFront proxies `/polls*` requests to API Gateway (no CORS issues, unified domain)
- Production uses custom domain (hamgrab.com), dev uses CloudFront default URL
- Two separate stacks: `movie-vote-dev` and `movie-vote-prod` with isolated resources

### DynamoDB Single-Table Design

Table name: `movie-vote-polls-{stage}`

**Access patterns:**
```
PK: POLL#{pollId}     SK: METADATA              → Poll metadata
PK: POLL#{pollId}     SK: MOVIE#{movieId}       → Movie entries
PK: POLL#{pollId}     SK: VOTE#{voteId}         → Votes
PK: COUNTER           SK: DAILY#{YYYY-MM-DD}    → Global daily poll counter
```

**Important notes:**
- No TTL configured - polls persist indefinitely
- Votes include `oddsKey` (hashed browser fingerprint) to detect duplicate votes from same browser
- Admin access via `adminToken` in poll metadata (shared via URL query param)

### Rate Limiting & Spam Prevention

**Current limits (as of latest changes):**
- Global: 50 polls/day across all users
- Content filtering: Blocks polls with inappropriate URLs/keywords (xhamster, pornhub, etc.)

Implementation in `backend/handlers/polls.js`:
- `checkAndIncrementDailyCounter()` - atomic DynamoDB counter increment
- `containsInappropriateContent()` - regex-based content filter

### Voting Methods

Poll creators choose a voting method at creation time. All calculations happen client-side.

**Available methods** (stored in `votingMethod` field):
- **Borda Count** (`borda`) - Default. Points-based: 1st place gets N-1 points, 2nd gets N-2, etc. Best for small groups with many options.
- **Condorcet** (`condorcet`) - Finds option that beats all others head-to-head. Falls back to Copeland score (wins - losses) if no Condorcet winner exists.
- **Ranked Choice / IRV** (`rcv`) - Eliminates last-place each round until majority winner. Better with more voters than options.

**Implementation files:**
- `frontend/src/borda.ts` - Borda Count algorithm
- `frontend/src/condorcet.ts` - Condorcet with Copeland fallback
- `frontend/src/rcv.ts` - Instant runoff voting
- `frontend/src/tiebreaker.ts` - Shared head-to-head tie-breaking logic
- `frontend/src/voting.ts` - Unified interface and method metadata

**Tie-breaking** (all methods): Uses head-to-head comparisons from ballots, falls back to deterministic coin flip if still tied.

**Results page**: Users can switch between methods to compare how different algorithms would rank the same votes.

### Client-Side State Management

**localStorage usage** (`frontend/src/storage.ts`):
- Poll history (last 20 polls visited)
- User's voter key (persistent browser identifier)
- Vote drafts (autosave in-progress votes)
- User's name preference

**Important**: Poll history is client-side only. Users lose history if they clear browser data, but polls remain accessible via URL.

## Development Commands

### Local Development

```bash
# Start local environment (DynamoDB Local + SAM + Vite)
./scripts/dev.sh

# After making backend changes, rebuild in another terminal:
sam build

# The warm containers will pick up changes on next request
```

**Ports:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- DynamoDB Local: http://localhost:8000

**Important**: When you change backend code, you must run `sam build` for changes to take effect. The dev environment uses warm containers which pick up the rebuilt code on the next request.

### Deployment

```bash
# Deploy to dev (CloudFront URL only)
./scripts/deploy.sh

# Deploy to production (hamgrab.com)
./scripts/deploy.sh prod
```

**What the deploy script does:**
1. `sam build` - Builds Lambda functions
2. `sam deploy` - Deploys CloudFormation stack (Lambda, API Gateway, DynamoDB, S3, CloudFront)
3. `npm run build` - Builds frontend
4. `aws s3 sync` - Uploads frontend to S3
5. CloudFront cache invalidation

**Deploy script outputs:**
- Shows stage in ALL CAPS (DEV/PROD)
- For prod: displays both hamgrab.com and CloudFront URL
- For dev: displays CloudFront URL only

### Checking Production Data

```bash
# Count items in prod table
aws dynamodb scan --table-name movie-vote-polls-prod --select COUNT --region us-east-1

# List all polls
aws dynamodb scan --table-name movie-vote-polls-prod \
  --filter-expression "SK = :metadata" \
  --expression-attribute-values '{":metadata":{"S":"METADATA"}}' \
  --projection-expression "pollId,title,createdAt,phase" \
  --region us-east-1

# Check CloudFormation events
aws cloudformation describe-stack-events --stack-name movie-vote-prod --region us-east-1
```

## Important Implementation Details

### Poll Phases
Polls have three phases (enforced in backend):
1. **nominating** - Users can add movies/options
2. **voting** - Users submit ranked ballots
3. **closed** - Results visible, votes are returned in API response

Phase transitions are admin-only via `PUT /polls/{pollId}/phase`

### Movie Descriptions (Optional Feature)
For movie-type polls, the `AddMovieFunction` calls Claude API to fetch descriptions:
- Requires `ANTHROPIC_API_KEY` environment variable
- 5-second timeout to avoid Lambda delays
- Gracefully degrades if API key missing or request fails
- Only fetches for `pollType: 'movie'` (not 'other')

### Security Notes
- No authentication system - security through obscurity via nanoid-generated URLs
- Admin access controlled by 16-character `adminToken` in URL
- Votes use `oddsKey` (SHA-256 hash of IP + user agent) to prevent duplicate voting from same browser
- Rate limiting prevents spam poll creation
- Content filtering blocks inappropriate poll titles

### Frontend Routing
Uses React Router with these key routes:
- `/` - Home page with poll creation + history
- `/poll/:pollId` - Poll page (query param `?admin={token}` for admin view)

CloudFront serves `index.html` for 404s to support client-side routing (SPA pattern).

### Common Pitfalls
1. **Forgot to run `sam build`**: Backend changes won't appear until you rebuild
2. **Wrong environment**: Dev and prod are separate stacks with separate databases
3. **CloudFront caching**: After deploying, CloudFront may take minutes to propagate globally
4. **DynamoDB Local not running**: `dev.sh` starts it, but if killed separately you'll get connection errors

## Environment Variables

### Local Development (.env in root)
```bash
ANTHROPIC_API_KEY=sk-...  # Optional: for movie descriptions
```

### Frontend (.env.local in frontend/)
```bash
VITE_API_URL=http://localhost:3001  # Dev only
```

Production frontend has no env vars - API requests go to same domain via CloudFront proxy.

## File Structure Notes

**Backend handlers** (`backend/handlers/`):
- `polls.js` - Create/get/update polls, rate limiting
- `movies.js` - Add/remove movies, fetch descriptions via Claude
- `votes.js` - Submit votes, duplicate detection

**Frontend components** (`frontend/src/components/`):
- Organized by feature, not strictly separated by type
- `PollPage.tsx` is the main orchestrator for poll viewing/interaction
- `storage.ts` handles all localStorage operations

**Scripts** (`scripts/`):
- `dev.sh` - Local development (DynamoDB Local + SAM + Vite)
- `deploy.sh` - Full deployment (accepts `prod` arg)
- `setup-local-db.sh` - Creates local DynamoDB table
