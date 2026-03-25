import { Response } from 'express';
import { AuthRequest } from '../middleware';

interface ParsedTask {
  title: string;
  description: string;
  energyRequired: 'low' | 'medium' | 'high';
  estimatedTimeMinutes: number;
  deadline: string;
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
}

// OpenRouter free models — try in order of preference for JSON extraction
// If one model is rate-limited, automatically try the next one
// Note: Free models change frequently, check https://openrouter.ai/models for current options
const OR_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',    // Best for JSON, but often rate limited
  'qwen/qwen3-next-80b-a3b-instruct:free',     // Good fallback
  'nousresearch/hermes-3-llama-3.1-405b:free', // Heavy fallback
  'openrouter/free',                           // Catch-all auto router
];
const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Robustly extract the first valid JSON object from a string.
 * Free models sometimes wrap output in markdown or prose,
 * so we find the first { and last } and try to parse between them.
 */
function extractJSON(raw: string): ParsedTask {
  // 1. Strip markdown fences
  const cleaned = raw
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  // 2. Try direct parse first (model was well-behaved)
  try { return JSON.parse(cleaned); } catch { /* fall through */ }

  // 3. Find first { ... } block
  const start = cleaned.indexOf('{');
  const end   = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { /* fall through */ }
  }

  throw new Error('No valid JSON found in model response');
}

function normalizeDate(text: string): string {
  // Accept ISO already
  const iso = text.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(Date.parse(iso))) {
    return iso;
  }

  // Simple common date forms: d-m-yyyy, d/m/yyyy
  const m = /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})$/.exec(text.trim());
  if (m) {
    let [_, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    const dv = `${y.padStart(4, '0')}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`;
    if (!Number.isNaN(Date.parse(dv))) return dv;
  }

  return '';
}

function fallbackParse(text: string): ParsedTask {
  const lower = text.toLowerCase();

  let energy: ParsedTask['energyRequired'] = 'medium';
  if (lower.includes('low') || lower.includes('easy') || lower.includes('light')) energy = 'low';
  if (lower.includes('high') || lower.includes('hard') || lower.includes('urgent')) energy = 'high';

  let minutes = 30;
  const timeMatch = lower.match(/(\d+)\s*(?:min|minute|minutes)/);
  if (timeMatch) minutes = Math.max(15, Math.min(480, Math.round(parseInt(timeMatch[1], 10)/15)*15));
  else if (lower.match(/(\d+)\s*(?:h|hour|hours)/)) {
    const v = parseInt(lower.match(/(\d+)\s*(?:h|hour|hours)/)![1], 10);
    minutes = Math.max(15, Math.min(480, v * 60));
  }

  let deadline = '';
  const dateMatch = lower.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/);
  if (dateMatch) deadline = normalizeDate(dateMatch[1]);

  const today = new Date();
  if (!deadline) {
    if (lower.includes('tomorrow')) {
      const t = new Date(today);
      t.setDate(t.getDate() + 1);
      deadline = t.toISOString().slice(0, 10);
    } else {
      const weekdays = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
      for (const w of weekdays) {
        if (lower.includes(w)) {
          const target = weekdays.indexOf(w);
          const curr = today.getDay();
          let diff = (target - curr + 7) % 7;
          if (diff === 0) diff = 7;
          const dt = new Date(today);
          dt.setDate(dt.getDate() + diff);
          deadline = dt.toISOString().slice(0, 10);
          break;
        }
      }
    }
  }

  const title = text.trim().slice(0, 200);
  const description = text.trim().slice(0, 1000);

  return {
    title: title || 'Untitled task',
    description,
    energyRequired: energy,
    estimatedTimeMinutes: minutes,
    deadline,
    recurrence: lower.includes('daily') ? 'daily' : lower.includes('weekly') ? 'weekly' : lower.includes('monthly') ? 'monthly' : 'none',
  };
}


/**
 * Parse natural language into structured task data via OpenRouter.
 * POST /api/tasks/parse
 */
