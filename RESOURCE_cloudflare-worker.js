export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: corsHeaders },
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const useWebSearch = body.useWebSearch === true;
    const payload = useWebSearch
      ? {
          model: "gpt-4.1",
          input: body.messages,
          tools: [{ type: "web_search_preview" }],
        }
      : {
          model: "gpt-4.1",
          messages: body.messages,
          max_tokens: body.max_tokens || 500,
        };

    try {
      const endpoint = useWebSearch
        ? "https://api.openai.com/v1/responses"
        : "https://api.openai.com/v1/chat/completions";

      const resp = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();

      if (!resp.ok) {
        return new Response(
          JSON.stringify({
            error: data.error?.message || "OpenAI request failed",
          }),
          {
            status: resp.status,
            headers: corsHeaders,
          },
        );
      }

      return new Response(JSON.stringify(data), {
        status: resp.status,
        headers: corsHeaders,
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 502,
        headers: corsHeaders,
      });
    }
  },
};
