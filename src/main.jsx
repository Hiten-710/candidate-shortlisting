import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BarChart3,
  Bot,
  BriefcaseBusiness,
  Check,
  Loader2,
  Plus,
  Save,
  Search,
  Sparkles,
  Star,
  UserRound
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import "./styles.css";

const emptyCandidate = {
  name: "",
  email: "",
  skills: "",
  experience: "",
  projectsBio: ""
};

const defaultJob = {
  requiredSkills: "React, Node.js",
  preferredSkills: "MongoDB, AWS",
  minExperience: 1
};

function parseSkills(value) {
  return value
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

function Pill({ children, tone = "neutral" }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

function CandidateForm({ onAdded }) {
  const [form, setForm] = useState(emptyCandidate);
  const [status, setStatus] = useState("");

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setStatus("Saving...");
    try {
      await api("/api/candidates", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          skills: parseSkills(form.skills),
          experience: Number(form.experience)
        })
      });
      setForm(emptyCandidate);
      setStatus("Candidate added.");
      onAdded();
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <section className="panel">
      <div className="section-title">
        <UserRound size={20} />
        <h2>Add Candidate</h2>
      </div>
      <form onSubmit={submit} className="form-grid">
        <label>
          Name
          <input value={form.name} onChange={(event) => updateField("name", event.target.value)} required />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} required />
        </label>
        <label>
          Skills
          <input
            value={form.skills}
            onChange={(event) => updateField("skills", event.target.value)}
            placeholder="React, Node.js, MongoDB"
            required
          />
        </label>
        <label>
          Experience
          <input
            type="number"
            min="0"
            step="0.5"
            value={form.experience}
            onChange={(event) => updateField("experience", event.target.value)}
            required
          />
        </label>
        <label className="wide">
          Projects / Bio
          <textarea
            value={form.projectsBio}
            onChange={(event) => updateField("projectsBio", event.target.value)}
            placeholder="MERN apps, APIs, cloud deployment..."
          />
        </label>
        <button className="primary" type="submit">
          <Plus size={18} />
          Add Candidate
        </button>
        {status && <span className="status">{status}</span>}
      </form>
    </section>
  );
}

