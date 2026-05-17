import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const CandidateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true },
  skills: [{ type: String, required: true, trim: true }],
  experience: { type: Number, required: true, min: 0 },
  projectsBio: { type: String, default: "" },
  saved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Candidate = mongoose.models.Candidate || mongoose.model("Candidate", CandidateSchema);

const memoryCandidates = [
  {
    _id: "demo-1",
    name: "Rahul Sharma",
    email: "rahul@gmail.com",
    skills: ["React", "Node.js", "MongoDB"],
    experience: 2,
    projectsBio: "Built MERN dashboards and REST APIs for hiring workflows.",
    saved: false,
    createdAt: new Date().toISOString()
  },
  {
    _id: "demo-2",
    name: "Priya Nair",
    email: "priya@gmail.com",
    skills: ["React", "Node.js", "AWS"],
    experience: 3,
    projectsBio: "Delivered cloud-hosted React applications with CI/CD and API integrations.",
    saved: false,
    createdAt: new Date().toISOString()
  },
  {
    _id: "demo-3",
    name: "Ankit Verma",
    email: "ankit@gmail.com",
    skills: ["HTML", "CSS", "JavaScript"],
    experience: 1,
    projectsBio: "Created responsive landing pages and component libraries.",
    saved: false,
    createdAt: new Date().toISOString()
  }
];

let useMongo = false;

function normalizeSkill(skill) {
  return String(skill || "").trim().toLowerCase();
}

function cleanCandidate(input) {
  const skills = Array.isArray(input.skills)
    ? input.skills
    : String(input.skills || "").split(",");

  return {
    name: String(input.name || "").trim(),
    email: String(input.email || "").trim().toLowerCase(),
    skills: skills.map((skill) => String(skill).trim()).filter(Boolean),
    experience: Number(input.experience || 0),
    projectsBio: String(input.projectsBio || input.bio || "").trim()
  };
}

function validateCandidate(candidate) {
  if (!candidate.name) return "Name is required.";
  if (!candidate.email || !candidate.email.includes("@")) return "A valid email is required.";
  if (!candidate.skills.length) return "At least one skill is required.";
  if (Number.isNaN(candidate.experience) || candidate.experience < 0) {
    return "Experience must be zero or more.";
  }
  return null;
}

function matchCandidates(candidates, job) {
  const requiredSkills = (job.requiredSkills || []).map(normalizeSkill).filter(Boolean);
  const preferredSkills = (job.preferredSkills || []).map(normalizeSkill).filter(Boolean);
  const minExperience = Number(job.minExperience || 0);

  if (!requiredSkills.length) {
    throw new Error("At least one required skill is needed.");
  }

  return candidates
    .map((candidate) => {
      const candidateSkills = (candidate.skills || []).map(normalizeSkill);
      const matchedSkills = requiredSkills.filter((skill) => candidateSkills.includes(skill));
      const matchedPreferredSkills = preferredSkills.filter((skill) => candidateSkills.includes(skill));
      const skillScore = matchedSkills.length / requiredSkills.length;
      const preferredScore = preferredSkills.length
        ? matchedPreferredSkills.length / preferredSkills.length
        : 0;
      const experiencePass = Number(candidate.experience || 0) >= minExperience;
      const experienceScore = experiencePass ? 1 : Math.max(0, Number(candidate.experience || 0) / Math.max(minExperience, 1));
      const finalScore = Math.round((skillScore * 75 + experienceScore * 15 + preferredScore * 10) * 100) / 100;

      return {
        ...candidate,
        matchedSkills,
        matchedPreferredSkills,
        experiencePass,
        matchScore: Math.round(skillScore * 100),
        finalScore,
        matchLevel: finalScore >= 75 ? "High" : finalScore >= 40 ? "Medium" : "Low"
      };
    })
    .sort((a, b) => b.finalScore - a.finalScore);
}

