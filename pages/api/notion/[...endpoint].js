export default async function handler(req, res) {
  const { endpoint } = req.query;
  const token = process.env.NOTION_TOKEN;

  if (!token) {
    return res.status(500).json({ error: "Notion token not configured" });
  }

  const notionUrl = `https://api.notion.com/v1/${endpoint}`;

  try {
    const response = await fetch(notionUrl, {
      method: req.method,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
      },
      ...(req.method !== "GET" && { body: JSON.stringify(req.body) })
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: "Failed to connect to Notion" });
  }
}
