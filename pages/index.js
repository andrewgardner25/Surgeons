import { useState, useRef } from "react";
import Head from "next/head";

const PARENT_PAGE_ID = "319de636a1e5803e9976e02401b760bf";
const SECTION_ORDER = ["Set Up", "Kit", "Approach", "Main Procedure", "Post Op", "Tips"];
const SECTION_ICONS = { "Set Up": "🛏", "Kit": "🔧", "Approach": "✂️", "Main Procedure": "🦴", "Post Op": "📋", "Tips": "⭐", "General": "📝", "Closure": "🧵" };

async function notionFetch(endpoint) {
  const res = await fetch(`/api/notion/${endpoint}`);
  return res.json();
}

async function getSubPages() {
  const data = await notionFetch(`blocks/${PARENT_PAGE_ID}/children`);
  if (!data.results) throw new Error("No results");
  return data.results.filter(b => b.type === "child_page").map(b => ({ id: b.id, title: b.child_page.title }));
}

async function getPageContent(pageId) {
  const data = await notionFetch(`blocks/${pageId}/children`);
  if (!data.results) return "";
  return data.results.map(block => {
    const type = block.type;
    const content = block[type];
    if (!content) return "";
    if (content.rich_text) {
      const text = content.rich_text.map(t => t.plain_text).join("");
      if (type === "heading_2" || type === "heading_1" || type === "heading_3") return `## ${text}`;
      if (type === "bulleted_list_item") return `- ${text}`;
      return text;
    }
    return "";
  }).filter(Boolean).join("\n");
}

