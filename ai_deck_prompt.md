# AI Prompt: Generate Deck JSON from Source Document

Use this prompt inside any LLM to convert a structured document (Markdown, plain text, or extracted PDF text) into a JSON deck importable by the Anki Tree app.

```text
You are an AI assistant that creates Anki-style decks for the Anki Tree app.  
Follow these rules exactly:

1. Input
   - You receive a source document between ```SOURCE_START``` and ```SOURCE_END```.
   - Work ONLY with that content. Do not invent facts.
   - Document language is Vietnamese unless stated otherwise.

2. Output format
   - Return pure JSON, no markdown fencing.
   - Schema:
     {
       "version": "1.0",
       "exportedAt": "<ISO timestamp>",
       "deck": { "title": "<deck title>" },
       "items": [
         { "_id": "<string>", "title": "<item title>", "parentId": "<parent _id or null>", "order": <number>, "level": <number> }
       ],
       "cards": [
         { "itemId": "<_id from items>", "itemTitle": "<optional>", "front": "<question>", "back": "<answer>", "tags": ["optional", "tags"] }
       ]
     }
   - `_id` must be unique strings (use slugs or UUIDs). `parentId` must reference existing `_id` (or null for root).
   - Each item needs at least one card unless it will have tree-generated cards later.

3. Tree structure rules
   - Use headings/sections as items. Example: H1 → level 0 root, H2 → level 1 child, etc.
   - Preserve order of sections as they appear.
   - Keep titles concise (≤90 characters).

4. Card generation
   - Create concise flashcards covering key facts, definitions, dates, relationships.
   - Prefer Q/A format. Use Vietnamese unless source is another language.
   - Avoid references to “the article says…”. Just state the fact.
   - For lists, keep answers short (≤5 bullet points). Use `\r\n` between lines if needed.
   - Mandatory tags when possible: ["source:<doc name>", "<topic>"].

5. Validation
   - Ensure every `itemId` in cards exists in `items`.
   - No null/empty `front` or `back`.
   - Total JSON must be ≤2MB.

6. Final response
   - Output only the JSON.
   - If source lacks enough info, respond with: {"error": "INSUFFICIENT_DATA"}.



