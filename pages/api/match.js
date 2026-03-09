export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { notes, theatreList } = req.body;
  if (!notes || !theatreList) {
    return res.status(400).json({ error: "Missing notes or theatreList" });
  }

  const noteSections = {};
  const lines = notes.split("\n");
  let currentTitle = null;
  let currentContent = [];

  for (const line of lines) {
    if (line.startsWith("===") && line.endsWith("===")) {
      if (currentTitle) noteSections[currentTitle] = currentContent.join("\n").trim();
      currentTitle = line.replace(/===/g, "").trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }
  if (currentTitle) noteSections[currentTitle] = currentContent.join("\n").trim();

  const procedures = theatreList.split("\n").map(p => p.trim()).filter(Boolean);

  const results = procedures.map(procedure => {
    const procLower = procedure.toLowerCase();
    const procWords = procLower.split(/\s+/).filter(w => w.length > 3);

    let bestMatch = null;
    let bestScore = 0;

    for (const [title, content] of Object.entries(noteSections)) {
      const titleLower = title.toLowerCase();
      let score = 0;
      if (titleLower.includes(procLower) || procLower.includes(titleLower)) score += 10;
      for (const word of procWords) {
        if (titleLower.includes(word)) score += 2;
        if (content.toLowerCase().includes(word)) score += 1;
      }
      if (score > bestScore) { bestScore = score; bestMatch = { title, content }; }
    }

    if (!bestMatch || bestScore === 0) return { procedure, found: false, sections: null };

    const sectionNames = ["Set Up", "Kit", "Approach", "Main Procedure", "Post Op", "Tips"];
    const sections = {};
    let currentSection = "General";
    let currentLines = [];

    for (const line of bestMatch.content.split("\n")) {
      const trimmed = line.trim();
      const matched = sectionNames.find(s => trimmed.replace(/^#+\s*/, "").toLowerCase() === s.toLowerCase());
      if (matched) {
        if (currentLines.length > 0) sections[currentSection] = currentLines.filter(l => l.trim());
        currentSection = matched;
        currentLines = [];
      } else {
        const clean = trimmed.replace(/^[-•*]\s*/, "");
        if (clean) currentLines.push(clean);
      }
    }
    if (currentLines.length > 0) sections[currentSection] = currentLines.filter(l => l.trim());

    const hasStructure = sectionNames.some(s => sections[s]);
    if (!hasStructure && sections["General"]) {
      const general = sections["General"];
      const closure = general.filter(l => /vicryl|monocryl|undyed|nylon|\d-0/i.test(l));
      sections["General"] = general.filter(l => !/vicryl|monocryl|undyed|nylon|\d-0/i.test(l));
      if (closure.length) sections["Closure"] = closure;
    }

    return { procedure, found: true, noteTitle: bestMatch.title, sections, hasStructure };
  });

  return res.status(200).json({ results });
}
