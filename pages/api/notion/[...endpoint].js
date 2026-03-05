export default async function handler(req, res) {
  const token = process.env.NOTION_TOKEN;

  if (!token) {
    return res.status(500).json({ error: "Notion token not configured" });
  }

  const segments = req.query.endpoint;
  const endpointPath = Array.isArray(segments) ? segments.join("/") : segments;
  const notionUrl = `https://api.notion.com/v1/${endpointPath}`;

  try {
    const response = await fetch(notionUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: "Failed to connect to Notion", detail: error.message });
  }
}
