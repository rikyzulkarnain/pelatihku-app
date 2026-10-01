// Lead agent — padanan `LeadAgent` (lead.py) di proyek mentor.
// Lead TIDAK menjawab sendiri: dia hanya memilih tool (sub-agent) lewat
// function calling, lalu hasil tool dikirim apa adanya ke pengguna.

import { supportsThinking } from "@/constants/coach-constant";
import { generateWithFallback } from "@/features/ai/generate";
import { FunctionCall, FunctionCallingConfigMode } from "@google/genai";
import { LEAD_INSTRUCTION } from "./instructions/lead";
import { AGENT_TOOLS, lastUserText, ToolContext } from "./tools";

// pemetaan nama -> tool, dipakai saat mengeksekusi function call
const toolByName = new Map(AGENT_TOOLS.map((t) => [t.declaration.name, t]));

// Batas tool yang dijalankan per pesan, supaya waktu tunggu & biaya terkendali.
const MAX_CALLS = 3;

export type AgentReply = {
  text: string;
  thought?: string;
  /** Nama tool yang dijalankan, urut sesuai eksekusi. */
  tools: string[];
};

export async function runLeadAgent(ctx: ToolContext): Promise<AgentReply> {
  const response = await generateWithFallback(ctx.model, (model) => ({
    model,
    contents: ctx.history,
    config: {
      systemInstruction: LEAD_INSTRUCTION,
      temperature: 0.2,
      tools: [{ functionDeclarations: AGENT_TOOLS.map((t) => t.declaration) }],
      // mode ANY: model WAJIB memilih fungsi, tidak boleh menjawab sendiri.
      // Tanpa ini model lemah seperti flash-lite mengarang jawaban/data
      // tanpa pernah memanggil fungsinya. Hasil fungsi juga tidak dikirim
      // balik ke model (tanpa putaran kedua), jadi tidak ditulis ulang dan
      // hemat 1 request per pesan.
      toolConfig: {
        functionCallingConfig: { mode: FunctionCallingConfigMode.ANY },
      },
      // Lead cuma memilih rute — thinking dimatikan biar cepat.
      ...(supportsThinking(model) ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
    },
  }));

  let calls: FunctionCall[] = (response.functionCalls ?? [])
    .filter((c) => c.name && toolByName.has(c.name))
    .slice(0, MAX_CALLS);

  if (calls.length === 0) {
    // Mode ANY seharusnya selalu menghasilkan function call. Kalau kosong atau
    // nama fungsinya tidak dikenal, response.text biasanya berisi sintaks
    // function call mentah — jangan dikirim. Jatuhkan ke coach (read-only, aman).
    console.warn("[agent] lead tidak menghasilkan function call valid", {
      functionCalls: response.functionCalls,
      text: response.text?.slice(0, 200),
    });
    calls = [
      { name: "answer_question", args: { question: lastUserText(ctx.history) } },
    ];
  }

  // Dijalankan berurutan, bukan paralel: urutan bisa penting
  // (mis. catat makanan dulu, baru rekomendasi menu dari sisa target).
  const texts: string[] = [];
  const thoughts: string[] = [];
  for (const call of calls) {
    const tool = toolByName.get(call.name as string)!;
    try {
      const result = await tool.run(call.args ?? {}, ctx);
      texts.push(result.text);
      if (result.thought) thoughts.push(result.thought);
    } catch (error) {
      texts.push(
        `⚠️ ${error instanceof Error ? error.message : "Terjadi kesalahan pada agent."}`,
      );
    }
  }

  return {
    text: texts.join("\n\n---\n\n"),
    thought: thoughts.join("\n\n") || undefined,
    tools: calls.map((c) => c.name as string),
  };
}
