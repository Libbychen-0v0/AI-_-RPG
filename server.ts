import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

let _filename = '';
let _dirname = '';

if (typeof import.meta !== 'undefined' && import.meta.url) {
  _filename = fileURLToPath(import.meta.url);
  _dirname = path.dirname(_filename);
} else {
  _filename = __filename;
  _dirname = __dirname;
}

async function startServer() {
  const app = express();
  const port = 3000; // MUST be port 3000

  app.use(express.json({ limit: '10mb' }));

  // Initialize Gemini Client
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Route: Generate next adventure story node
  app.post('/api/story/generate', async (req, res) => {
    try {
      const { characterState, storySetting, logsHistory, actionTaken } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY 尚未在秘密 (Secrets) 面板中配置。" });
      }

      const prompt = `
你是一位精良的跑團遊戲主持人 (TRPG Game Master)，現在正在引導玩家進行一場生動、沉浸、充滿選擇分支與命運抉擇的文字冒險RPG。

【背景設定與當前主題】
${JSON.stringify(storySetting)}

【主體角色狀態】
${JSON.stringify(characterState)}

【先前的冒險歷程 (歷史記錄摘要)】
${(logsHistory || []).slice(-6).map((log: any) => `[${log.type}] ${log.text}`).join('\n')}

【玩家剛才採取的行動或選擇】
${actionTaken}

請根據玩家當前的選擇或行動，動態生成冒險的「下一個場景（Scene）」。
生成語系：繁體中文 (zh-TW)。

請注意以下設計原則：
1. **故事延續性**：順暢且富戲劇性地承接玩家之前的行動，營造驚心動魄、幽暗或趣味的TRPG氛圍，字數請大約在 150 到 300 字內，具有小說質感與代入感。
2. **多重分支與判定**：生成 2 到 4 個具備挑戰或不同方向的關鍵選擇 (choices)。
   - 你可以為部分選擇加入「屬性檢定」(requiresCheck)，屬性為 'STR' (力量)、'INT' (智慧)、'DEX' (敏捷) 之一，並指定其「難度等級」(difficulty，介於 8 至 18 之間)。
   - 也可以設計某些選擇需要特定物品解鎖 (requiredItem)。
3. **冒險影響與數據反饋**：
   - 可以在 playerEffects 中給予玩家數值變動（例如遭遇陷阱扣 HP、解謎成功加 EXP 或獲得金幣）。
   - 也可以給予新物品或是消耗已有物品（注意：loseItems只能包含玩家【角色裝備物品清單】中已有的物品）。請在 logMessage 中描述詳細的原因。
4. **結局判定**：如果玩家的生命值 HP 歸零、或已經抵達大結局，請將 isEnding 設為 true，並指定 endingType 為 'death' (死亡) 或 'victory' (成功通關大結局)。
5. **視覺情境描述**：提供一段精美的「情景插畫 Prompt」(illustrationPrompt)，用來描述當前場景的畫面特徵，方便後續 AI 進行圖像繪製（請使用簡短的英文作畫 Prompt，例如 "a dark gothic cavern with flickering candles, pixel art style"）。

請返回 JSON 格式並嚴格遵守結構。
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              storyText: {
                type: Type.STRING,
                description: "以繁體中文撰寫、富有帶入感的場景與故事描述文字。"
              },
              illustrationPrompt: {
                type: Type.STRING,
                description: "用作 AI 繪圖的英文情景描述，可包含藝術風格，如 pixel art 點陣畫、Retro Fantasy 圖或 oil painting等。"
              },
              choices: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    text: { type: Type.STRING, description: "選擇敘述，例如：『敏捷地滾過鋒利的擺錘陷阱』" },
                    requiresCheck: { 
                      type: Type.STRING, 
                      description: "該選擇需要的屬性判定。必須是 'STR'、'INT'、'DEX' 之一，或者空值/不需判定。" 
                    },
                    difficulty: { 
                      type: Type.INTEGER, 
                      description: "判定難度 (DC)，一般介於 8 - 18。若無 requiresCheck 則為 0。" 
                    },
                    requiredItem: { 
                      type: Type.STRING, 
                      description: "此項目解鎖所需的背包內物品名稱，玩家必須擁有此物品方可選擇。若不需要則為空字串。" 
                    }
                  },
                  required: ["id", "text"]
                }
              },
              playerEffects: {
                type: Type.OBJECT,
                properties: {
                  hpChange: { type: Type.INTEGER, description: "生命值變動（正數為恢復，負數為受傷）" },
                  mpChange: { type: Type.INTEGER, description: "魔力值變動" },
                  goldChange: { type: Type.INTEGER, description: "金幣變動" },
                  gainItems: { type: Type.ARRAY, items: { type: Type.STRING }, description: "獲得的新裝備或道具列表" },
                  loseItems: { type: Type.ARRAY, items: { type: Type.STRING }, description: "消耗或遺失的道具列表" },
                  logMessage: { type: Type.STRING, description: "本次行動造成的屬性/背包變更日誌描述（如『你遭遇猛毒，生命值減少了 15 點』）" },
                  expChange: { type: Type.INTEGER, description: "獲得的經驗值 EXP 變動" }
                }
              },
              isEnding: {
                type: Type.BOOLEAN,
                description: "是否已抵達大結局或者是角色死亡"
              },
              endingType: {
                type: Type.STRING,
                description: "結局類型: 'victory' 為獲勝通關, 'death' 為敗亡, 空字串為尚未結束"
              }
            },
            required: ["storyText", "choices", "isEnding"]
          }
        }
      });

      const text = response.text || "{}";
      const data = JSON.parse(text);
      res.json(data);
    } catch (error: any) {
      console.error("生成關卡與故事失敗:", error);
      res.status(500).json({ error: error.message || "發生未知錯誤" });
    }
  });

  // API Route: Generates beautiful scene illustration base64
  app.post('/api/story/draw-scene', async (req, res) => {
    try {
      const { prompt } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY 尚未在秘密 (Secrets) 面板中配置。" });
      }

      // Default to gemini-2.5-flash-image based on the gemini-api skill instructions
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              text: `Beautiful fantasy adventure scene illustration card, dark fantasy, highly detailed style, high fidelity visual. Scene: ${prompt || "a mysterious dungeon doorway"}`
            }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9" // wide aspect ratio for high immersion scene illustration
          }
        }
      });

      let base64Image = "";
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          base64Image = part.inlineData.data;
          break;
        }
      }

      if (base64Image) {
        res.json({ imageUrl: `data:image/png;base64,${base64Image}` });
      } else {
        res.status(500).json({ error: "未能生成圖像數據" });
      }
    } catch (error: any) {
      console.error("生成插圖失敗:", error);
      res.status(500).json({ error: error.message || "繪製圖畫時發生錯誤" });
    }
  });

  // Serve static files in development & production
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    console.log("正在以開發模式啟動 Vite 民用伺服器...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    // If no route matches, serve index.html via Vite transform
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const template = await vite.transformIndexHtml(url, `<!doctype html>
<html lang="zh-TW">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI 隨身文字冒險 RPG - 影之扉</title>
  </head>
  <body class="bg-[#0a0a0c] text-[#e2e8f0]">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    console.log("產品模式：提供 dist 目錄內的靜態文件...");
    app.use(express.static(path.resolve(_dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(_dirname, 'dist/index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`伺服器順利啟動於 port ${port}`);
  });
}

startServer();
