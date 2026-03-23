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

// OpenRouter free model — Llama 3.3 70B is the best free option for JSON extraction.
// Fallback: "google/gemma-3-27b-it:free" if this hits rate limits.
const OR_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';
const OR_URL   = 'https://openrouter.ai/api/v1/chat/completions';

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
      res.status(500).json({
        message: 'AI parsing not configured. Add OPENROUTER_API_KEY to your environment variables.',
      });
      return;
    }

    const today     = new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    const systemPrompt = `You are a task parser for a student productivity app.
Today is ${dayOfWeek}, ${today}.
Respond with ONLY a valid JSON object. No explanation, no markdown, no extra text.

JSON schema:
{
  "title": string,
  "description": string,
  "energyRequired": "low" | "medium" | "high",
  "estimatedTimeMinutes": number,
  "deadline": string,
  "recurrence": "none" | "daily" | "weekly" | "monthly"
}

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

Date guide (resolve from today ${today}):
- "tomorrow" = next calendar day
- day name like "Friday" = the coming occurrence of that day
- "next week" = 7 days from today
- "end of week" = coming Sunday
- no date mentioned = use empty string ""`;

    const userPrompt = `Parse this student task: "${text.trim()}"`;

    const response = await fetch(OR_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.APP_URL ?? 'https://localhost:5000',
        'X-Title': 'Contextual Task Engine',
      },
      body: JSON.stringify({
        model: OR_MODEL,
        max_tokens: 300,
        temperature: 0.1,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt   },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenRouter error:', response.status, errText);

      if (response.status === 429) {
        res.status(429).json({
          message: 'AI is rate-limited right now. Wait a moment and try again, or fill in manually.',
        });
        return;
      }

      res.status(502).json({
        message: 'AI service unavailable. Please fill in the form manually.',
      });
      return;
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message: string };
    };

    if (data.error) {
      console.error('OpenRouter body error:', data.error);
      res.status(502).json({ message: 'AI service returned an error. Please try again.' });
      return;
    }

    const rawContent = data.choices?.[0]?.message?.content ?? '';

    if (!rawContent.trim()) {
      res.status(422).json({ message: 'AI returned an empty response. Try rephrasing.' });
      return;
    }

    let parsed: ParsedTask;
    try {
      parsed = extractJSON(rawContent);
    } catch {
      console.error('Failed to extract JSON from:', rawContent);
      res.status(422).json({
        message: 'Could not parse that. Try: "finish essay by Friday, 2 hours, high energy".',
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