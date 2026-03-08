import { useState, useRef } from "react";
import Head from "next/head";

const PARENT_PAGE_ID = "319de636a1e5803e9976e02401b760bf";

async function notionFetch(endpoint) {
  const res = await fetch(`/api/notion/${endpoint}`);
  return res.json();
}

async function getSubPages() {
  const data = await notionFetch(`blocks/${PARENT_PAGE_ID}/children`);
  if (!data.results) throw new Error("No results from Notion");
  return data.results
    .filter(b => b.type === "child_page")
    .map(b => ({ id: b.id, title: b.child_page.title }));
}

async function getPageContent(pageId) {
  const data = await notionFetch(`blocks/${pageId}/children`);
  if (!data.results) return "";
  return data.results.map(block => {
    const type = block.type;
    const content = block[type];
    if (!content) return "";
    // Handle rich_text blocks (paragraph, heading, bulleted_list_item, numbered_list_item, etc.)
    if (content.rich_text) {
      const text = content.rich_text.map(t => t.plain_text).join("");
      if (type === "bulleted_list_item") return `- ${text}`;
      if (type === "numbered_list_item") return `• ${text}`;
      return text;
    }
    return "";
  }).filter(Boolean).join("\n");
}

export default function Home() {
  const [pages, setPages] = useState([]);
  const [notesMap, setNotesMap] = useState({});
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [theatreList, setTheatreList] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [audioPlaying, setAudioPlaying] = useState(null);

  const loadNotionNotes = async () => {
    setLoadingNotes(true);
    setLoadError("");
    try {
      const subPages = await getSubPages();
      if (!subPages.length) {
        setLoadError("No procedure pages found. Add sub-pages inside your Surgical Technique Notes page in Notion.");
        setLoadingNotes(false);
        return;
      }
      const map = {};
      for (const page of subPages) {
        const content = await getPageContent(page.id);
        map[page.title] = content;
      }
      setNotesMap(map);
      setPages(subPages);
      setNotesLoaded(true);
    } catch (e) {
      setLoadError("Couldn't connect to Notion. Make sure NOTION_TOKEN is set in your Vercel environment variables.");
    }
    setLoadingNotes(false);
  };

  const matchNotes = async () => {
    if (!notesLoaded || !theatreList.trim()) return;
    setLoading(true);
    setError("");
    setResults(null);

    const notesText = Object.entries(notesMap)
      .map(([title, content]) => `=== ${title} ===\n${content}`)
      .join("\n\n");

    try {
      const response = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesText, theatreList })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setResults(data.results);
    } catch (err) {
      setError("Something went wrong: " + err.message);
    }
    setLoading(false);
  };

  const speak = (idx, text) => {
    window.speechSynthesis.cancel();
    if (audioPlaying === idx) { setAudioPlaying(null); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.onend = () => setAudioPlaying(null);
    window.speechSynthesis.speak(u);
    setAudioPlaying(idx);
  };

  return (
    <>
      <Head>
        <title>Theatre Notes Matcher</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{
        minHeight: "100vh",
        background: "#0a0f1a",
        fontFamily: "'Georgia', serif",
        color: "#e8e0d0"
      }}>
        {/* Header */}
        <div style={{
          borderBottom: "1px solid #1e2d45",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          background: "linear-gradient(180deg, #0d1525 0%, #0a0f1a 100%)"
        }}>
          <div style={{
            width: "34px", height: "34px",
            background: "linear-gradient(135deg, #2a7fff, #1a5fd4)",
            borderRadius: "8px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "16px"
          }}>🦴</div>
          <div>
            <div style={{ fontSize: "17px", fontWeight: "600", color: "#f0ebe0" }}>
              Theatre Notes Matcher
            </div>
            <div style={{ fontSize: "11px", color: "#5a7090", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Connected to Notion · Auto-sync
            </div>
          </div>
        </div>

        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "28px 20px" }}>

          {/* Step 1 */}
          <div style={{ marginBottom: "28px" }}>
            <div style={{ fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#3a6090", marginBottom: "12px" }}>
              Step 1 — Load notes from Notion
            </div>
            {!notesLoaded ? (
              <div>
                <button onClick={loadNotionNotes} disabled={loadingNotes} style={{
                  padding: "13px 24px",
                  background: loadingNotes ? "#0d1525" : "linear-gradient(135deg, #1a3a6a, #152d55)",
                  border: "1px solid #2a5090", borderRadius: "8px",
                  color: loadingNotes ? "#3a5070" : "#a0c8f0",
                  cursor: loadingNotes ? "not-allowed" : "pointer",
                  fontSize: "13px", letterSpacing: "0.03em"
                }}>
                  {loadingNotes ? "⏳ Connecting to Notion..." : "🔗 Load my Notion notes"}
                </button>
                {loadError && (
                  <div style={{ marginTop: "12px", padding: "12px 16px", background: "#1a0d0d", border: "1px solid #5a1a1a", borderRadius: "8px", color: "#e07070", fontSize: "13px" }}>
                    {loadError}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: "12px 16px", background: "linear-gradient(135deg, #0d2a1a, #0a1f14)", border: "1px solid #1a5a30", borderRadius: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  <span>✅</span>
                  <div style={{ fontSize: "13px", color: "#50d080" }}>
                    {pages.length} procedure note{pages.length !== 1 ? "s" : ""} loaded from Notion
                  </div>
                  <button onClick={() => { setNotesLoaded(false); setNotesMap({}); setPages([]); setResults(null); }}
                    style={{ marginLeft: "auto", background: "none", border: "none", color: "#2a6040", cursor: "pointer", fontSize: "18px" }}>×</button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {pages.map((p, i) => (
                    <span key={i} style={{
                      padding: "3px 10px", background: "#0a2a18", border: "1px solid #1a4a28",
                      borderRadius: "20px", fontSize: "11px", color: "#3a9060"
                    }}>{p.title}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Step 2 */}
          <div style={{ marginBottom: "28px" }}>
            <div style={{ fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#3a6090", marginBottom: "12px" }}>
              Step 2 — Enter tomorrow's list
            </div>
            <textarea
              value={theatreList}
              onChange={e => setTheatreList(e.target.value)}
              placeholder={"e.g.\nCalcaneal osteotomy right foot\nFlatfoot correction left\n1st MTPJ fusion"}
              rows={5}
              style={{
                width: "100%", background: "#0d1525", border: "1px solid #1e2d45",
                borderRadius: "8px", color: "#c8d8e8", padding: "14px 16px",
                fontSize: "14px", fontFamily: "'Georgia', serif", resize: "vertical",
                outline: "none", lineHeight: "1.7", boxSizing: "border-box"
              }}
            />
          </div>

          {/* Button */}
          <button
            onClick={matchNotes}
            disabled={!notesLoaded || !theatreList.trim() || loading}
            style={{
              width: "100%", padding: "16px",
              background: notesLoaded && theatreList.trim() && !loading ? "linear-gradient(135deg, #1a5fd4, #0d4ab0)" : "#0d1525",
              border: "1px solid " + (notesLoaded && theatreList.trim() ? "#2a7fff" : "#1e2d45"),
              borderRadius: "10px",
              color: notesLoaded && theatreList.trim() && !loading ? "#ffffff" : "#3a5070",
              fontSize: "15px", fontFamily: "'Georgia', serif", letterSpacing: "0.04em",
              cursor: notesLoaded && theatreList.trim() && !loading ? "pointer" : "not-allowed",
              marginBottom: "28px"
            }}>
            {loading ? "⏳ Searching your notes..." : "🔍 Pull relevant notes for this list"}
          </button>

          {error && (
            <div style={{ padding: "14px", background: "#1a0d0d", border: "1px solid #5a1a1a", borderRadius: "8px", color: "#e07070", marginBottom: "24px", fontSize: "13px" }}>
              {error}
            </div>
          )}

          {/* Results */}
          {results && (
            <div>
              <div style={{ fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#3a6090", marginBottom: "20px" }}>
                Results — {results.length} procedure{results.length !== 1 ? "s" : ""}
              </div>
              {results.map((item, i) => {
                const speakText = `${item.procedure}. ${item.consultant ? "Consultant: " + item.consultant + ". " : ""}Tips: ${item.tips.join(". ")}${item.closure ? ". Closure: " + item.closure : ""}`;
                return (
                  <div key={i} style={{
                    marginBottom: "20px",
                    background: item.found ? "linear-gradient(135deg, #0d1a2a, #0a1520)" : "#0d0f14",
                    border: "1px solid " + (item.found ? "#1e3a5f" : "#1a1e26"),
                    borderRadius: "12px", overflow: "hidden"
                  }}>
                    <div style={{
                      padding: "14px 18px", borderBottom: "1px solid " + (item.found ? "#1e3a5f" : "#1a1e26"),
                      display: "flex", alignItems: "center", justifyContent: "space-between"
                    }}>
                      <div>
                        <div style={{ fontSize: "15px", fontWeight: "600", color: item.found ? "#a0d0f8" : "#4a5a6a" }}>{item.procedure}</div>
                        {item.consultant && <div style={{ fontSize: "11px", color: "#3a6080", marginTop: "2px" }}>{item.consultant}</div>}
                      </div>
                      {item.found && (
                        <button onClick={() => speak(i, speakText)} style={{
                          padding: "7px 14px", background: audioPlaying === i ? "#1a3a6a" : "transparent",
                          border: "1px solid #2a5080", borderRadius: "6px", color: "#5090c0", cursor: "pointer", fontSize: "12px"
                        }}>
                          {audioPlaying === i ? "⏹ Stop" : "🔊 Listen"}
                        </button>
                      )}
                    </div>
                    <div style={{ padding: "14px 18px" }}>
                      {item.tips.map((tip, j) => (
                        <div key={j} style={{
                          display: "flex", gap: "10px", alignItems: "flex-start", padding: "6px 0",
                          borderBottom: j < item.tips.length - 1 ? "1px solid #111825" : "none"
                        }}>
                          <span style={{ color: "#2a5080", marginTop: "1px", flexShrink: 0 }}>–</span>
                          <span style={{ fontSize: "13px", color: item.found ? "#b0c8e0" : "#3a4a5a", lineHeight: "1.6" }}>{tip}</span>
                        </div>
                      ))}
                      {item.closure && (
                        <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #1e2d45", fontSize: "12px", color: "#5a8090" }}>
                          <span style={{ color: "#3a6070", marginRight: "6px" }}>Closure:</span>{item.closure}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