async function getCandidates() {
  if (useMongo) {
    return Candidate.find().sort({ createdAt: -1 }).lean();
  }
  return [...memoryCandidates].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function addCandidate(candidate) {
  if (useMongo) {
    return Candidate.create(candidate);
  }
  const exists = memoryCandidates.some((item) => item.email === candidate.email);
  if (exists) {
    const error = new Error("Candidate email already exists.");
    error.status = 409;
    throw error;
  }
  const savedCandidate = {
    _id: `local-${Date.now()}`,
    ...candidate,
    saved: false,
    createdAt: new Date().toISOString()
  };
  memoryCandidates.push(savedCandidate);
  return savedCandidate;
}

async function updateSavedCandidate(id, saved) {
  if (useMongo) {
    return Candidate.findByIdAndUpdate(id, { saved: Boolean(saved) }, { new: true }).lean();
  }
  const candidate = memoryCandidates.find((item) => item._id === id);
  if (!candidate) return null;
  candidate.saved = Boolean(saved);
  return candidate;
}

function buildAiPrompt(job, rankedCandidates) {
  const required = (job.requiredSkills || []).join(", ");
  const preferred = (job.preferredSkills || []).join(", ") || "None";
  const minExperience = Number(job.minExperience || 0);
  const candidateLines = rankedCandidates
    .map((candidate, index) => {
      return `${index + 1}. ${candidate.name} - ${candidate.skills.join(", ")} - ${candidate.experience} years - basic score ${candidate.finalScore}% - bio: ${candidate.projectsBio || "N/A"}`;
    })
    .join("\n");

  return `
Job requires: ${required} (${minExperience}+ years experience)
Preferred skills: ${preferred}

Candidates:
${candidateLines}

Rank the best-fit candidates. Return strict JSON only with this shape:
{
  "summary": "short overall recommendation",
  "rankings": [
    {
      "email": "candidate email",
      "rank": 1,
      "aiScore": 92,
      "recommendation": "short reason"
    }
  ],
  "interviewQuestions": ["question 1", "question 2", "question 3"]
}
`;
}

function fallbackAiResponse(rankedCandidates) {
  return {
    summary: "AI API is not configured, so this recommendation uses the local matching score.",
    rankings: rankedCandidates.slice(0, 5).map((candidate, index) => ({
      email: candidate.email,
      rank: index + 1,
      aiScore: candidate.finalScore,
      recommendation: `${candidate.name} is a ${candidate.matchLevel.toLowerCase()} match with ${candidate.matchedSkills.length} required skill(s) matched and ${candidate.experience} year(s) of experience.`
    })),
    interviewQuestions: [
      "Describe a project where you used the required skills together.",
      "What tradeoffs did you make in your most relevant project?",
      "How would you approach the first 30 days in this role?"
    ],
    source: "local-fallback"
  };
}

async function getAiRecommendation(job, rankedCandidates) {
  if (!process.env.OPENROUTER_API_KEY) {
    return fallbackAiResponse(rankedCandidates);
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.SITE_URL || "http://localhost:5173",
      "X-Title": process.env.SITE_NAME || "Candidate Shortlisting System"
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || "openai/gpt-5.2",
      messages: [{ role: "user", content: buildAiPrompt(job, rankedCandidates) }]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter request failed: ${text}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  const jsonText = content.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

  try {
    return { ...JSON.parse(jsonText), source: "openrouter" };
  } catch {
    return {
      summary: "OpenRouter returned a text response.",
      rankings: [],
      interviewQuestions: [],
      raw: content,
      source: "openrouter"
    };
  }
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, database: useMongo ? "mongodb" : "memory" });
});

app.post("/api/candidates", async (req, res) => {
  try {
    const candidate = cleanCandidate(req.body);
    const validationError = validateCandidate(candidate);
    if (validationError) return res.status(400).json({ message: validationError });
    const savedCandidate = await addCandidate(candidate);
    res.status(201).json(savedCandidate);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || "Unable to add candidate." });
  }
});

app.get("/api/candidates", async (_req, res) => {
  try {
    res.json(await getCandidates());
  } catch (error) {
    res.status(500).json({ message: error.message || "Unable to load candidates." });
  }
});

app.patch("/api/candidates/:id/save", async (req, res) => {
  try {
    const candidate = await updateSavedCandidate(req.params.id, req.body.saved);
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });
    res.json(candidate);
  } catch (error) {
    res.status(500).json({ message: error.message || "Unable to update candidate." });
  }
});

app.post("/api/match", async (req, res) => {
  try {
    const candidates = await getCandidates();
    res.json(matchCandidates(candidates, req.body));
  } catch (error) {
    res.status(400).json({ message: error.message || "Unable to match candidates." });
  }
});

app.post("/api/ai/shortlist", async (req, res) => {
  try {
    const candidates = await getCandidates();
    const rankedCandidates = matchCandidates(candidates, req.body);
    const ai = await getAiRecommendation(req.body, rankedCandidates);
    const aiByEmail = new Map((ai.rankings || []).map((item) => [item.email, item]));
    const merged = rankedCandidates.map((candidate) => ({
      ...candidate,
      aiRecommendation: aiByEmail.get(candidate.email)?.recommendation || "",
      aiScore: aiByEmail.get(candidate.email)?.aiScore || null,
      aiRank: aiByEmail.get(candidate.email)?.rank || null
    }));
    res.json({ candidates: merged, ai });
  } catch (error) {
    res.status(500).json({ message: error.message || "Unable to run AI shortlisting." });
  }
});

app.use(express.static(path.join(__dirname, "../dist")));
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

async function start() {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      useMongo = true;
      console.log("MongoDB connected");
    } catch (error) {
      console.warn(`MongoDB connection failed, using memory store: ${error.message}`);
    }
  } else {
    console.warn("MONGODB_URI not set, using memory store.");
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
