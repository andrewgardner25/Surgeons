export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { notes, theatreList } = req.body;
  if (!notes || !theatreList) {
    return res.status(400).json({ error: "Missing notes or theatreList" });
  }

  // Parse notes into sections by title
  const noteSections = {};
  const lines = notes.split("\n");
  let currentTitle = null;
  let currentContent = [];

  for (const line of lines) {
    if (line.startsWith("===") && line.endsWith("===")) {
      if (currentTitle) {
        noteSections[currentTitle] = currentContent.join("\n").trim();
      }
      currentTitle = line.replace(/===/g, "").trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }
  if (currentTitle) {
    noteSections[currentTitle] = currentContent.join("\n").trim();
  }

  // Parse theatre list into individual procedures
  const procedures = theatreList
    .split("\n")
    .map(p => p.trim())
    .filter(Boolean);

  // Keyword match each procedure to notes
  const results = procedures.map(procedure => {
    const procLower = procedure.toLowerCase();
    const procWords = procLower.split(/\s+/).filter(w => w.length > 3);

    // Find best matching note
    let bestMatch = null;
    let bestScore = 0;

    for (const [title, content] of Object.entries(noteSections)) {
      const titleLower = title.toLowerCase();
      let score = 0;

      // Exact or partial title match
      if (titleLower.includes(procLower) || procLower.includes(titleLower)) {
        score += 10;
      }

      // Word by word matching
      for (const word of procWords) {
        if (titleLower.includes(word)) score += 2;
      }

      // Also check content keywords
      const contentLower = content.toLowerCase();
      for (const word of procWords) {
        if (contentLower.includes(word)) score += 1;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = { title, content };
      }
    }

    if (!bestMatch || bestScore === 0) {
      return {
        procedure,
        consultant: null,
        tips: ["No personal notes found for this procedure"],
        closure: null,
        found: false
      };
    }

    // Parse the matched content into tips
    const lines = bestMatch.content.split("\n").filter(l => l.trim());
    const tips = [];
    let consultant = null;
    let closure = null;

    for (const line of lines) {
      const clean = line.replace(/^[-•*]\s*/, "").trim();
      if (!clean) continue;

      // Detect consultant name (short line, no punctuation, title case)
      if (clean.length < 40 && !clean.includes("-") && /^[A-Z]/.test(clean) && !clean.startsWith("-")) {
        if (!consultant && !clean.toLowerCase().includes("open") && !clean.toLowerCase().includes("close")) {
          consultant = clean;
          continue;
        }
      }

      // Detect closure (vicryl, monocryl, undyed, nylon)
      if (/vicryl|monocryl|undyed|nylon|prolene|\d-0/.test(clean.toLowerCase())) {
        closure = (closure ? closure + ", " : "") + clean;
        continue;
      }

      tips.push(clean);
    }

    return {
      procedure,
      consultant,
      tips: tips.length > 0 ? tips : ["Notes found but no specific tips extracted"],
      closure,
      found: true
    };
  });

  return res.status(200).json({ results });
}
