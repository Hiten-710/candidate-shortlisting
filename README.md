# Candidate Profile Shortlisting System

A full-stack candidate shortlisting app with skill matching, experience ranking, saved shortlists, charts, and OpenRouter AI recommendations.

## Features

- Add and list candidates with name, email, skills, experience, and project bio.
- Match candidates by required skills, preferred skills, and minimum experience.
- Rank candidates as High, Medium, or Low match.
- OpenRouter AI endpoint for richer candidate recommendations and interview questions.
- Search/filter candidates.
- Bar chart for match scores.
- Save shortlisted candidates.
- MongoDB support with a local in-memory fallback for quick demos.

## Tech Stack

- React + Vite
- Express.js
- MongoDB + Mongoose
- OpenRouter Chat Completions API
- Recharts

## Local Setup

```bash
npm install
copy .env.example .env
npm run dev
```

Open:

- Frontend: `http://localhost:5173`
- API: `http://localhost:5000/api/health`

If `MONGODB_URI` is not set, the server uses demo in-memory candidates.

## Environment Variables

```env
PORT=5000
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/candidate-shortlist
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=openrouter/free
SITE_URL=https://your-deployed-url.com
SITE_NAME=Candidate Shortlisting System
```

## API Endpoints

### Add Candidate

`POST /api/candidates`

```json
{
  "name": "Rahul Sharma",
  "email": "rahul@gmail.com",
  "skills": ["React", "Node.js", "MongoDB"],
  "experience": 2,
  "projectsBio": "Built MERN dashboards and REST APIs."
}
```

### Get Candidates

`GET /api/candidates`

### Basic Match

`POST /api/match`

```json
{
  "requiredSkills": ["React", "Node.js"],
  "preferredSkills": ["MongoDB", "AWS"],
  "minExperience": 1
}
```

### AI Shortlist

`POST /api/ai/shortlist`

Uses the same body as `/api/match`.

### Save Shortlisted Candidate

`PATCH /api/candidates/:id/save`

```json
{
  "saved": true
}
```

## Deployment

### Render

1. Push this folder to GitHub.
2. Create a new Render Web Service.
3. Connect the GitHub repository.
4. Use:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
5. Add environment variables from `.env.example`.
6. Use MongoDB Atlas for `MONGODB_URI`.

### Railway

1. Create a new Railway project from GitHub.
2. Add the environment variables.
3. Set the start command to `npm start`.
4. Railway will run the app on its provided `PORT`.

## Production Build

```bash
npm run build
npm start
```

The Express server serves the built React app from `dist`.
