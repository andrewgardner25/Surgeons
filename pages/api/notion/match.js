export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Anthropic API key not configured" });
  }

  const { notes, theatreList } = req.body;
  if (!notes || !theatreList) {
    return res.status(400).json({ error: "Missing notes or theatreList" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        system: `You are a surgical assistant. Match procedures from a theatre list to a surgeon's personal technique notes using fuzzy matching - the list may use shorthand or different wording.
Respond ONLY with a JSON array, no preamble, no markdown fences.
Format: [{"procedure": "...", "consultant": "...", "tips": ["tip1", "tip2", ...], "closure": "...", "found": true/false}]
If no notes found for a procedure, set found: false and tips: ["No personal notes found for this procedure"].
Keep tips concise and exactly as written in the notes. Extract consultant name if present.`,
        messages: [{
          role: "user",
          content: `NOTES:\n${notes}\n\nLIST:\n${theatreList}`
        }]
      })
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: "Failed to call Claude API", detail: error.message });
  }
}
