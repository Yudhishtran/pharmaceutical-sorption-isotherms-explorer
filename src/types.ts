/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ExcipientGABParams {
  Xm25: number; // Monolayer capacity at 25°C (% w/w)
  C25: number;  // Guggenheim constant at 25°C
  K25: number;  // Multilayer correction factor at 25°C
  delHc: number; // Enthalpy excess for sorption heat (kJ/mol)
  delHk: number; // Enthalpy excess for multilayer (kJ/mol)
}

export interface Excipient {
  id: string;
  name: string;
  category: 'Diluent' | 'Binder' | 'Disintegrant' | 'Glidant/Adsorbent' | 'Lubricant' | 'Coating Agent' | 'Herbal Powder / Ayurveda' | 'Herbal Binder / Ayurveda' | 'Active Powder / Food' | 'Herbal Formulation / Ayurveda' | 'Gelling Agent / Food' | 'Binder / Food' | 'Diluent / Food' | 'Agriculture' | 'Adsorbent / Agriculture' | 'Glidant / Agriculture' | 'API / Active Pharmaceutical Ingredient';
  description: string;
  hygroscopicityClass: 'Non-hygroscopic' | 'Slightly hygroscopic' | 'Moderately hygroscopic' | 'Very hygroscopic' | 'Deliquescent';
  criticalRH: number; // Critical Relative Humidity (%) where sudden water uptake occurs, or high degradation risk
  standardGAB: ExcipientGABParams;
  literatureNotes: string;
  molecularRole: string;
}

export interface IsothermPoint {
  RH: number;  // Relative Humidity (%)
  EMC: number; // Equilibrium Moisture Content (% dry basis, w/w)
}

export interface IsothermCurve {
  temperature: number; // Temperature in °C
  points: IsothermPoint[];
}

export interface PredictionRequest {
  excipientName: string;
  chemicalStructure?: string;
  temperatures: number[]; // e.g. [8, 15, 25, 40]
}

export interface PredictionResult {
  excipientName: string;
  description: string;
  hygroscopicityClass: string;
  standardGAB: ExcipientGABParams;
  curves: IsothermCurve[];
  literatureRef: string;
  stabilityAdvice: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
