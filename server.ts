/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// Lazy-loaded Gemini AI client to ensure zero startup crashes when API keys are unconfigured
let aiClientInstance: GoogleGenAI | null = null;

function getGeminiClient(apiKeyFromRequest?: string): GoogleGenAI {
  const effectiveApiKey =
    apiKeyFromRequest?.trim() ||
    process.env.GEMINI_API_KEY;

  if (
    !effectiveApiKey ||
    effectiveApiKey === "MY_GEMINI_API_KEY"
  ) {
    throw new Error(
      "Gemini API Key not provided. Please enter a valid Gemini API key."
    );
  }

  return new GoogleGenAI({
    apiKey: effectiveApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 1. Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 2. Chat/Advisor Endpoint: Expert guidance on materials science, water activity & formulations
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, apiKey } = req.body;
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'Invalid or missing messages array.' });
      return;
    }
    
    const ai = getGeminiClient(apiKey);
    
    // Format conversation history
    const systemPrompt = `You are an expert material scientist and pharmaceutical development scientist. 
Your specialty is solid-state characterization, moisture sorption isotherms (DVS - Dynamic Vapor Sorption), physical-chemical stability, excipient compatibilities, glass transitions (Tg), deliquescence, and the critical selection of excipients for solid oral dosage forms.

Maintain a highly professional, scientifically rigorous, and helpful academic tone. 
When explaining things, reference GAB and BET modeling, critical relative humidity, chemical susceptibility to hydrolysis, and thermodynamic trends (e.g. moisture sorption decreasing with temperature). 
Keep responses well-structured with bullet points or bold tags where necessary. Ensure your answers are clear, objective, and precise.`;

    const contents = messages.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
    
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });
    
    res.json({
      content: response.text || "No response generated.",
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Chat API Error:", error.message);
    res.status(500).json({ 
      error: error.message || "An internal error occurred while communicating with Gemini."
    });
  }
});

// 3. AI Predictive Isotherm Extender: Fit GAB constants & literature benchmarks for arbitrary materials
app.post('/api/predict', async (req, res) => {
  try {
    const { excipientName, chemicalStructure, apiKey} = req.body;
    if (!excipientName || typeof excipientName !== 'string' || excipientName.trim() === '') {
      res.status(400).json({ error: 'Excipient name is required.' });
      return;
    }
    
    const ai = getGeminiClient(apiKey);
    
    const predictionPrompt = `Analyze the pharmaceutical excipient/material named: "${excipientName}" ${
      chemicalStructure ? `with chemical formula/structure details: "${chemicalStructure}"` : ""
    }.
Identify its physical interaction with water vapor and its typical moisture adsorption isotherm category.
Suggest its Guggenheim-Anderson-de Boer (GAB) modeling constants at 25°C:
- Xm25 (monolayer moisture capacity as % w/w, typically 0.05% to 15.0%)
- C25 (Guggenheim energetic constant, typically 1.5 to 80.0)
- K25 (multilayer factor, scale of 0.5 to 0.96)
- delHc (monolayer sorption enthalpy excess in kJ/mol, typically 2.0 to 22.0)
- delHk (multilayer thermal sensitivity correction in kJ/mol, typically -2.5 to 1.5)

Ensure these constants are physically consistent:
- Non-hygroscopic crystalline materials (like mannitol) have Xm25 < 0.2, C25 < 5, K25 < 0.75.
- Amorphous polar polymers (like PVP/PCD) have Xm25 in the 9-13 range, C25 around 10-25, and K25 around 0.85-0.95.
- The values must be genuine scientific estimates based on chemical structure, silanol densities, glycoside linkages, and hydrogen-binding configurations.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: predictionPrompt,
      config: {
        systemInstruction: "You are a database of physical-chemical properties for solid materials. Return estimations in perfect structured JSON.",
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            excipientName: { 
              type: Type.STRING, 
              description: "The verified USP/NF or standard name of the excipient/material."
            },
            category: { 
              type: Type.STRING, 
              description: "Must be exactly one of: Diluent, Binder, Disintegrant, Glidant/Adsorbent, Lubricant, Coating Agent."
            },
            description: { 
              type: Type.STRING, 
              description: "Concise summary of physical structure and main use cases in solid dosage formulation."
            },
            hygroscopicityClass: { 
              type: Type.STRING, 
              description: "Must be exactly one of: Non-hygroscopic, Slightly hygroscopic, Moderately hygroscopic, Very hygroscopic, Deliquescent."
            },
            criticalRH: { 
              type: Type.INTEGER, 
              description: "Estimated Critical Relative Humidity (%) where stability drops or rapid liquid condensation occurs."
            },
            molecularRole: { 
              type: Type.STRING, 
              description: "The chemical, molecular, or grid-network reason why this material behaves this way with water (e.g. silanol groups, hydrogen bonds)."
            },
            literatureNotes: { 
              type: Type.STRING, 
              description: "Discussion of temperature sensitivity of this material (how moisture uptake behaves under refrigeration 8°C vs high T 40°C) and how it fits the GAB/BET description."
            },
            standardGAB: {
              type: Type.OBJECT,
              properties: {
                Xm25: { type: Type.NUMBER, description: "Monolayer moisture capacity (% w/w) between 0.05 and 15" },
                C25: { type: Type.NUMBER, description: "Guggenheim adsorption C constant between 1.5 and 80" },
                K25: { type: Type.NUMBER, description: "Multilayer factor K between 0.5 and 0.96" },
                delHc: { type: Type.NUMBER, description: "Enthalpy excess for parameter C in kJ/mol between 2 and 22" },
                delHk: { type: Type.NUMBER, description: "Enthalpy excess for parameter K in kJ/mol between -2.5 and 1.5" }
              },
              required: ["Xm25", "C25", "K25", "delHc", "delHk"]
            }
          },
          required: [
            "excipientName", "category", "description", "hygroscopicityClass", 
            "criticalRH", "molecularRole", "literatureNotes", "standardGAB"
          ]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("Prediction API Error:", error.message);
    res.status(500).json({ 
      error: error.message || "An internal error occurred while predicting the GAB constants via Gemini."
    });
  }
});

// Vite & Static file serving pipeline
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // In dev mode, attach the Vite development server middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production mode, serve built assets locally
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server starting up successfully at http://localhost:${PORT}`);
  });
}

startServer();