function JobForm({ job, setJob, onMatch, onAiMatch, loading }) {
  function updateField(field, value) {
    setJob((current) => ({ ...current, [field]: value }));
  }

  return (
    <section className="panel">
      <div className="section-title">
        <BriefcaseBusiness size={20} />
        <h2>Job Requirement</h2>
      </div>
      <div className="form-grid">
        <label>
          Required Skills
          <input value={job.requiredSkills} onChange={(event) => updateField("requiredSkills", event.target.value)} />
        </label>
        <label>
          Preferred Skills
          <input value={job.preferredSkills} onChange={(event) => updateField("preferredSkills", event.target.value)} />
        </label>
        <label>
          Minimum Experience
          <input
            type="number"
            min="0"
            step="0.5"
            value={job.minExperience}
            onChange={(event) => updateField("minExperience", event.target.value)}
          />
        </label>
        <div className="button-row">
          <button className="secondary" type="button" onClick={onMatch} disabled={loading}>
            <BarChart3 size={18} />
            Basic Match
          </button>
          <button className="primary" type="button" onClick={onAiMatch} disabled={loading}>
            {loading ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
            AI Shortlist
          </button>
        </div>
      </div>
    </section>
  );
}

function CandidateList({ candidates, search, setSearch }) {
  const filtered = candidates.filter((candidate) => {
    const haystack = `${candidate.name} ${candidate.email} ${candidate.skills.join(" ")}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  return (
    <section className="panel">
      <div className="section-title spread">
        <span className="inline-title">
          <Search size={20} />
          <h2>Candidates</h2>
        </span>
        <input className="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" />
      </div>
      <div className="candidate-stack">
        {filtered.map((candidate) => (
          <article className="candidate-card" key={candidate._id || candidate.email}>
            <div>
              <h3>{candidate.name}</h3>
              <p>{candidate.email}</p>
            </div>
            <Pill>{candidate.experience} yrs</Pill>
            <div className="skill-wrap">
              {candidate.skills.map((skill) => (
                <Pill key={skill}>{skill}</Pill>
              ))}
            </div>
            {candidate.projectsBio && <p className="bio">{candidate.projectsBio}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

function Results({ results, ai, onSave }) {
  if (!results.length) {
    return (
      <section className="panel empty">
        <Bot size={34} />
        <h2>Run a match to rank candidates</h2>
      </section>
    );
  }

  return (
    <section className="panel results">
      <div className="section-title">
        <Check size={20} />
        <h2>Shortlisted Candidates</h2>
      </div>
      {ai?.summary && <p className="ai-summary">{ai.summary}</p>}
      <div className="chart-box">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={results.slice(0, 8)}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Bar dataKey="finalScore" fill="#2864d8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="result-stack">
        {results.map((candidate, index) => (
          <article className={`result-card level-${candidate.matchLevel.toLowerCase()}`} key={candidate._id || candidate.email}>
            <div className="rank">#{candidate.aiRank || index + 1}</div>
            <div className="result-main">
              <div className="spread">
                <div>
                  <h3>{candidate.name}</h3>
                  <p>{candidate.experience} years experience</p>
                </div>
                <div className="score">{candidate.aiScore || candidate.finalScore}%</div>
              </div>
              <div className="skill-wrap">
                <Pill tone={candidate.matchLevel.toLowerCase()}>{candidate.matchLevel} match</Pill>
                <Pill>{candidate.matchScore}% required skills</Pill>
                {candidate.matchedSkills.map((skill) => (
                  <Pill tone="matched" key={skill}>{skill}</Pill>
                ))}
              </div>
              {candidate.aiRecommendation && <p className="recommendation">{candidate.aiRecommendation}</p>}
              <button className="ghost" type="button" onClick={() => onSave(candidate)}>
                {candidate.saved ? <Star size={17} fill="currentColor" /> : <Save size={17} />}
                {candidate.saved ? "Saved" : "Save Shortlist"}
              </button>
            </div>
          </article>
        ))}
      </div>
      {!!ai?.interviewQuestions?.length && (
        <div className="questions">
          <h3>AI Interview Questions</h3>
          {ai.interviewQuestions.map((question) => (
            <p key={question}>{question}</p>
          ))}
        </div>
      )}
    </section>
  );
}

function App() {
  const [candidates, setCandidates] = useState([]);
  const [results, setResults] = useState([]);
  const [job, setJob] = useState(defaultJob);
  const [ai, setAi] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const savedCount = useMemo(() => candidates.filter((candidate) => candidate.saved).length, [candidates]);

  async function loadCandidates() {
    const data = await api("/api/candidates");
    setCandidates(data);
  }

  function jobPayload() {
    return {
      requiredSkills: parseSkills(job.requiredSkills),
      preferredSkills: parseSkills(job.preferredSkills),
      minExperience: Number(job.minExperience || 0)
    };
  }

  async function runMatch() {
    setLoading(true);
    setError("");
    setAi(null);
    try {
      const data = await api("/api/match", { method: "POST", body: JSON.stringify(jobPayload()) });
      setResults(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function runAiMatch() {
    setLoading(true);
    setError("");
    try {
      const data = await api("/api/ai/shortlist", { method: "POST", body: JSON.stringify(jobPayload()) });
      setResults(data.candidates);
      setAi(data.ai);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveCandidate(candidate) {
    const updated = await api(`/api/candidates/${candidate._id}/save`, {
      method: "PATCH",
      body: JSON.stringify({ saved: !candidate.saved })
    });
    setCandidates((current) => current.map((item) => (item._id === updated._id ? updated : item)));
    setResults((current) => current.map((item) => (item._id === updated._id ? { ...item, saved: updated.saved } : item)));
  }

  useEffect(() => {
    loadCandidates().catch((error) => setError(error.message));
  }, []);

  return (
    <main>
      <header className="topbar">
        <div>
          <h1>Candidate Shortlisting System</h1>
          <p>Skill matching, experience ranking, AI recommendations, and saved shortlists.</p>
        </div>
        <div className="metric">
          <Star size={18} />
          <span>{savedCount} saved</span>
        </div>
      </header>

      {error && <div className="alert">{error}</div>}

      <div className="layout">
        <div className="left-column">
          <CandidateForm onAdded={loadCandidates} />
          <JobForm job={job} setJob={setJob} onMatch={runMatch} onAiMatch={runAiMatch} loading={loading} />
          <CandidateList candidates={candidates} search={search} setSearch={setSearch} />
        </div>
        <Results results={results} ai={ai} onSave={saveCandidate} />
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