export const parseTaskFromText = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({ message: 'No text provided to parse.' });
      return;
    }

    if (text.length > 500) {
      res.status(400).json({ message: 'Input too long. Keep it under 500 characters.' });
      return;
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('OPENROUTER_API_KEY not set in environment variables');
      res.status(500).json({
        message: 'AI parsing not configured. Add OPENROUTER_API_KEY to your environment variables.',
      });
      return;
    }

    console.log('Starting AI parsing for text:', text.trim());

    const today     = new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    const systemPrompt = `You are a strict assistant that converts a student task description into exactly one JSON object only (no markdown, no text, no code blocks).
Output MUST be parseable JSON exactly matching this schema:
{
  "title": "A short, actionable title extracted from the text. Do not just copy the whole text.",
  "description": "Any remaining context, details, or notes from the text. Can be empty if the title covers everything.",
  "energyRequired": "low" | "medium" | "high",
  "estimatedTimeMinutes": number,
  "deadline": "YYYY-MM-DD",
  "recurrence": "none" | "daily" | "weekly" | "monthly"
}

If a field cannot be determined, use empty string for text fields and "medium"/30/"none" for others.

TITLE EXTRACTION RULES:
- Extract a SHORT title (2-6 words max) that captures the core action
- Remove time estimates, deadlines, energy mentions from the title
- Use verb-first phrasing: "Review chem notes" not "Review chem notes before Friday exam 45 min"
- Never copy the entire input as the title

DESCRIPTION EXTRACTION RULES:
- Move all details NOT needed in the title to description
- Include: context, reasons, constraints, energy mentions, time estimates if descriptive
- Example: title="Review chem notes", description="Before Friday exam, low energy ok, 45 min"

Example input: "Review chem notes before Friday exam, low energy ok, 45 min"
Example output:
{"title":"Review chem notes","description":"Before Friday exam, low energy ok.","energyRequired":"low","estimatedTimeMinutes":45,"deadline":"2026-03-27","recurrence":"none"}

Energy guide:
- low: reading, reviewing notes, admin tasks, emails
- medium: writing essays, problem sets, studying, group work
- high: exams, complex coding, deep focus, presentations

Time guide (round to nearest 15):
- quick/briefly = 15
- short task = 15-30
- essay/problem set = 60-120
- exam prep = 90-180
- default = 30

Date guide (resolve from today: ${today}, which is a ${dayOfWeek}):
- ALL dates MUST be returned in strict YYYY-MM-DD format.
- "tomorrow" = next calendar day
- day name like "Friday" = the coming occurrence of that day
- specific dates like "25th march" = calculate the exact YYYY-MM-DD for this year (e.g., 2026-03-25).
- "next week" = 7 days from today
- "end of week" = coming Sunday
- no date mentioned = use empty string ""`;

    const userPrompt = `Parse this student task: "${text.trim()}"`;

    let lastError = '';
    let parsed: ParsedTask | null = null;

    // Try each model in sequence until one works
    for (const model of OR_MODELS) {
      console.log(`Trying model: ${model}`);
      try {
        const response = await fetch(OR_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': process.env.APP_URL ?? 'https://localhost:5000',
            'X-Title': 'Contextual Task Engine',
          },
          body: JSON.stringify({
            model,
            max_tokens: 300,
            temperature: 0.1,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user',   content: userPrompt   },
            ],
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            console.log(`Model ${model} rate limited (429)`);
            lastError = `Model ${model} is rate-limited`;
            continue; // Try next model
          }
          console.log(`Model ${model} returned status ${response.status}`);
          lastError = `Model ${model} returned ${response.status}`;
          continue; // Try next model
        }

        const data = await response.json() as {
          choices?: Array<{ message?: { content?: string } }>;
          error?: { message: string };
        };

        if (data.error) {
          lastError = `Model ${model} error: ${data.error.message}`;
          continue; // Try next model
        }

        const rawContent = data.choices?.[0]?.message?.content ?? '';

        if (!rawContent.trim()) {
          lastError = `Model ${model} returned empty response`;
          continue; // Try next model
        }

        try {
          parsed = extractJSON(rawContent);
          console.log(`Successfully parsed with model: ${model}`);
          break; // Success! Exit the loop
        } catch {
          console.log(`Model ${model} returned invalid JSON`);
          lastError = `Model ${model} returned invalid JSON`;
          continue; // Try next model
        }

      } catch (error) {
        lastError = `Network error with ${model}: ${error}`;
        continue; // Try next model
      }
    }

    // If all models failed, use heuristic fallback parse so the UX still works
    if (!parsed) {
      console.warn('All AI models failed:', lastError);
      const fallback = fallbackParse(text);
      res.status(200).json({
        parsed: fallback,
        warning: 'AI parsing failed, heuristic fallback values are used. Please edit details before saving.',
        detail: lastError,
      });
      return;
    }

    // Sanitise and clamp — never trust model output directly
    const safe: ParsedTask = {
      title: String(parsed.title ?? '').trim().slice(0, 200) || text.trim().slice(0, 80),
      description: String(parsed.description ?? '').trim().slice(0, 1000),
      energyRequired: (['low', 'medium', 'high'] as const).includes(
        parsed.energyRequired as 'low' | 'medium' | 'high'
      ) ? parsed.energyRequired : 'medium',
      estimatedTimeMinutes: Math.min(480, Math.max(15,
        Math.round((Number(parsed.estimatedTimeMinutes) || 30) / 15) * 15
      )),
      deadline: (
        typeof parsed.deadline === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(parsed.deadline) &&
        !isNaN(Date.parse(parsed.deadline))
      ) ? parsed.deadline : '',
      recurrence: (['none', 'daily', 'weekly', 'monthly'] as const).includes(
        parsed.recurrence as 'none' | 'daily' | 'weekly' | 'monthly'
      ) ? parsed.recurrence : 'none',
    };

    res.json({ parsed: safe });

  } catch (error) {
    console.error('parseTaskFromText error:', error);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};