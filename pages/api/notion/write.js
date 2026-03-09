const PARENT_PAGE_ID = "319de636a1e5803e9976e02401b760bf";

async function notionRequest(endpoint, method, body) {
  const token = process.env.NOTION_TOKEN;
  const response = await fetch(`https://api.notion.com/v1/${endpoint}`, {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return response.json();
}

function textBlock(text, type = "paragraph") {
  return {
    object: "block",
    type,
    [type]: { rich_text: [{ type: "text", text: { content: text } }] }
  };
}

function headingBlock(text) {
  return {
    object: "block",
    type: "heading_2",
    heading_2: { rich_text: [{ type: "text", text: { content: text } }] }
  };
}

function bulletBlock(text) {
  return {
    object: "block",
    type: "bulleted_list_item",
    bulleted_list_item: { rich_text: [{ type: "text", text: { content: text } }] }
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = process.env.NOTION_TOKEN;
  if (!token) return res.status(500).json({ error: "Notion token not configured" });

  const { action, procedure, sections, tip, pageId } = req.body;

  // ACTION: Create a new procedure page
  if (action === "create") {
    const sectionOrder = ["Set Up", "Kit", "Approach", "Main Procedure", "Post Op", "Tips"];
    const children = [];

    for (const section of sectionOrder) {
      children.push(headingBlock(section));
      const content = sections[section] || "";
      if (content.trim()) {
        const lines = content.split("\n").filter(l => l.trim());
        for (const line of lines) {
          children.push(bulletBlock(line.trim()));
        }
      } else {
        children.push(textBlock("—"));
      }
    }

    const data = await notionRequest("pages", "POST", {
      parent: { page_id: PARENT_PAGE_ID },
      properties: {
        title: { title: [{ text: { content: procedure } }] }
      },
      children
    });

    if (data.id) {
      return res.status(200).json({ success: true, pageId: data.id });
    } else {
      return res.status(500).json({ error: "Failed to create page", detail: data });
    }
  }

  // ACTION: Add a tip to existing page
  if (action === "addTip") {
    if (!pageId || !tip) return res.status(400).json({ error: "Missing pageId or tip" });

    const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" });
    const tipText = `${today} — ${tip}`;

    // Get existing blocks to find Tips section
    const blocks = await notionRequest(`blocks/${pageId}/children`, "GET");
    let tipsSectionId = null;

    if (blocks.results) {
      for (const block of blocks.results) {
        if (block.type === "heading_2") {
          const text = block.heading_2?.rich_text?.[0]?.plain_text || "";
          if (text.toLowerCase() === "tips") {
            tipsSectionId = block.id;
            break;
          }
        }
      }
    }

    if (tipsSectionId) {
      // Append after tips heading
      await notionRequest(`blocks/${tipsSectionId}/children`, "PATCH", {
        children: [bulletBlock(tipText)]
      });
    } else {
      // Just append to end of page
      await notionRequest(`blocks/${pageId}/children`, "PATCH", {
        children: [headingBlock("Tips"), bulletBlock(tipText)]
      });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ error: "Unknown action" });
}