const S = {
  page: { minHeight: "100vh", background: "#080c14", fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif", color: "#ddd5c0" },
  header: { borderBottom: "1px solid #1a2535", padding: "18px 28px", display: "flex", alignItems: "center", gap: "14px", background: "linear-gradient(180deg, #0c1420 0%, #080c14 100%)" },
  logo: { width: "32px", height: "32px", background: "linear-gradient(135deg, #c8a84b, #8a6a1e)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" },
  nav: { display: "flex", gap: "4px", padding: "16px 28px", borderBottom: "1px solid #1a2535" },
  navBtn: (active) => ({ padding: "8px 16px", background: active ? "linear-gradient(135deg, #1a3a6a, #152d55)" : "transparent", border: "1px solid " + (active ? "#2a5090" : "transparent"), borderRadius: "6px", color: active ? "#a0c8f0" : "#4a6080", cursor: "pointer", fontSize: "12px", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "inherit" }),
  wrap: { maxWidth: "800px", margin: "0 auto", padding: "28px 20px" },
  label: { fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#3a5070", marginBottom: "10px" },
  input: { width: "100%", background: "#0c1420", border: "1px solid #1a2d45", borderRadius: "7px", color: "#c8d8e8", padding: "11px 14px", fontSize: "14px", fontFamily: "inherit", outline: "none", boxSizing: "border-box" },
  textarea: { width: "100%", background: "#0c1420", border: "1px solid #1a2d45", borderRadius: "7px", color: "#c8d8e8", padding: "11px 14px", fontSize: "13px", fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: "1.7" },
  card: { background: "linear-gradient(135deg, #0c1828, #090f1c)", border: "1px solid #1a2d45", borderRadius: "12px", overflow: "hidden", marginBottom: "20px" },
  error: { padding: "12px 16px", background: "#180d0d", border: "1px solid #5a1a1a", borderRadius: "8px", color: "#e07070", fontSize: "13px", marginBottom: "16px" },
  success: { padding: "12px 16px", background: "#0d2a18", border: "1px solid #1a5a30", borderRadius: "8px", color: "#50d080", fontSize: "13px", marginBottom: "16px" },
};

function Btn({ variant, children, onClick, disabled }) {
  const styles = {
    primary: { padding: "13px 26px", background: disabled ? "#1a2535" : "linear-gradient(135deg, #c8a84b, #8a6a1e)", border: "1px solid " + (disabled ? "#1a2535" : "#c8a84b"), borderRadius: "7px", color: disabled ? "#3a5070" : "#0a0f1a", cursor: disabled ? "not-allowed" : "pointer", fontSize: "14px", fontFamily: "inherit", letterSpacing: "0.04em", fontWeight: "600" },
    secondary: { padding: "10px 18px", background: "linear-gradient(135deg, #1a3a6a, #152d55)", border: "1px solid #2a5090", borderRadius: "7px", color: "#90c0e8", cursor: "pointer", fontSize: "12px", fontFamily: "inherit", letterSpacing: "0.04em" },
    ghost: { padding: "8px 14px", background: "transparent", border: "1px solid #1e3a5f", borderRadius: "6px", color: "#4a7090", cursor: "pointer", fontSize: "12px", fontFamily: "inherit" },
  };
  return <button onClick={onClick} disabled={disabled} style={styles[variant] || styles.secondary}>{children}</button>;
}

export default function Home() {
  const [tab, setTab] = useState("search");
  const [pages, setPages] = useState([]);
  const [notesMap, setNotesMap] = useState({});
  const [pageIdMap, setPageIdMap] = useState({});
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [theatreList, setTheatreList] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [audioPlaying, setAudioPlaying] = useState(null);
  const [tipModal, setTipModal] = useState(null);
  const [tipText, setTipText] = useState("");
  const [tipSaving, setTipSaving] = useState(false);
  const [tipSuccess, setTipSuccess] = useState(false);
  const [newProc, setNewProc] = useState({ procedure: "", sections: { "Set Up": "", "Kit": "", "Approach": "", "Main Procedure": "", "Post Op": "", "Tips": "" } });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const loadNotionNotes = async () => {
    setLoadingNotes(true); setLoadError("");
    try {
      const subPages = await getSubPages();
      if (!subPages.length) { setLoadError("No procedure pages found in Notion."); setLoadingNotes(false); return; }
      const map = {}, idMap = {};
      for (const page of subPages) {
        const content = await getPageContent(page.id);
        map[page.title] = content;
        idMap[page.title] = page.id;
      }
      setNotesMap(map); setPageIdMap(idMap); setPages(subPages); setNotesLoaded(true);
    } catch (e) { setLoadError("Couldn't connect to Notion."); }
    setLoadingNotes(false);
  };

  const matchNotes = async () => {
    if (!notesLoaded || !theatreList.trim()) return;
    setLoading(true); setError(""); setResults(null);
    const notesText = Object.entries(notesMap).map(([t, c]) => `=== ${t} ===\n${c}`).join("\n\n");
    try {
      const response = await fetch("/api/match", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notes: notesText, theatreList }) });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setResults(data.results);
    } catch (err) { setError("Something went wrong: " + err.message); }
    setLoading(false);
  };

  const speak = (idx, text) => {
    window.speechSynthesis.cancel();
    if (audioPlaying === idx) { setAudioPlaying(null); return; }
    const u = new SpeechSynthesisUtterance(text); u.rate = 0.9; u.onend = () => setAudioPlaying(null);
    window.speechSynthesis.speak(u); setAudioPlaying(idx);
  };

  const addTip = async () => {
    if (!tipText.trim() || !tipModal) return;
    setTipSaving(true);
    const pageId = pageIdMap[tipModal.noteTitle];
    if (!pageId) { setTipSaving(false); return; }
    try {
      await fetch("/api/notion/write", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "addTip", pageId, tip: tipText }) });
      setTipSuccess(true); setTipText("");
      setTimeout(() => { setTipModal(null); setTipSuccess(false); }, 1500);
    } catch (e) {}
    setTipSaving(false);
  };

  const saveNewProc = async () => {
    if (!newProc.procedure.trim()) return;
    setSaving(true); setSaveMsg("");
    try {
      const res = await fetch("/api/notion/write", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", procedure: newProc.procedure, sections: newProc.sections }) });
      const data = await res.json();
      if (data.success) { setSaveMsg("success"); setNewProc({ procedure: "", sections: { "Set Up": "", "Kit": "", "Approach": "", "Main Procedure": "", "Post Op": "", "Tips": "" } }); }
      else setSaveMsg("error");
    } catch (e) { setSaveMsg("error"); }
    setSaving(false);
  };

  const printPDF = () => {
    if (!results) return;
    const found = results.filter(r => r.found);
    const content = found.map(r => {
      const sectionHtml = Object.entries(r.sections || {}).map(([name, lines]) => {
        if (!lines || lines.length === 0) return "";
        const items = lines.map(l => `<li>${l}</li>`).join("");
        return `<div class="sec"><div class="sec-title">${SECTION_ICONS[name] || "•"} ${name}</div><ul>${items}</ul></div>`;
      }).join("");
      return `<div class="proc"><h2>${r.procedure}</h2><p class="sub">${r.noteTitle}</p>${sectionHtml}</div>`;
    }).join('<hr>');
    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html><head><title>Theatre Brief</title><style>
      body{font-family:Georgia,serif;color:#111;max-width:720px;margin:0 auto;padding:30px}
      h1{font-size:20px;border-bottom:2px solid #1a3a6a;padding-bottom:8px;color:#1a3a6a;margin-bottom:4px}
      .date{color:#777;font-size:12px;margin-bottom:28px}
      .proc{margin-bottom:32px;page-break-inside:avoid}
      h2{font-size:17px;color:#1a3a6a;margin-bottom:2px}
      .sub{font-size:11px;color:#999;font-style:italic;margin:0 0 14px}
      .sec{margin-bottom:12px}
      .sec-title{font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:.07em;color:#555;margin-bottom:5px}
      ul{margin:0;padding-left:16px}li{font-size:13px;line-height:1.7;color:#222}
      hr{border:none;border-top:1px solid #ddd;margin:28px 0}
      @media print{body{padding:10px}}
    </style></head><body>
      <h1>🦴 Theatre Brief</h1>
      <div class="date">${new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} &middot; ${found.length} procedure${found.length !== 1 ? "s" : ""}</div>
      ${content}
    </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  return (
    <>
      <Head><title>SurgeonOS</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <div style={S.page}>
        <div style={S.header}>
          <div style={S.logo}>🦴</div>
          <div>
            <div style={{ fontSize: "17px", fontWeight: "600", color: "#e8dfc8" }}>SurgeonOS</div>
            <div style={{ fontSize: "11px", color: "#3a5070", letterSpacing: "0.06em", textTransform: "uppercase" }}>Personal Operative Notes</div>
          </div>
        </div>

        <div style={S.nav}>
          {[["search", "🔍 Theatre Search"], ["add", "➕ Add Procedure"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={S.navBtn(tab === key)}>{label}</button>
          ))}
        </div>

        <div style={S.wrap}>
          {tab === "search" && (
            <>
              <div style={{ marginBottom: "28px" }}>
                <div style={S.label}>Step 1 — Load notes from Notion</div>
                {!notesLoaded ? (
                  <div>
                    <Btn variant="secondary" onClick={loadNotionNotes} disabled={loadingNotes}>
                      {loadingNotes ? "⏳ Connecting..." : "🔗 Load my Notion notes"}
                    </Btn>
                    {loadError && <div style={{ ...S.error, marginTop: "12px" }}>{loadError}</div>}
                  </div>
                ) : (
                  <div style={{ padding: "12px 16px", background: "#0d2a1a", border: "1px solid #1a5a30", borderRadius: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                      <span>✅</span>
                      <span style={{ fontSize: "13px", color: "#50d080" }}>{pages.length} procedure{pages.length !== 1 ? "s" : ""} loaded</span>
                      <button onClick={() => { setNotesLoaded(false); setNotesMap({}); setPages([]); setResults(null); }} style={{ marginLeft: "auto", background: "none", border: "none", color: "#2a6040", cursor: "pointer", fontSize: "18px" }}>×</button>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {pages.map((p, i) => <span key={i} style={{ padding: "3px 10px", background: "#0a2a18", border: "1px solid #1a4a28", borderRadius: "20px", fontSize: "11px", color: "#3a9060" }}>{p.title}</span>)}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: "24px" }}>
                <div style={S.label}>Step 2 — Enter tomorrow's list</div>
                <textarea value={theatreList} onChange={e => setTheatreList(e.target.value)}
                  placeholder={"One procedure per line, e.g.\nCalcaneal osteotomy right\nFlatfoot correction\n1st MTPJ fusion"}
                  rows={5} style={S.textarea} />
              </div>

              <div style={{ display: "flex", gap: "10px", marginBottom: "28px", flexWrap: "wrap" }}>
                <Btn variant="primary" onClick={matchNotes} disabled={!notesLoaded || !theatreList.trim() || loading}>
                  {loading ? "⏳ Searching..." : "🔍 Pull relevant notes"}
                </Btn>
                {results && results.some(r => r.found) && (
                  <Btn variant="secondary" onClick={printPDF}>🖨️ Export PDF</Btn>
                )}
              </div>

              {error && <div style={S.error}>{error}</div>}

              {results && (
                <div>
                  <div style={{ ...S.label, marginBottom: "16px" }}>Results — {results.length} procedure{results.length !== 1 ? "s" : ""}</div>
                  {results.map((item, i) => {
                    if (!item.found) return (
                      <div key={i} style={{ ...S.card, opacity: 0.4 }}>
                        <div style={{ padding: "14px 18px" }}>
                          <div style={{ fontSize: "14px", color: "#4a5a6a" }}>{item.procedure}</div>
                          <div style={{ fontSize: "12px", color: "#3a4a5a", marginTop: "4px" }}>No notes found — add this procedure via the ➕ tab</div>
                        </div>
                      </div>
                    );

                    const allText = Object.values(item.sections || {}).flat().join(". ");
                    const displaySections = item.hasStructure
                      ? SECTION_ORDER.filter(s => item.sections[s]?.length > 0).map(s => [s, item.sections[s]])
                      : Object.entries(item.sections || {});

                    return (
                      <div key={i} style={S.card}>
                        <div style={{ padding: "14px 18px", borderBottom: "1px solid #1a2d45", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                          <div>
                            <div style={{ fontSize: "15px", fontWeight: "600", color: "#c8d8f0" }}>{item.procedure}</div>
                            <div style={{ fontSize: "11px", color: "#3a6080", marginTop: "2px", fontStyle: "italic" }}>{item.noteTitle}</div>
                          </div>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <Btn variant="ghost" onClick={() => speak(i, allText)}>{audioPlaying === i ? "⏹ Stop" : "🔊 Listen"}</Btn>
                            <Btn variant="ghost" onClick={() => { setTipModal(item); setTipText(""); }}>⭐ Add tip</Btn>
                          </div>
                        </div>
                        <div style={{ padding: "16px 18px" }}>
                          {!item.hasStructure && (
                            <div style={{ fontSize: "11px", color: "#4a6070", marginBottom: "14px", padding: "8px 12px", background: "#0a1520", borderRadius: "6px", border: "1px solid #1a2d3a" }}>
                              💡 Add structure to this note using the ➕ tab for Set Up / Kit / Approach sections
                            </div>
                          )}
                          {displaySections.map(([name, lines], j) => (
                            <div key={j} style={{ marginBottom: "16px" }}>
                              <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "2px 10px", background: "#0a1828", border: "1px solid #1a3050", borderRadius: "20px", fontSize: "10px", color: "#4a7090", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "8px" }}>
                                {SECTION_ICONS[name] || "•"} {name}
                              </div>
                              {(lines || []).map((line, k) => (
                                <div key={k} style={{ display: "flex", gap: "8px", padding: "4px 0", borderBottom: k < lines.length - 1 ? "1px solid #0f1a28" : "none" }}>
                                  <span style={{ color: "#c8a84b", flexShrink: 0 }}>–</span>
                                  <span style={{ fontSize: "13px", color: "#b0c4d8", lineHeight: "1.65" }}>{line}</span>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {tab === "add" && (
            <div>
              <div style={{ marginBottom: "8px" }}>
                <div style={{ fontSize: "13px", color: "#5a8090", marginBottom: "24px", lineHeight: "1.6" }}>
                  Add a new procedure to your Notion notes. Fill in as much or as little as you know — you can always add tips later.
                </div>
              </div>
              <div style={{ marginBottom: "20px" }}>
                <div style={S.label}>Procedure name</div>
                <input value={newProc.procedure} onChange={e => setNewProc({ ...newProc, procedure: e.target.value })}
                  placeholder="e.g. Calcaneal osteotomy/heel shift" style={S.input} />
              </div>
              {SECTION_ORDER.map(section => (
                <div key={section} style={{ marginBottom: "18px" }}>
                  <div style={S.label}>{SECTION_ICONS[section]} {section}</div>
                  <textarea value={newProc.sections[section]}
                    onChange={e => setNewProc({ ...newProc, sections: { ...newProc.sections, [section]: e.target.value } })}
                    placeholder={section === "Set Up" ? "Patient position, tourniquet, II..." : section === "Kit" ? "Implants, instruments, sizes..." : section === "Approach" ? "Incision, layers, landmarks..." : section === "Main Procedure" ? "Key steps in order..." : section === "Post Op" ? "Weight bearing, plaster, follow up..." : "Personal tips — one per line"}
                    rows={3} style={S.textarea} />
                </div>
              ))}
              {saveMsg === "success" && <div style={S.success}>✅ Saved to Notion! You can now search for this procedure.</div>}
              {saveMsg === "error" && <div style={S.error}>❌ Something went wrong. Check your Notion connection.</div>}
              <Btn variant="primary" onClick={saveNewProc} disabled={!newProc.procedure.trim() || saving}>
                {saving ? "⏳ Saving to Notion..." : "💾 Save to Notion"}
              </Btn>
            </div>
          )}
        </div>
      </div>

      {tipModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div style={{ background: "#0c1828", border: "1px solid #1a3a5f", borderRadius: "14px", padding: "28px", width: "100%", maxWidth: "480px" }}>
            <div style={{ fontSize: "16px", color: "#c8d8f0", marginBottom: "4px", fontWeight: "600" }}>⭐ Add a tip</div>
            <div style={{ fontSize: "12px", color: "#3a6080", marginBottom: "20px", fontStyle: "italic" }}>{tipModal.noteTitle}</div>
            {tipSuccess ? (
              <div style={S.success}>✅ Tip saved to Notion!</div>
            ) : (
              <>
                <textarea value={tipText} onChange={e => setTipText(e.target.value)}
                  placeholder="What did you learn today? e.g. Always check blade on XR before completing the cut..."
                  rows={4} style={{ ...S.textarea, marginBottom: "16px" }} autoFocus />
                <div style={{ display: "flex", gap: "10px" }}>
                  <Btn variant="primary" onClick={addTip} disabled={!tipText.trim() || tipSaving}>{tipSaving ? "Saving..." : "Save tip"}</Btn>
                  <Btn variant="ghost" onClick={() => setTipModal(null)}>Cancel</Btn>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
