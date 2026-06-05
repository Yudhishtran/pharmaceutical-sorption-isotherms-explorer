/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  FlaskConical, 
  Thermometer, 
  Droplets, 
  Sparkles, 
  Info, 
  Send, 
  Search, 
  RefreshCw,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  HelpCircle,
  TrendingUp,
  Download,
  ListFilter,
  Flame,
  Layers,
  Percent,
  CheckSquare,
  XSquare,
  ArrowUpRight,
  ArrowDownRight,
  Printer,
  FileSpreadsheet,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Excipient, IsothermCurve, IsothermPoint, ChatMessage } from './types';
import { STANDARD_EXCIPIENTS } from './data/excipients';
import { calculateGAB, generateMultiTempIsotherms, calculateSorptionHeat } from './utils/sorptionModel';

const AVAILABLE_TEMPERATURES = [8, 15, 25, 30, 40];
const TEMPERATURE_COLORS: Record<number, string> = {
  8: '#2563eb',   // Indigo
  15: '#06b6d4',  // Cyan/Teal
  25: '#10b981',  // Emerald
  30: '#f59e0b',  // Amber
  40: '#ef4444',  // Rose/Red
};

export default function App() {
  // Lists & Selections
  const [excipients, setExcipients] = useState<Excipient[]>(() => {
    const saved = localStorage.getItem('pharma_sorption_materials');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse saved materials', e);
      }
    }
    return STANDARD_EXCIPIENTS;
  });
  
  useEffect(() => {
    localStorage.setItem('pharma_sorption_materials', JSON.stringify(excipients));
  }, [excipients]);

  const [selectedExcipientId, setSelectedExcipientId] = useState<string>('mcc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTemps, setSelectedTemps] = useState<number[]>([8, 25, 40]);
  
  // Tabs config
  const [activeTab, setActiveTab] = useState<'dashboard' | 'comparison' | 'formulation'>('dashboard');

  // Formulation Composition States
  const [formulationComponents, setFormulationComponents] = useState<Array<{
    materialId: string;
    percentage: number;
    initialMoisture: number;
  }>>([
    { materialId: 'ibuprofen_api', percentage: 20, initialMoisture: 0.15 },
    { materialId: 'mcc', percentage: 40, initialMoisture: 4.8 },
    { materialId: 'lactose_monohydrate', percentage: 30, initialMoisture: 0.5 },
    { materialId: 'pvp_k30', percentage: 8, initialMoisture: 5.5 },
    { materialId: 'magnesium_stearate', percentage: 2, initialMoisture: 1.2 }
  ]);
  const [formulationTemp, setFormulationTemp] = useState<number>(25);
  const [formulationTargetRH, setFormulationTargetRH] = useState<number>(50);

  // Batch Comparison Configuration
  const [comparisonExcipientIds, setComparisonExcipientIds] = useState<string[]>(['mcc', 'pvp_k30', 'lactose_monohydrate']);
  const [comparisonTemp, setComparisonTemp] = useState<number>(25);

  // Calibration Mode Configuration
  const [showCalibrationMode, setShowCalibrationMode] = useState<boolean>(false);
  const [calibrationRH, setCalibrationRH] = useState<number>(50);
  const [calibrationEMC, setCalibrationEMC] = useState<number>(5.5);
  const [calibrationTemp, setCalibrationTemp] = useState<number>(25);

  // Heatmap and Unit selections
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [emcUnit, setEmcUnit] = useState<'percent' | 'massFraction'>('percent');
  const [showErrorBands, setShowErrorBands] = useState<boolean>(true);

  // Derived state calculations for formulation composition
  const totalPercentage = formulationComponents.reduce((acc, c) => acc + c.percentage, 0);

  // Bisection solver for equilibrium water activity (aw)
  const solverResult = (() => {
    let low = 0.001;
    let high = 0.95;
    
    if (formulationComponents.length === 0) {
      return { aw: 0.1, residual: 0, finalCompositeEMC: 0, components: [] };
    }

    const getResidual = (awVal: number) => {
      let sum = 0;
      formulationComponents.forEach(comp => {
        const excVal = excipients.find(e => e.id === comp.materialId);
        if (excVal) {
          const pred = calculateGAB(awVal, formulationTemp, excVal.standardGAB);
          sum += (comp.percentage / 100) * (pred - comp.initialMoisture);
        }
      });
      return sum;
    };
    
    let solvedAw = 0.1;
    let residualVal = 999;
    for (let iter = 0; iter < 45; iter++) {
      const mid = (low + high) / 2;
      const res = getResidual(mid);
      residualVal = res;
      if (Math.abs(res) < 1e-6) {
        solvedAw = mid;
        break;
      }
      if (res < 0) {
        low = mid;
      } else {
        high = mid;
      }
      solvedAw = mid;
    }
    
    let totalInitialWater = 0;
    let list = formulationComponents.map(comp => {
      const excVal = excipients.find(e => e.id === comp.materialId) || excipients[0];
      const initialEMC = comp.initialMoisture;
      const finalEMC = calculateGAB(solvedAw, formulationTemp, excVal?.standardGAB);
      const transfer = finalEMC - initialEMC;
      totalInitialWater += (comp.percentage / 100) * finalEMC; // dry basis total composite water
      const waterContribution = (comp.percentage / 100) * finalEMC; // final water contribution
      
      const isAPI = excVal ? (excVal.id === 'ibuprofen_api' || excVal.category?.toLowerCase().includes('api')) : false;

      return {
        materialId: comp.materialId,
        name: excVal ? excVal.name : 'Unknown Material',
        category: excVal ? excVal.category : 'N/A',
        percentage: comp.percentage,
        initial: initialEMC,
        final: finalEMC,
        transfer,
        waterContribution,
        criticalRH: excVal ? excVal.criticalRH : 50,
        isAPI
      };
    });
    
    return {
      aw: solvedAw,
      residual: residualVal,
      finalCompositeEMC: totalInitialWater,
      components: list
    };
  })();

  // Print Report States
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Interactive Legend & Highlighting State
  const [highlightedTemp, setHighlightedTemp] = useState<number | null>(null);
  const highlightTimeoutRef = useRef<any>(null);

  const handleLegendClick = (temp: number) => {
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    // Toggle highlight if clicked again, otherwise highlight
    setHighlightedTemp(prev => prev === temp ? null : temp);
    // Auto-clear after 3 seconds for focus
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedTemp(null);
    }, 3000);
  };

  // Sensitivity Analysis & Linear Zone Trendline States
  const [showSensitivity, setShowSensitivity] = useState<boolean>(false);
  const [showTrendLines, setShowTrendLines] = useState<boolean>(false);

  // API Key state
  const [geminiApiKey, setGeminiApiKey] = useState('');

  // Custom Materials Predicitions
  const [customNameInput, setCustomNameInput] = useState('');
  const [customStructureInput, setCustomStructureInput] = useState('');
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionMessage, setPredictionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Filtered Excipients for search bar
  const filteredExcipients = excipients.filter(exc => 
    exc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exc.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exc.hygroscopicityClass.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Active Excipient Object
  const currentExcipient = excipients.find(e => e.id === selectedExcipientId) || excipients[0];

  // Selected RH slider for detailed lookups & comparisons
  const [targetRH, setTargetRH] = useState<number>(50);

  // SVG Mouse Interaction (Crosshair / Cursor tracking)
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoveredRH, setHoveredRH] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [mousePos, setMousePos] = useState<{ x: number, y: number } | null>(null);

  // Comparative RH for comparison grid
  const [compareRH, setCompareRH] = useState<number>(75);
  const [compareTemp, setCompareTemp] = useState<number>(25);

  // Threshold Toast State
  const [showThresholdToast, setShowThresholdToast] = useState<boolean>(false);
  const [toastDismissedId, setToastDismissedId] = useState<string>('');

  useEffect(() => {
    if (targetRH >= currentExcipient.criticalRH) {
      if (toastDismissedId !== currentExcipient.id) {
        setShowThresholdToast(true);
      }
    } else {
      setShowThresholdToast(false);
      if (toastDismissedId === currentExcipient.id) {
        setToastDismissedId('');
      }
    }
  }, [targetRH, currentExcipient.id, currentExcipient.criticalRH, toastDismissedId]);

  // Chatbot State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I am your AI Pharmaceutical Materials Assistant. You can ask me scientific questions about moisture adsorption, critical relative humidity, model fitting (GAB, BET), or formulation stabilities. Try selecting an excipient or choose a suggested inquiry below!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom on chat messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Handle Temp Toggle
  const toggleTemp = (t: number) => {
    if (selectedTemps.includes(t)) {
      if (selectedTemps.length > 1) {
        setSelectedTemps(selectedTemps.filter(x => x !== t));
      }
    } else {
      setSelectedTemps([...selectedTemps, t].sort((a,b) => a - b));
    }
  };

  // Select all available temperatures
  const selectAllTemps = () => {
    setSelectedTemps([...AVAILABLE_TEMPERATURES]);
  };

  // Clear temperatures, keeping 25C as standard baseline
  const clearAllTemps = () => {
    setSelectedTemps([25]);
  };

  // Run Custom Excipient GAB AI Prediction
  const handlePredictExcipient = async (e?: React.FormEvent, directName?: string) => {
    if (e) e.preventDefault();
    const nameToPredict = directName || customNameInput;
    if (!nameToPredict.trim()) return;

    setIsPredicting(true);
    setPredictionMessage(null);

    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          excipientName: nameToPredict,
          chemicalStructure: directName ? "" : customStructureInput,
          apiKey: geminiApiKey
}),
});
      if (!res.ok) {
        throw new Error(await res.text() || "Failed to predict excipient isotherms");
      }

      const data = await res.json();
      
      // Assign an ID and push to standard list
      const generatedId = `custom_${Date.now()}`;
      const newExcipient: Excipient = {
        id: generatedId,
        name: data.excipientName || nameToPredict,
        category: data.category || 'Diluent',
        description: data.description || 'Estimated custom chemical material based on machine reasoning.',
        hygroscopicityClass: data.hygroscopicityClass || 'Moderately hygroscopic',
        criticalRH: data.criticalRH || 75,
        molecularRole: data.molecularRole || 'Calculated water-binding profiles.',
        standardGAB: {
          Xm25: Number(data.standardGAB?.Xm25) || 5.0,
          C25: Number(data.standardGAB?.C25) || 15.0,
          K25: Number(data.standardGAB?.K25) || 0.8,
          delHc: Number(data.standardGAB?.delHc) || 10.0,
          delHk: Number(data.standardGAB?.delHk) || -1.0
        },
        literatureNotes: data.literatureNotes || 'Isotherm values generated server-side using Gemini 3.5 AI model calculations.',
      };

      setExcipients(prev => [...prev, newExcipient]);
      setSelectedExcipientId(generatedId);
      setCustomNameInput('');
      setCustomStructureInput('');
      setSearchQuery('');
      setPredictionMessage({
        type: 'success',
        text: `Successfully modeled constants for "${newExcipient.name}". Added to selector!`
      });
    } catch (err: any) {
      console.error(err);
      setPredictionMessage({
        type: 'error',
        text: err.message || "An error occurred while calling the Gemini API on the server."
      });
    } finally {
      setIsPredicting(false);
    }
  };

  // Submit message to Chatbot
  const handleChatSubmit = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const promptToSend = customPrompt || userInput;
    if (!promptToSend.trim()) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: promptToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setUserInput('');
    setIsTyping(true);

    try {
      const conversationHistory = [...messages, userMsg].slice(-8); // send last 8 messages for context
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: conversationHistory,
          apiKey: geminiApiKey
        })
      });

      if (!response.ok) {
        throw new Error(await response.text() || "Failed to connect to the material advisor server API.");
      }

      const data = await response.json();
      setMessages(prev => [...prev, {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: data.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Communication Failure: ${err.message || 'The backend failed to return a response.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Reset custom excipients
  const resetExcipients = () => {
    setExcipients(STANDARD_EXCIPIENTS);
    setSelectedExcipientId('mcc');
    setPredictionMessage(null);
  };

  // Formulation helpers
  const handleUpdateCompMaterial = (index: number, newId: string) => {
    const next = [...formulationComponents];
    next[index].materialId = newId;
    setFormulationComponents(next);
  };

  const handleUpdateCompProp = (index: number, percent: number) => {
    const next = [...formulationComponents];
    next[index].percentage = Math.max(0, percent);
    setFormulationComponents(next);
  };

  const handleUpdateCompMoist = (index: number, moisture: number) => {
    const next = [...formulationComponents];
    next[index].initialMoisture = Math.max(0, moisture);
    setFormulationComponents(next);
  };

  const handleRemoveComponent = (index: number) => {
    const next = formulationComponents.filter((_, i) => i !== index);
    setFormulationComponents(next);
  };

  const handleAddComponent = () => {
    // Add default carrier or API depending on what is already inside
    const hasIbu = formulationComponents.some(c => c.materialId === 'ibuprofen_api');
    const nextId = hasIbu ? 'pvp_k30' : 'ibuprofen_api';
    setFormulationComponents([
      ...formulationComponents,
      { materialId: nextId, percentage: 10, initialMoisture: 1.5 }
    ]);
  };

  const handleNormalizePercentages = () => {
    const total = formulationComponents.reduce((acc, c) => acc + c.percentage, 0);
    if (total <= 0) return;
    const next = formulationComponents.map(c => ({
      ...c,
      percentage: parseFloat(((c.percentage / total) * 100).toFixed(1))
    }));
    setFormulationComponents(next);
  };

  const handleResetFormulation = () => {
    setFormulationComponents([
      { materialId: 'ibuprofen_api', percentage: 20, initialMoisture: 0.15 },
      { materialId: 'mcc', percentage: 40, initialMoisture: 4.8 },
      { materialId: 'lactose_monohydrate', percentage: 30, initialMoisture: 0.5 },
      { materialId: 'pvp_k30', percentage: 8, initialMoisture: 5.5 },
      { materialId: 'magnesium_stearate', percentage: 2, initialMoisture: 1.2 }
    ]);
  };

  // Generate curves for selected excipient at all selected temperatures
  const activeCurves: IsothermCurve[] = selectedTemps.map(temp => {
    const points: IsothermPoint[] = [{ RH: 0, EMC: 0 }];
    for (let rh = 1; rh <= 95; rh++) {
      const emc = calculateGAB(rh / 100, temp, currentExcipient.standardGAB);
      points.push({ RH: rh, EMC: emc });
    }
    return { temperature: temp, points };
  });

  // Calculate coordinates dynamic autoscale boundary (EMC max)
  const maxEMCInSelection = Math.max(...activeCurves.map(curve => 
    Math.max(...curve.points.map(p => p.EMC))
  ), 0.1);

  // We choose a ceiling value that looks neat on a graph axis
  const getAxisCeiling = (val: number) => {
    if (val <= 0.5) return 0.5;
    if (val <= 1.0) return 1.0;
    if (val <= 2.0) return 2.0;
    if (val <= 5.0) return 5.0;
    if (val <= 10.0) return 10.0;
    if (val <= 20.0) return 20.0;
    if (val <= 40.0) return 40.0;
    if (val <= 60.0) return 60.0;
    return 80.0;
  };
  const emcCeiling = getAxisCeiling(maxEMCInSelection);

  // SVG Chart sizing & conversion
  const svgWidth = 520;
  const svgHeight = 310;
  const axisMarginLeft = 45;
  const axisMarginRight = 20;
  const axisMarginTop = 15;
  const axisMarginBottom = 35;

  const chartWidth = svgWidth - axisMarginLeft - axisMarginRight; // 455
  const chartHeight = svgHeight - axisMarginTop - axisMarginBottom; // 260

  const getX = (rh: number) => axisMarginLeft + (rh / 95) * chartWidth;
  const getY = (emc: number) => {
    const ratio = emc / emcCeiling;
    return (svgHeight - axisMarginBottom) - ratio * chartHeight;
  };

  // Calculate mouse RH position on SVG
  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    
    // Convert to viewBox coordinates (svgWidth = 520, svgHeight = 310)
    const viewX = (clientX / rect.width) * svgWidth;
    const viewY = (clientY / rect.height) * svgHeight;
    setMousePos({ x: viewX, y: viewY });

    const chartX = viewX - axisMarginLeft;
    
    if (chartX < 0 || chartX > chartWidth) {
      setIsHovered(false);
      setHoveredRH(null);
      return;
    }
    
    const rh = Math.round((chartX / chartWidth) * 95);
    const clampedRH = Math.max(0, Math.min(95, rh));
    setIsHovered(true);
    setHoveredRH(clampedRH);
  };

  const handleSvgMouseLeave = () => {
    setIsHovered(false);
    setHoveredRH(null);
    setMousePos(null);
  };

  // Fixed selection for crosshair (use hoveredRH if present, else default back to targetRH)
  const currentInspectRH = hoveredRH !== null ? hoveredRH : targetRH;

  // Temperature baseline trend calculation for the current inspected RH (baseline T = 25°C)
  const emcBaselineAtInspect = calculateGAB(currentInspectRH / 100, 25, currentExcipient.standardGAB);
  const emcAt40 = calculateGAB(currentInspectRH / 100, 40, currentExcipient.standardGAB);
  const emcAt8 = calculateGAB(currentInspectRH / 100, 8, currentExcipient.standardGAB);
  
  const changePct40 = emcBaselineAtInspect > 0 ? ((emcAt40 - emcBaselineAtInspect) / emcBaselineAtInspect) * 100 : 0;
  const changePct8 = emcBaselineAtInspect > 0 ? ((emcAt8 - emcBaselineAtInspect) / emcBaselineAtInspect) * 100 : 0;

  // CSV Downloader for plotted isotherm coordinate points
  const handleDownloadCSV = () => {
    // Columns headers
    const header = [
      "Relative Humidity (% RH)",
      "Water Activity (aw)",
      ...selectedTemps.map(t => `${t}°C EMC (${emcUnit === 'percent' ? '% w/w' : 'g/g'})`)
    ].join(",");

    const rows: string[] = [];
    
    // Generate RH levels from 0 to 95 in steps of 5 for optimal resolution
    for (let rh = 0; rh <= 95; rh += 5) {
      const aw = (rh / 100).toFixed(2);
      const rowValues = [
        rh.toString(),
        aw,
        ...selectedTemps.map(temp => {
          const emcVal = calculateGAB(rh / 100, temp, currentExcipient.standardGAB);
          const displayVal = emcUnit === 'percent' ? emcVal : emcVal / 100;
          return displayVal.toFixed(4);
        })
      ];
      rows.push(rowValues.join(","));
    }

    const csvContent = [header, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${currentExcipient.id}_isotherm_data_${emcUnit}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Excel content with custom layout styling that Microsoft Excel automatically respects
  const handleExportExcel = () => {
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Sorption Analysis Report</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header-row { background-color: #1e293b; color: #ffffff; font-weight: bold; font-size: 14px; text-align: center; }
          .document-title { font-size: 18px; font-weight: bold; color: #4338ca; }
          .label-bg { font-weight: bold; background-color: #f8fafc; border: 1px solid #e2e8f0; }
          .data-cell { border: 1px solid #e2e8f0; text-align: left; }
          .number-right { mso-number-format:"0\.000"; text-align: right; border: 1px solid #e2e8f0; }
          .center-cell { text-align: center; border: 1px solid #e2e8f0; }
          .param-header { background-color: #334155; color: #ffffff; font-weight: bold; text-align: left; font-size: 12px; }
          .isotherm-header { background-color: #0369a1; color: #ffffff; font-weight: bold; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="6" class="document-title">PHARMACEUTICAL SORPTION ISOTHERM REPORT • GAB THERMODYNAMIC MODEL</td></tr>
          <tr><td colspan="6">Generated Computingly: ${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td></tr>
          <tr><td colspan="6"></td></tr>

          <!-- Material characterization -->
          <tr class="param-header"><td colspan="6">I. Material Profile</td></tr>
          <tr>
            <td class="label-bg" width="180">Material Name</td>
            <td class="data-cell" colspan="5">${currentExcipient.name}</td>
          </tr>
          <tr>
            <td class="label-bg">Functional Category</td>
            <td class="data-cell" colspan="5">${currentExcipient.category}</td>
          </tr>
          <tr>
            <td class="label-bg">Hygroscopicity Class</td>
            <td class="data-cell" colspan="5">${currentExcipient.hygroscopicityClass} (Critical Stability Ceiling: ${currentExcipient.criticalRH}% RH)</td>
          </tr>
          <tr>
            <td class="label-bg">Molecular Role</td>
            <td class="data-cell" colspan="5">${currentExcipient.molecularRole}</td>
          </tr>
          <tr><td colspan="6"></td></tr>

          <!-- GAB Fits -->
          <tr class="param-header"><td colspan="6">II. Thermodynamic GAB Equation Coefficients (fitted at 25°C)</td></tr>
          <tr style="font-weight: bold; background-color: #f1f5f9;">
            <td style="border:1px solid #cbd5e1;">Parameter Symbol</td>
            <td style="border:1px solid #cbd5e1;" colspan="4">Scientific Parameter Definition</td>
            <td style="border:1px solid #cbd5e1; text-align: right;">Value</td>
          </tr>
          <tr>
            <td class="label-bg">Xm (25°C)</td>
            <td class="data-cell" colspan="4">Monolayer adsorption moisture threshold capacity</td>
            <td class="number-right">${currentExcipient.standardGAB.Xm25.toFixed(4)} % w/w</td>
          </tr>
          <tr>
            <td class="label-bg">C (25°C)</td>
            <td class="data-cell" colspan="4">Guggenheim adsorption energy activation constant</td>
            <td class="number-right">${currentExcipient.standardGAB.C25.toFixed(2)}</td>
          </tr>
          <tr>
            <td class="label-bg">K (25°C)</td>
            <td class="data-cell" colspan="4">Multilayer cohesion factor (bulk compliance score)</td>
            <td class="number-right">${currentExcipient.standardGAB.K25.toFixed(4)}</td>
          </tr>
          <tr>
            <td class="label-bg">delHc</td>
            <td class="data-cell" colspan="4">Enthalpy difference of monolayer excess heat (kJ/mol)</td>
            <td class="number-right">${currentExcipient.standardGAB.delHc.toFixed(2)}</td>
          </tr>
          <tr>
            <td class="label-bg">delHk</td>
            <td class="data-cell" colspan="4">Enthalpy difference of multilayer excess heat (kJ/mol)</td>
            <td class="number-right">${currentExcipient.standardGAB.delHk.toFixed(2)}</td>
          </tr>
          <tr><td colspan="6"></td></tr>

          <!-- Isotherm Plotting Coordinates -->
          <tr class="isotherm-header">
            <td style="border: 1px solid #0284c7;" rowspan="2">RH (%)</td>
            <td style="border: 1px solid #0284c7;" rowspan="2">Water Activity (aw)</td>
            <td style="border: 1px solid #0284c7;" colspan="${selectedTemps.length}">Equilibrium Moisture Content (EMC) % w/w at Selected Isotherm Climates</td>
          </tr>
          <tr class="isotherm-header">
            ${selectedTemps.map(t => `<td style="border: 1px solid #0284c7; text-align: right;">${t}°C EMC</td>`).join('')}
          </tr>
    `;

    // Modeled data rows 0% to 95%
    for (let rh = 0; rh <= 95; rh += 5) {
      const aw = (rh / 100).toFixed(2);
      html += `
          <tr>
            <td class="center-cell" style="font-weight: bold;">${rh}%</td>
            <td class="center-cell">${aw}</td>
            ${selectedTemps.map(temp => {
              const emcVal = calculateGAB(rh / 100, temp, currentExcipient.standardGAB);
              return `<td class="number-right">${emcVal.toFixed(3)}</td>`;
            }).join('')}
          </tr>
      `;
    }

    html += `
          <tr><td colspan="6"></td></tr>
          <tr class="header-row">
            <td colspan="6" style="font-size: 11px; font-weight: normal; font-style: italic;">Pharmaceutical Isotherm Explorer - Calculated using physical GAB and BET models. Author signature required.</td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${currentExcipient.id}_sorption_matrix_report.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Function to open the printable preview and immediately prompt PDF download via window.print()
  const handleExportPDF = () => {
    setShowPrintModal(true);
    // Give modal render a brief moment to stabilize for the browser print spooler
    setTimeout(() => {
      window.print();
    }, 450);
  };

  // Render SVG Isotherm paths
  const renderCurvesPaths = activeCurves.map(curve => {
    const pointsStr = curve.points
      .map(p => `${getX(p.RH)},${getY(p.EMC)}`)
      .join(' ');
    return {
      temp: curve.temperature,
      color: TEMPERATURE_COLORS[curve.temperature],
      pointsString: pointsStr
    };
  });

  // Calculate specific EMCs for the selected inspectRH
  const listEMCsAtInspection = selectedTemps.map(temp => {
    const emc = calculateGAB(currentInspectRH / 100, temp, currentExcipient.standardGAB);
    return { temp, emc };
  });

  // Determine which temperature to analyze sensitivity for
  const sensTemp = selectedTemps.includes(highlightedTemp || -1) 
    ? highlightedTemp! 
    : (selectedTemps.includes(25) ? 25 : selectedTemps[0]);

  // Compute Sensitivity + / - 10% curves for thermodynamic GAB C parameter
  let sensPlusPointsStr = "";
  let sensMinusPointsStr = "";
  let sensAreaPointsStr = "";

  if (showSensitivity && sensTemp !== undefined) {
    const plusPoints: { x: number; y: number }[] = [];
    const minusPoints: { x: number; y: number }[] = [];

    for (let rh = 0; rh <= 95; rh += 2) {
      const aw = rh / 100;
      
      // GAB with +10% C-constant (representing higher adsorption energy)
      const paramsPlus = { 
        ...currentExcipient.standardGAB, 
        C25: currentExcipient.standardGAB.C25 * 1.10 
      };
      const emcPlus = calculateGAB(aw, sensTemp, paramsPlus);
      plusPoints.push({ x: getX(rh), y: getY(emcPlus) });

      // GAB with -10% C-constant (representing lower adsorption energy)
      const paramsMinus = { 
        ...currentExcipient.standardGAB, 
        C25: currentExcipient.standardGAB.C25 * 0.90 
      };
      const emcMinus = calculateGAB(aw, sensTemp, paramsMinus);
      minusPoints.push({ x: getX(rh), y: getY(emcMinus) });
    }

    sensPlusPointsStr = plusPoints.map(p => `${p.x},${p.y}`).join(' ');
    sensMinusPointsStr = minusPoints.map(p => `${p.x},${p.y}`).join(' ');
    
    const polygonPoints = [
      ...plusPoints,
      ...[...minusPoints].reverse()
    ];
    sensAreaPointsStr = polygonPoints.map(p => `${p.x},${p.y}`).join(' ');
  }

  // Compute linear humidity zone trend lines (0-30%, 30-70%, 70-95%)
  const trendLinesData = selectedTemps.map(temp => {
    const emc0 = 0;
    const emc30 = calculateGAB(0.30, temp, currentExcipient.standardGAB);
    const emc70 = calculateGAB(0.70, temp, currentExcipient.standardGAB);
    const emc95 = calculateGAB(0.95, temp, currentExcipient.standardGAB);

    const pts = [
      { rh: 0, emc: emc0 },
      { rh: 30, emc: emc30 },
      { rh: 70, emc: emc70 },
      { rh: 95, emc: emc95 }
    ];

    const pointsStr = pts.map(p => `${getX(p.rh)},${getY(p.emc)}`).join(' ');
    return {
      temp,
      color: TEMPERATURE_COLORS[temp],
      pointsStr,
      pts
    };
  });

  // Pre-compiled questions to query Gemini
  const quickQuestions = [
    { label: "Why does moisture uptake drop at higher temperatures?", query: "Why does the equilibrium moisture content (EMC) of pharmaceutical materials decrease at higher temperatures for a set relative humidity? Explain via thermodynamic thermodynamics and the GAB/BET absorption theory." },
    { label: "Lactose Monohydrate stable crystalline water", query: "Explain why crystalline Lactose Monohydrate has a very flat moisture sorption isotherm until ~80% RH. What is the role of its 5%-bound stoichiometric monohydrate water molecule compared to amorphous lactose?" },
    { label: "Recommend excipients for water-sensitive API", query: "I have an active pharmaceutical ingredient (API) that is highly susceptible to hydrolytic degradation. Recommend dry binder, disintegrant, and diluent excipients with corresponding low moisture sorption isotherms to formulate this into a tablet." },
    { label: "PVP K30 moisture absorption and glass transition", query: "Explain PVP K30's moisture sorption curve. What is its critical relative humidity, and how does moisture uptake trigger a glass-to-rubber transition (sticky powder, lower Tg) ?" }
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans" id="app-root">
      {/* Upper Technical Header */}
      <header className="border-b border-slate-800 bg-slate-950 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" id="main-header">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-950 border border-sky-800 rounded-lg text-sky-400">
            <FlaskConical className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Pharmaceutical Sorption Isotherms Explorer
            </h1>
            <p className="text-xs text-slate-400">
              Thermodynamic GAB Modeling & Adsorption Analytics (0% – 95% RH • 8°C – 40°C)
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            GAB Equation Enabled
          </span>
          {excipients.length > STANDARD_EXCIPIENTS.length && (
            <button 
              onClick={resetExcipients}
              className="text-xs bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 px-3 py-1 rounded-md flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Library
            </button>
          )}
        </div>
      </header>

      {/* Main Grid Workspace */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" id="main-content">
        
        {/* LEFT COLUMN: Controls & Input Parameters */}
        <section className="col-span-1 lg:col-span-4 space-y-6" id="controls-panel">
          
          {/* Excipient Selector */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4" id="excipient-selector-card">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <ListFilter className="w-4 h-4 text-sky-400" />
                Select Excipient
              </h2>
              <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-sky-400 font-mono">
                {excipients.length} Materials
              </span>
                  <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium block">
                  Search & Filter Materials
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Type to search... (or type any new compound)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 text-slate-100 placeholder-slate-500 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-sky-500/50 transition-all font-medium"
                    id="excipient-search-input"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-[10px] font-mono px-1.5 py-0.5 bg-slate-950 rounded border border-slate-800 cursor-pointer"
                    >
                      clear
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                  Select Excipient ({filteredExcipients.length} matched)
                </label>
                <select
                  value={selectedExcipientId}
                  onChange={(e) => setSelectedExcipientId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-100 placeholder-slate-500 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sky-500 transition-all font-medium select-none"
                  id="excipient-dropdown"
                >
                  {/* Standard Groupings */}
                  {filteredExcipients.filter(e => !e.id.startsWith('custom')).length > 0 && (
                    <optgroup label="Core Reference Database" className="bg-slate-950 text-slate-400 font-normal">
                      {filteredExcipients.filter(e => !e.id.startsWith('custom')).map(exc => (
                        <option key={exc.id} value={exc.id} className="bg-slate-900 text-slate-100 font-sans">
                          {exc.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  
                  {/* Custom/AI Generated Groupings */}
                  {filteredExcipients.some(e => e.id.startsWith('custom')) && (
                    <optgroup label="AI Predicted Specialty Models" className="bg-slate-950 text-sky-400 font-normal">
                      {filteredExcipients.filter(e => e.id.startsWith('custom')).map(exc => (
                        <option key={exc.id} value={exc.id} className="bg-slate-900 text-slate-100 font-sans">
                          ✨ {exc.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Direct Instant AI modeling option for anything they type! */}
              {searchQuery.trim().length > 1 && !excipients.some(e => e.name.toLowerCase() === searchQuery.toLowerCase().trim()) && (
                <div className="p-2.5 bg-sky-950/20 border border-sky-900/60 rounded-lg space-y-1.5" id="direct-ai-modeling-helper">
                  <p className="text-[10px] text-slate-400 leading-snug">
                    Not in core database? Generate predictive GAB constants & water activity curves for <strong className="text-sky-400 font-medium">"{searchQuery}"</strong> instantly!
                  </p>
                  <button
                    type="button"
                    onClick={() => handlePredictExcipient(undefined, searchQuery)}
                    disabled={isPredicting}
                    className="w-full cursor-pointer bg-sky-650 hover:bg-sky-550 text-white py-1 text-2xs font-bold rounded flex items-center justify-center gap-1 transition"
                  >
                    <Sparkles className="w-3 h-3 animate-pulse" />
                    {isPredicting ? "Analyzing structure..." : `Model "${searchQuery}" with AI`}
                  </button>
                </div>
              )}
            </div>          </div>
                 {/* Quick Summary of Choice */}
            <div className="bg-slate-900/60 rounded-lg p-3.5 border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-[10px] font-semibold text-slate-300 rounded">
                  {currentExcipient.category}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  currentExcipient.hygroscopicityClass === 'Non-hygroscopic' ? 'bg-slate-800 border border-slate-700 text-slate-400' :
                  currentExcipient.hygroscopicityClass === 'Slightly hygroscopic' ? 'bg-indigo-950 border border-indigo-900 text-indigo-300' :
                  currentExcipient.hygroscopicityClass === 'Moderately hygroscopic' ? 'bg-emerald-950 border border-emerald-900 text-emerald-300' :
                  'bg-red-950 border border-red-900 text-red-300'
                }`}>
                  {currentExcipient.hygroscopicityClass}
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed text-xs">
                {currentExcipient.description}
              </p>

              {/* Dynamic Moisture Trend indicators relative to 25°C baseline */}
              <div className="pt-2 border-t border-slate-800 space-y-1.5" id="thermo-trends-indicator">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <span>Temp Trend (vs 25°C Baseline)</span>
                  <span className="font-mono text-sky-400 font-normal lowercase">at {currentInspectRH}% RH</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  {/* Heating 40°C */}
                  <div className="bg-slate-950/80 border border-slate-800/80 rounded p-2 flex flex-col justify-start items-start">
                    <span className="text-[9px] text-slate-500 font-semibold uppercase font-mono">Heat (40°C)</span>
                    <div className="flex items-center gap-0.5 font-bold text-rose-400 mt-1">
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      <span>{changePct40 >= 0 ? '+' : ''}{changePct40.toFixed(1)}%</span>
                    </div>
                    <span className="text-[8px] text-slate-500 mt-0.5 font-mono">
                      {emcUnit === 'percent' ? `${emcAt40.toFixed(2)}%` : `${(emcAt40/100).toFixed(4)}`}
                    </span>
                  </div>
                  
                  {/* Cooling 8°C */}
                  <div className="bg-slate-950/80 border border-slate-800/80 rounded p-2 flex flex-col justify-start items-start">
                    <span className="text-[9px] text-slate-500 font-semibold uppercase font-mono">Cold (8°C)</span>
                    <div className="flex items-center gap-0.5 font-bold text-emerald-400 mt-1">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>+{changePct8.toFixed(1)}%</span>
                    </div>
                    <span className="text-[8px] text-slate-500 mt-0.5 font-mono">
                      {emcUnit === 'percent' ? `${emcAt8.toFixed(2)}%` : `${(emcAt8/100).toFixed(4)}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Isotherm Variables Settings */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5" id="variables-card">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-3 flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-emerald-400" />
              Dynamic Parameters
            </h2>

            {/* Selected Temperatures Toggles */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <label className="text-xs text-slate-400 font-medium">
                  Plot Temperatures
                </label>
                <div className="flex gap-1.5 text-[9px] font-mono">
                  <button 
                    type="button"
                    onClick={selectAllTemps}
                    className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-sky-400 hover:text-sky-300 hover:border-slate-700 cursor-pointer transition font-semibold"
                    id="select-all-temps-btn"
                  >
                    Select All
                  </button>
                  <button 
                    type="button"
                    onClick={clearAllTemps}
                    className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-300 hover:border-slate-700 cursor-pointer transition font-semibold"
                    id="clear-all-temps-btn"
                  >
                    Clear (25°C)
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {AVAILABLE_TEMPERATURES.map(temp => {
                  const isActive = selectedTemps.includes(temp);
                  return (
                    <button
                      key={temp}
                      onClick={() => toggleTemp(temp)}
                      style={{ 
                        backgroundColor: isActive ? `${TEMPERATURE_COLORS[temp]}15` : undefined,
                        borderColor: isActive ? TEMPERATURE_COLORS[temp] : '#334155',
                        color: isActive ? TEMPERATURE_COLORS[temp] : '#94a3b8'
                      }}
                      className="border text-center rounded-lg py-1.5 text-xs font-semibold cursor-pointer transition-all hover:bg-slate-800 hover:border-slate-500"
                    >
                      {temp}°C
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Core Target RH Slider */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Equilibrium Inspection</span>
                <span className="font-bold text-sky-400 font-mono bg-sky-950/50 px-2 py-0.5 rounded border border-sky-900/50 flex items-center gap-1.5">
                  <span>{targetRH}% RH</span>
                  <span className="text-slate-500">|</span>
                  <span className="text-emerald-400">{(targetRH/100).toFixed(2)} a<sub>w</sub></span>
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="95"
                step="1"
                value={targetRH}
                onChange={(e) => setTargetRH(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0% RH (Dry)</span>
                <span>45%</span>
                <span>75% (FDA Zone IVb)</span>
                <span>95% RH (Extreme)</span>
              </div>
            </div>
          </div>

          {/* Specialty Custom AI Predictor Form */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4" id="ai-predictor-card">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              AI Sorption Predictor
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Submit a specialty excipient or polymer. Gemini AI will analyze its chemical structure, estimate thermodynamic GAB parameters, and add its dynamic curves to the library.
            </p>

            <form onSubmit={handlePredictExcipient} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-medium">Excipient / Material Name</label>
                <input
                  type="text"
                  placeholder="e.g. Crospovidone, Xanthan Gum, HPC"
                  required
                  value={customNameInput}
                  onChange={(e) => setCustomNameInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 text-slate-100 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-sky-500/50 transition-all placeholder:text-slate-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-medium">Chemical Group / Form (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. highly crosslinked carboxymethyl polymer"
                  value={customStructureInput}
                  onChange={(e) => setCustomStructureInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 text-slate-100 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-sky-500/50 transition-all placeholder:text-slate-600"
                />
              </div>

              <button
                type="submit"
                disabled={isPredicting}
                className="w-full cursor-pointer bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white py-2 px-4 rounded-lg font-bold text-xs shadow-md shadow-sky-950/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isPredicting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Modeling GAB Equilibrium...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Predict & Integrate Material Isotherm
                  </>
                )}
              </button>
            </form>

            {predictionMessage && (
              <div className={`p-2.5 rounded-lg border text-xs leading-relaxed ${
                predictionMessage.type === 'success' 
                  ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300' 
                  : 'bg-red-950/50 border-red-800 text-red-300'
              }`}>
                {predictionMessage.type === 'success' ? '✔' : '❌'} {predictionMessage.text}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: Interactive Chart, Details, & Analysis */}
        <section className="col-span-1 lg:col-span-8 space-y-6" id="dashboard-workspace">
          
          {/* Header Workspace Tabs */}
          <div className="flex border-b border-slate-800 pb-1 items-center justify-between">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`pb-3 text-sm font-bold tracking-wide uppercase transition-all border-b-2 px-1 cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'dashboard'
                    ? 'border-sky-500 text-sky-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Single Material Dashboard
              </button>
              <button
                onClick={() => setActiveTab('comparison')}
                className={`pb-3 text-sm font-bold tracking-wide uppercase transition-all border-b-2 px-1 cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'comparison'
                    ? 'border-sky-500 text-sky-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayersCompareIcon className="w-4 h-4" />
                Batch Comparison Mode
              </button>
              <button
                onClick={() => setActiveTab('formulation')}
                className={`pb-3 text-sm font-bold tracking-wide uppercase transition-all border-b-2 px-1 cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'formulation'
                    ? 'border-sky-500 text-sky-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FlaskConical className="w-4 h-4 text-pink-400" />
                Formulation Composition Tool
              </button>
            </div>
          </div>

          {activeTab === 'dashboard' && (
            <>
              {/* Main Chart Section */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4" id="isotherm-chart-container">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-800 pb-3.5">
                  <div>
                    <h2 className="text-md font-bold text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-sky-400" />
                      Thermodynamic Isotherm Plot
                    </h2>
                    <p className="text-xs text-slate-400">
                      Select, hover or move your cursor inside the chart area to inspect exact values.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2.5 items-center">
                    {/* DVS Calibration Mode Toggle */}
                    <label className="text-xs text-slate-350 bg-slate-900 border border-slate-800 hover:border-slate-700 px-2.5 py-1 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all select-none font-semibold" title="Compare experimental DVS measurements against thermodynamic predictive simulations">
                      <input
                        type="checkbox"
                        checked={showCalibrationMode}
                        onChange={(e) => setShowCalibrationMode(e.target.checked)}
                        className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-705 accent-pink-500 cursor-pointer"
                      />
                      <span className={showCalibrationMode ? "text-pink-400 font-bold" : ""}>🔬 Calibration Mode</span>
                    </label>

                    {/* 95% CI Bands Toggle */}
                    <label className="text-xs text-slate-350 bg-slate-900 border border-slate-800 hover:border-slate-700 px-2.5 py-1 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all select-none font-semibold">
                      <input
                        type="checkbox"
                        checked={showErrorBands}
                        onChange={(e) => setShowErrorBands(e.target.checked)}
                        className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-700 accent-sky-500 cursor-pointer"
                      />
                      <span>95% CI Bands</span>
                    </label>

                    {/* Sensitivity Overlay Toggle */}
                    <label className="text-xs text-slate-350 bg-slate-900 border border-slate-800 hover:border-slate-700 px-2.5 py-1 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all select-none font-semibold" title="Show +/- 10% shift in the GAB C adsorption energy parameter constant">
                      <input
                        type="checkbox"
                        checked={showSensitivity}
                    onChange={(e) => setShowSensitivity(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-700 accent-purple-550 cursor-pointer"
                  />
                  <span className={showSensitivity ? "text-purple-400" : ""}>±10% GAB C Sensitivity</span>
                </label>

                {/* Piecewise Linear Trendlines Toggle */}
                <label className="text-xs text-slate-350 bg-slate-900 border border-slate-800 hover:border-slate-700 px-2.5 py-1 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all select-none font-semibold" title="Show piecewise linear slopes across major humidity zones (0-30%, 30-70%, 70-95%)">
                  <input
                    type="checkbox"
                    checked={showTrendLines}
                    onChange={(e) => setShowTrendLines(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-700 accent-emerald-555 cursor-pointer"
                  />
                  <span className={showTrendLines ? "text-emerald-400" : ""}>Humidity Trendlines</span>
                </label>

                {/* Heatmap Overlay Toggle */}
                <button
                  type="button"
                  onClick={() => setShowHeatmap(!showHeatmap)}
                  className={`text-xs border px-2.5 py-1 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
                    showHeatmap 
                      ? 'bg-amber-950/40 border-amber-500 text-amber-400 font-bold shadow-md shadow-amber-950/20' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                  title="Toggle Heatmap Overlay representing Sorption free energy distribution"
                  id="heatmap-toggle-btn"
                >
                  <Flame className={`w-3.5 h-3.5 ${showHeatmap ? 'text-amber-500 animate-pulse' : 'text-slate-500'}`} />
                  <span>Sorption Heat</span>
                </button>

                {/* EMC Unit Toggle */}
                <div className="bg-slate-900 border border-slate-800 p-0.5 rounded-lg flex text-[10px] font-semibold font-mono" id="unit-toggle-container">
                  <button
                    type="button"
                    onClick={() => setEmcUnit('percent')}
                    className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                      emcUnit === 'percent'
                        ? 'bg-sky-650 text-white font-bold shadow-sm'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                    title="Display Equilibrium Moisture Content as dry-weight percentage"
                  >
                    % w/w
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmcUnit('massFraction')}
                    className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                      emcUnit === 'massFraction'
                        ? 'bg-sky-650 text-white font-bold shadow-sm'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                    title="Display Equilibrium Moisture Content as dry mass fraction (g/g)"
                  >
                    g/g
                  </button>
                </div>

                {/* Unified Exporters Action Group */}
                <div className="flex bg-slate-900 border border-slate-800 p-0.5 rounded-lg font-mono text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={handleDownloadCSV}
                    className="px-2 py-1 rounded-md text-sky-400 hover:text-sky-300 hover:bg-slate-800 transition-all flex items-center gap-1 cursor-pointer"
                    title="Download plotted raw coordinates as Lab CSV spreadsheet"
                    id="download-csv-btn"
                  >
                    <Download className="w-3 h-3" />
                    <span>CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="px-2 py-1 rounded-md text-indigo-400 hover:text-indigo-300 hover:bg-slate-800 transition-all flex items-center gap-1 cursor-pointer border-l border-slate-800"
                    title="Export styled structural GAB reports to MS Excel"
                    id="download-excel-btn"
                  >
                    <FileSpreadsheet className="w-3 h-3" />
                    <span>Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className="px-2 py-1 rounded-md text-purple-400 hover:text-purple-300 hover:bg-slate-800 transition-all flex items-center gap-1 cursor-pointer border-l border-slate-800"
                    title="Save print-quality vector PDF analysis reports"
                    id="download-pdf-btn"
                  >
                    <Printer className="w-3 h-3" />
                    <span>PDF</span>
                  </button>
                </div>

                {/* Selected Excipient Badge */}
                <div className="text-xs bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg text-emerald-400 font-mono">
                  Scale: {emcUnit === 'percent' ? `${emcCeiling.toFixed(1)}%` : `${(emcCeiling/100).toFixed(3)}g/g`}
                </div>
              </div>
            </div>

            {/* The SVG Isotherm Chart */}
            <div className="relative bg-slate-950/80 border border-slate-900 rounded-lg overflow-hidden py-2 px-1">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-auto cursor-crosshair text-slate-400"
                onMouseMove={handleSvgMouseMove}
                onMouseLeave={handleSvgMouseLeave}
                id="isotherm-svg"
              >
                {/* Sorption Heat Heatmap Layer */}
                {showHeatmap && (
                  <g id="heatmap-gradient-layer">
                    {Array.from({ length: 16 }).map((_, r) => {
                      const cellHeight = chartHeight / 16;
                      const y = axisMarginTop + r * cellHeight;
                      
                      return Array.from({ length: 24 }).map((__, c) => {
                        const cellWidth = chartWidth / 24;
                        const x = axisMarginLeft + c * cellWidth;
                        
                        // Calculate corresponding RH and EMC for this cell center
                        const rhVal = ((c + 0.5) / 24) * 95;
                        const emcVal = ((16 - r - 0.5) / 16) * emcCeiling;
                        
                        // Calculate sorption heat excess
                        const heat = calculateSorptionHeat(emcVal, currentExcipient.standardGAB);
                        
                        // Normalize relative to maximum possible sorption heat
                        const maxHeat = Math.max(10, currentExcipient.standardGAB.delHc + currentExcipient.standardGAB.delHk);
                        const ratio = Math.max(0, Math.min(1, heat / maxHeat));
                        
                        // Color mapping: deep slate blue to glowing amber/red excess heat
                        const red = Math.floor(10 + 225 * ratio);
                        const green = Math.floor(18 + 92 * ratio);
                        const blue = Math.floor(36 - 16 * ratio);
                        const rgbColor = `rgb(${red}, ${green}, ${blue})`;
                        
                        return (
                          <rect
                            key={`heat_tile_${r}_${c}`}
                            x={x}
                            y={y}
                            width={cellWidth + 0.5} // slightly overlap to avoid subpixel gaps
                            height={cellHeight + 0.5}
                            fill={rgbColor}
                            opacity={0.18 + 0.45 * ratio} // stronger heat excess glows brighter
                          />
                        );
                      });
                    })}
                  </g>
                )}

                {/* Background Grid */}
                {Array.from({ length: 11 }).map((_, i) => {
                  const rh = i * 10;
                  if (rh > 95) return null;
                  const x = getX(rh);
                  return (
                    <g key={`x_grid_${i}`}>
                      <line 
                        x1={x} y1={getY(0)} 
                        x2={x} y2={getY(emcCeiling)} 
                        stroke="#1e293b" 
                        strokeWidth="1" 
                        strokeDasharray="2,3" 
                        opacity={showHeatmap ? 0.35 : 1}
                      />
                      <text 
                        x={x} y={svgHeight - 15} 
                        textAnchor="middle" 
                        className="text-[10px] font-mono fill-slate-500 font-semibold"
                      >
                        {rh}%
                      </text>
                    </g>
                  );
                })}
                
                {/* X Axis Title with Water Activity explicitly combined */}
                <text 
                  x={axisMarginLeft + chartWidth / 2} 
                  y={svgHeight - 2} 
                  textAnchor="middle" 
                  className="text-[10px] fill-slate-400 font-bold uppercase tracking-wider"
                >
                  Relative Humidity (% RH) / Water Activity (a<sub>w</sub>)
                </text>

                {/* Y Axis Grid Lines & Labels */}
                {Array.from({ length: 5 }).map((_, i) => {
                  const emcValue = (emcCeiling / 4) * i;
                  const y = getY(emcValue);
                  return (
                    <g key={`y_grid_${i}`}>
                      <line 
                        x1={getX(0)} y1={y} 
                        x2={getX(95)} y2={y} 
                        stroke="#1e293b" 
                        strokeWidth="1" 
                        strokeDasharray="2,3" 
                        opacity={showHeatmap ? 0.35 : 1}
                      />
                      <text 
                        x={axisMarginLeft - 8} y={y + 3} 
                        textAnchor="end" 
                        className="text-[10px] font-mono fill-slate-500 font-semibold"
                      >
                        {emcUnit === 'percent' ? `${emcValue.toFixed(1)}%` : `${(emcValue / 100).toFixed(3)}`}
                      </text>
                    </g>
                  );
                })}

                {/* Y Axis Title */}
                <text 
                  transform={`rotate(-90 ${12} ${axisMarginTop + chartHeight/2})`}
                  x={12} 
                  y={axisMarginTop + chartHeight / 2} 
                  textAnchor="middle" 
                  className="text-[10px] fill-slate-400 font-bold uppercase tracking-wider"
                >
                  Equilibrium Moisture Content (EMC, {emcUnit === 'percent' ? '% w/w' : 'g/g'})
                </text>

                {/* Critical RH Threshold representation */}
                {currentExcipient.criticalRH && currentExcipient.criticalRH <= 95 && (
                  <g>
                    <line
                      x1={getX(currentExcipient.criticalRH)}
                      y1={getY(0)}
                      x2={getX(currentExcipient.criticalRH)}
                      y2={getY(emcCeiling)}
                      stroke="#f59e0b"
                      strokeWidth="1.5"
                      strokeDasharray="4,4"
                      opacity="0.65"
                    />
                    <text
                      x={getX(currentExcipient.criticalRH) - 5}
                      y={getY(emcCeiling) + 20}
                      textAnchor="end"
                      transform={`rotate(-90 ${getX(currentExcipient.criticalRH) - 5} ${getY(emcCeiling) + 20})`}
                      className="text-[9px] fill-amber-500 font-bold tracking-tight bg-slate-900"
                    >
                      Critical Threshold: {currentExcipient.criticalRH}% RH / {(currentExcipient.criticalRH/100).toFixed(2)} aw
                    </text>
                  </g>
                )}

                {/* 95% Confidence Interval Error Bands (DVS Typical Experimental Variance) */}
                {showErrorBands && activeCurves.map(curve => {
                  const upperPoints = curve.points.map(p => {
                    const upperEMC = p.EMC * 1.05 + 0.15;
                    return `${getX(p.RH)},${getY(upperEMC)}`;
                  });
                  const lowerPoints = [...curve.points].reverse().map(p => {
                    const lowerEMC = Math.max(0, p.EMC * 0.95 - 0.15);
                    return `${getX(p.RH)},${getY(lowerEMC)}`;
                  });
                  const bandPointsString = [...upperPoints, ...lowerPoints].join(' ');
                  
                  const isHighlighted = highlightedTemp === null || curve.temperature === highlightedTemp;
                  const opacityVal = isHighlighted ? "0.08" : "0.015";

                  return (
                    <motion.polygon
                      key={`band_${curve.temperature}`}
                      fill={TEMPERATURE_COLORS[curve.temperature]}
                      opacity={opacityVal}
                      animate={{ points: bandPointsString }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                      className="pointer-events-none transition-all duration-300"
                    />
                  );
                })}

                {/* GAB C-Constant Sensitivity Overlay */}
                {showSensitivity && sensTemp !== undefined && (
                  <g id="sensitivity-overlay" className="pointer-events-none">
                    {/* Shaded Area between curves */}
                    <polygon
                      points={sensAreaPointsStr}
                      fill={TEMPERATURE_COLORS[sensTemp]}
                      opacity="0.16"
                    />
                    {/* Upper curve (+10% C) */}
                    <polyline
                      points={sensPlusPointsStr}
                      fill="none"
                      stroke={TEMPERATURE_COLORS[sensTemp]}
                      strokeWidth="1.5"
                      strokeDasharray="4,2"
                      opacity="0.7"
                    />
                    {/* Lower curve (-10% C) */}
                    <polyline
                      points={sensMinusPointsStr}
                      fill="none"
                      stroke={TEMPERATURE_COLORS[sensTemp]}
                      strokeWidth="1.5"
                      strokeDasharray="4,2"
                      opacity="0.7"
                    />
                    
                    {/* Text Callouts near the middle (45% RH) */}
                    <text
                      x={getX(45)}
                      y={getY(calculateGAB(0.45, sensTemp, { ...currentExcipient.standardGAB, C25: currentExcipient.standardGAB.C25 * 1.10 })) - 6}
                      className="text-[9px] font-mono fill-purple-300 font-bold"
                    >
                      +10% Monolayer Energy (C={ (currentExcipient.standardGAB.C25 * 1.1).toFixed(1) })
                    </text>
                    <text
                      x={getX(45)}
                      y={getY(calculateGAB(0.45, sensTemp, { ...currentExcipient.standardGAB, C25: currentExcipient.standardGAB.C25 * 0.90 })) + 10}
                      className="text-[9px] font-mono fill-pink-300 font-bold"
                    >
                      -10% Monolayer Energy (C={ (currentExcipient.standardGAB.C25 * 0.9).toFixed(1) })
                    </text>
                  </g>
                )}

                {/* Piecewise Linear Humidity Zone Trend Lines */}
                {showTrendLines && trendLinesData.map(line => {
                  const isHighlighted = highlightedTemp === null || line.temp === highlightedTemp;
                  if (!isHighlighted) return null;

                  return (
                    <g key={`trends_${line.temp}`} id={`trends-layer-${line.temp}`}>
                      {/* Piecewise linear path */}
                      <polyline
                        points={line.pointsStr}
                        fill="none"
                        stroke={line.color}
                        strokeWidth="1.5"
                        strokeDasharray="5,3"
                        opacity="0.8"
                      />
                      {/* Node circles at boundary points */}
                      {line.pts.map((pt, idx) => (
                        <g key={`pt_${idx}`}>
                          <circle
                            cx={getX(pt.rh)}
                            cy={getY(pt.emc)}
                            r="3"
                            fill="#0b0f19"
                            stroke={line.color}
                            strokeWidth="1.5"
                          />
                          {pt.rh > 0 && (
                            <text
                              x={getX(pt.rh)}
                              y={getY(pt.emc) - 8}
                              textAnchor="middle"
                              className="text-[8px] font-mono fill-slate-300 font-extrabold bg-slate-950 px-0.5 rounded"
                            >
                              {emcUnit === 'percent' ? `${pt.emc.toFixed(1)}%` : `${(pt.emc/100).toFixed(3)}`}
                            </text>
                          )}
                        </g>
                      ))}
                    </g>
                  );
                })}

                {/* Draw Solid Curve Lines */}
                {renderCurvesPaths.map(curve => {
                  const isHighlighted = highlightedTemp === null || curve.temp === highlightedTemp;
                  const strokeWidthVal = isHighlighted ? (highlightedTemp === curve.temp ? "4.5" : "2.5") : "1.0";
                  const opacityVal = isHighlighted ? "1.0" : "0.15";

                  return (
                    <motion.polyline
                      key={`line_${curve.temp}`}
                      fill="none"
                      stroke={curve.color}
                      strokeWidth={strokeWidthVal}
                      opacity={opacityVal}
                      animate={{ points: curve.pointsString }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                      className="transition-all duration-300"
                    />
                  );
                })}

                {/* Cursor Inspection Line (vertical) */}
                {currentInspectRH !== null && (
                  <g>
                    <line
                      x1={getX(currentInspectRH)}
                      y1={getY(0)}
                      x2={getX(currentInspectRH)}
                      y2={getY(emcCeiling)}
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                      opacity="0.8"
                    />
                    {/* Small intersecting nodes for each isotherm temperature */}
                    {listEMCsAtInspection.map(curveData => {
                      const xNode = getX(currentInspectRH);
                      const yNode = getY(curveData.emc);
                      return (
                        <circle
                          key={`node_${curveData.temp}`}
                          cx={xNode}
                          cy={yNode}
                          r="4"
                          fill="#0f172a"
                          stroke={TEMPERATURE_COLORS[curveData.temp]}
                          strokeWidth="2"
                        />
                      );
                    })}
                  </g>
                )}

                {/* Experimental DVS Calibration Point overlay */}
                {showCalibrationMode && (
                  <g id="calibration-target-overlay">
                    {(() => {
                      const predictedEMC = calculateGAB(calibrationRH / 100, calibrationTemp, currentExcipient.standardGAB);
                      const predX = getX(calibrationRH);
                      const predY = getY(predictedEMC);
                      const expX = getX(calibrationRH);
                      const expY = getY(calibrationEMC);
                      
                      return (
                        <g>
                          {/* Error distance line */}
                          <line
                            x1={predX}
                            y1={predY}
                            x2={expX}
                            y2={expY}
                            stroke="#ec4899"
                            strokeWidth="1.5"
                            strokeDasharray="3,3"
                          />
                          {/* Predicted base point outer circle */}
                          <circle
                            cx={predX}
                            cy={predY}
                            r="5"
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="2"
                          />
                          {/* Pulsing glow around experimental point */}
                          <circle
                            cx={expX}
                            cy={expY}
                            r="9"
                            fill="#ec4899"
                            opacity="0.3"
                            className="animate-pulse"
                          />
                          {/* Active calibration flag shape (diamond/star) */}
                          <path
                            d={`M ${expX} ${expY - 6} L ${expX + 6} ${expY} L ${expX} ${expY + 6} L ${expX - 6} ${expY} Z`}
                            fill="#ec4899"
                            stroke="#ffffff"
                            strokeWidth="1.5"
                          />
                          {/* Mini dynamic label */}
                          <text
                            x={expX + 10}
                            y={expY + 3}
                            className="text-[8px] font-mono font-black fill-pink-400 bg-slate-950 px-1 py-0.5 rounded"
                          >
                            DVS: {calibrationEMC.toFixed(2)}%
                          </text>
                        </g>
                      );
                    })()}
                  </g>
                )}

                {/* Vector Curve Hover Tooltips */}
                {isHovered && hoveredRH !== null && mousePos && (
                  (() => {
                    let closestCurve: any = null;
                    let minDistance = Infinity;

                    activeCurves.forEach(curve => {
                      const pt = curve.points.find(p => p.RH === hoveredRH);
                      if (pt) {
                        const cy = getY(pt.EMC);
                        const dist = Math.abs(mousePos.y - cy);
                        if (dist < minDistance) {
                          minDistance = dist;
                          closestCurve = {
                            temp: curve.temperature,
                            emc: pt.EMC,
                            y: cy,
                            color: TEMPERATURE_COLORS[curve.temperature]
                          };
                        }
                      }
                    });

                    // Only trigger if hover is reasonably near a curve (within 35 pixels)
                    if (closestCurve && minDistance < 35) {
                      const tooltipX = getX(hoveredRH);
                      const tooltipY = closestCurve.y;
                      const isRightSide = hoveredRH > 50;
                      const boxWidth = 140;
                      const boxHeight = 54;
                      const boxX = isRightSide ? tooltipX - boxWidth - 10 : tooltipX + 10;
                      const boxY = Math.max(axisMarginTop, Math.min(svgHeight - axisMarginBottom - boxHeight, tooltipY - boxHeight / 2));

                      return (
                        <g id="curve-hover-tooltip" className="pointer-events-none">
                          {/* Focal spot indicator */}
                          <circle cx={tooltipX} cy={tooltipY} r="6" fill={closestCurve.color} opacity="0.4" className="animate-ping" />
                          <circle cx={tooltipX} cy={tooltipY} r="4" fill={closestCurve.color} stroke="#ffffff" strokeWidth="1.5" />
                          
                          {/* Tooltip dialog bubble */}
                          <rect
                            x={boxX}
                            y={boxY}
                            width={boxWidth}
                            height={boxHeight}
                            rx="6"
                            fill="#0b0f19"
                            stroke={closestCurve.color}
                            strokeWidth="1.5"
                            opacity="0.95"
                          />
                          <text x={boxX + 8} y={boxY + 15} className="text-[10px] font-sans font-bold fill-white">
                            {closestCurve.temp}°C Isotherm
                          </text>
                          <text x={boxX + 8} y={boxY + 29} className="text-[9px] font-mono fill-slate-400">
                            RH: {hoveredRH}% RH
                          </text>
                          <text x={boxX + 8} y={boxY + 43} className="text-[10px] font-mono font-bold fill-sky-300">
                            EMC: {emcUnit === 'percent' ? `${closestCurve.emc.toFixed(2)} %` : `${(closestCurve.emc / 100).toFixed(4)} g/g`}
                          </text>
                        </g>
                      );
                    }
                    return null;
                  })()
                )}
              </svg>

              {/* Dynamic Floating Coordinate Hub */}
              <div className="absolute top-3 right-3 bg-slate-950/95 border border-slate-800 rounded-lg p-3 space-y-2 shadow-2xl max-w-[210px] text-xs">
                <div className="flex flex-col border-b border-slate-800 pb-1.5 gap-1">
                  <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider">Analysis Coordinate:</span>
                  <div className="flex justify-between items-center bg-sky-950/40 text-sky-400 px-1.5 py-0.5 rounded border border-sky-900/60 font-mono font-bold text-[11px]">
                    <span>{currentInspectRH}% RH</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-emerald-400">{(currentInspectRH/100).toFixed(2)} a<sub>w</sub></span>
                  </div>
                </div>
                <div className="space-y-2">
                  {listEMCsAtInspection.map(({ temp, emc }) => {
                    const localSorptionHeat = calculateSorptionHeat(emc, currentExcipient.standardGAB);
                    return (
                      <div key={`hud_row_${temp}`} className="flex flex-col font-mono text-[10px] bg-slate-900/30 p-1 border border-slate-905 rounded">
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TEMPERATURE_COLORS[temp] }} />
                            <span className="text-slate-400">{temp}°C Isotherm:</span>
                          </div>
                          <span className="font-bold text-slate-200">
                            {emcUnit === 'percent' ? `${emc.toFixed(2)} % w/w` : `${(emc / 100).toFixed(4)} g/g`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[8px] text-amber-500 mt-0.5">
                          <span className="flex items-center gap-0.5">
                            <Flame className="w-2 h-2" /> 
                            Sorption Heat (Q<sub>st</sub> excess)
                          </span>
                          <span className="font-bold">{localSorptionHeat.toFixed(1)} kJ/mol</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {hoveredRH !== null && (
                  <p className="text-[9px] text-sky-400 text-center pt-0.5 font-sans italic">
                    Mouse Live Tracking Mode
                  </p>
                )}
              </div>
            </div>

            {/* Fast Temperature Color Legend with interactive click highlight */}
            <div className="flex flex-wrap justify-center gap-4 bg-slate-900/45 border border-slate-900 rounded-lg p-2.5 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-medium">Isotherm Curves Representation</span>
                <span className="text-[10px] text-slate-505">(Click a temperature tag to focus/dim other curves):</span>
              </div>
              <div className="flex gap-2.5 flex-wrap">
                {selectedTemps.map(temp => {
                  const isHighlighted = highlightedTemp === temp;
                  const hasActiveHighlight = highlightedTemp !== null;
                  
                  return (
                    <button
                      key={`legend_${temp}`}
                      onClick={() => handleLegendClick(temp)}
                      className={`flex items-center gap-1.5 font-semibold font-mono px-2 py-0.5 rounded border transition-all cursor-pointer select-none text-[11px] h-6 ${
                        isHighlighted
                          ? 'bg-sky-505/10 border-sky-450 text-sky-300 shadow-md ring-1 ring-sky-400/40 font-bold scale-[1.02]'
                          : hasActiveHighlight
                            ? 'opacity-25 border-slate-800 text-slate-500 hover:opacity-50'
                            : 'border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white bg-slate-900/30'
                      }`}
                      title="Focus this specific isotherm curve and dim other ranges"
                    >
                      <span className="w-3 h-1.5 rounded transition-transform duration-300" style={{ backgroundColor: TEMPERATURE_COLORS[temp] }} />
                      <span>{temp}°C Isotherm</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Collapsible DVS Empirical Calibration Card */}
          {showCalibrationMode && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4 animate-in fade-in duration-300" id="calibration-controls-card">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-pink-500"></span>
                  </span>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    Experimental DVS Calibration Bench
                  </h2>
                </div>
                <span className="text-[10px] bg-pink-955/10 border border-pink-500/20 px-2 py-0.5 rounded text-pink-400 font-mono font-semibold">
                  Sorption Fitting Deviance
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                {/* Inputs */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-mono uppercase block font-semibold">DVS Run Temp:</label>
                      <select
                        value={calibrationTemp}
                        onChange={(e) => setCalibrationTemp(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-pink-550/50 focus:border-pink-500 outline-none font-semibold"
                      >
                        {AVAILABLE_TEMPERATURES.map(t => (
                          <option key={t} value={t}>{t}°C Temperature</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-mono uppercase block font-semibold">Observed RH:</label>
                      <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 focus-within:border-pink-500">
                        <input
                          type="number"
                          min="0"
                          max="95"
                          value={calibrationRH}
                          onChange={(e) => setCalibrationRH(Math.max(0, Math.min(95, Number(e.target.value))))}
                          className="w-full bg-transparent text-slate-105 text-xs focus:outline-none font-bold"
                        />
                        <span className="text-slate-500 text-[10px] font-mono select-none">%RH</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] text-slate-500 font-mono uppercase font-semibold">Experimental RH Slider:</label>
                      <span className="text-xs font-bold text-pink-400 font-mono">{calibrationRH}% RH</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="95"
                      value={calibrationRH}
                      onChange={(e) => setCalibrationRH(Number(e.target.value))}
                      className="w-full h-1 bg-slate-850 rounded appearance-none cursor-pointer accent-pink-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-mono uppercase block font-semibold">Experimental Sorption EMC:</label>
                    <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 focus-within:border-pink-500">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={calibrationEMC}
                        onChange={(e) => setCalibrationEMC(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-transparent text-slate-101 text-xs focus:outline-none font-bold font-mono"
                      />
                      <span className="text-slate-505 text-[10px] font-mono select-none">
                        {emcUnit === 'percent' ? '% w/w' : 'g/g'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 italic pt-0.5">
                      Input the gravimetric moisture water uptake experimental point to evaluate deviance.
                    </p>
                  </div>
                </div>

                {/* Calculations & Results */}
                {(() => {
                  const pred = calculateGAB(calibrationRH / 100, calibrationTemp, currentExcipient.standardGAB);
                  const diffVal = Math.abs(calibrationEMC - pred);
                  const pctErr = pred > 0 ? (diffVal / pred) * 100 : 0;
                  
                  let ratingText = "";
                  let ratingColor = "";
                  if (pctErr < 4.0) {
                    ratingText = "Excellent Alignment (<4% Deviation) • Elite GAB Fit";
                    ratingColor = "text-emerald-400 bg-emerald-950/25 border-emerald-900";
                  } else if (pctErr < 12.0) {
                    ratingText = "High Concordance (4%-12% Deviation) • Confident Match";
                    ratingColor = "text-sky-400 bg-sky-950/25 border-sky-900";
                  } else if (pctErr < 20.0) {
                    ratingText = "Moderate Divergence (12%-20% Deviation) • Marginal Fit";
                    ratingColor = "text-amber-400 bg-amber-955/25 border-amber-900";
                  } else {
                    ratingText = "Critical Divergence (>20% Error) • Recalibrate Necessary";
                    ratingColor = "text-pink-400 bg-pink-955/25 border-pink-900/60";
                  }

                  return (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <h3 className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block font-semibold">Fitted Variance Analysis:</h3>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-slate-950 p-2 border border-slate-900 rounded">
                            <span className="text-slate-500 font-mono text-[9px] uppercase block font-semibold">GAB Predictor:</span>
                            <span className="text-xs font-bold font-mono text-emerald-400">
                              {emcUnit === 'percent' ? `${pred.toFixed(3)} %` : `${(pred/100).toFixed(5)} g/g`}
                            </span>
                          </div>

                          <div className="bg-slate-950 p-2 border border-slate-900 rounded">
                            <span className="text-slate-505 font-mono text-[9px] uppercase block font-semibold">User Obs:</span>
                            <span className="text-xs font-bold font-mono text-pink-400">
                              {emcUnit === 'percent' ? `${calibrationEMC.toFixed(3)} %` : `${(calibrationEMC/100).toFixed(5)} g/g`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between items-end">
                          <span className="text-slate-400 text-[11px] font-mono">Relative Fitting Error:</span>
                          <span className="text-sm font-black font-mono text-white leading-none">
                            {pctErr.toFixed(2)}%
                          </span>
                        </div>
                        
                        <div className={`p-2 border rounded text-[11px] font-semibold text-center ${ratingColor}`}>
                          {ratingText}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Detailed Materials GAB Characterization Panel */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5" id="characterization-panel">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-md font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                Physical Model & Characterization
              </h2>
              <span className="text-xs bg-slate-800 border border-slate-700 px-2.5 py-1 rounded text-slate-300 font-medium leading-none">
                GAB Fitting Equation Constants
              </span>
            </div>

            {/* Displaying GAB constants table */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-slate-900 border border-slate-800/80 rounded-lg p-3 text-center space-y-1">
                <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest font-mono">Xm (25°C)</p>
                <p className="text-lg font-black font-mono text-white">{currentExcipient.standardGAB.Xm25.toFixed(3)}</p>
                <p className="text-[10px] text-slate-500 leading-tight">Monolayer moisture capacity (% w/w)</p>
              </div>

              <div className="bg-slate-900 border border-slate-800/80 rounded-lg p-3 text-center space-y-1">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest font-mono">C (25°C)</p>
                <p className="text-lg font-black font-mono text-white">{currentExcipient.standardGAB.C25.toFixed(2)}</p>
                <p className="text-[10px] text-slate-500 leading-tight">Adsorption Energy coefficient</p>
              </div>

              <div className="bg-slate-900 border border-slate-800/80 rounded-lg p-3 text-center space-y-1">
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest font-mono">K (25°C)</p>
                <p className="text-lg font-black font-mono text-white">{currentExcipient.standardGAB.K25.toFixed(3)}</p>
                <p className="text-[10px] text-slate-500 leading-tight">Multilayer correction factor</p>
              </div>

              <div className="bg-slate-900 border border-slate-800/80 rounded-lg p-3 text-center space-y-1">
                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest font-mono">ΔHc (kJ/mol)</p>
                <p className="text-lg font-black font-mono text-white">{currentExcipient.standardGAB.delHc.toFixed(1)}</p>
                <p className="text-[10px] text-slate-500 leading-tight">Monolayer heat sorption excess</p>
              </div>

              <div className="bg-slate-900 border border-slate-800/80 rounded-lg p-3 text-center space-y-1">
                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest font-mono">ΔHk (kJ/mol)</p>
                <p className="text-lg font-black font-mono text-white">{currentExcipient.standardGAB.delHk.toFixed(2)}</p>
                <p className="text-[10px] text-slate-500 leading-tight">Multilayer sorption heat excess</p>
              </div>
            </div>

            {/* Dynamic scientific narratives */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                  Molecular Moisture Mechanism
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900 p-3 rounded-lg border border-slate-800/70">
                  {currentExcipient.molecularRole}
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  Literature & Heat Characteristics
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900 p-3 rounded-lg border border-slate-800/70">
                  {currentExcipient.literatureNotes}
                </p>
              </div>
            </div>

            {/* Warning advisory relative to current value vs critical RH */}
            {targetRH >= currentExcipient.criticalRH && (
              <div className="bg-amber-950/40 border border-amber-800/80 rounded-lg p-3.5 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-amber-400">High Humidity Operational Concern</p>
                  <p className="text-amber-300 leading-relaxed mt-0.5">
                    The requested relative humidity ({targetRH}% RH) meets or exceeds this excipient's Critical Threshold ({currentExcipient.criticalRH}% RH). Compaction flow might deteriorate, water activity ($a_w$) is high, and risk of crystalline transformation (deliquescence or recrystallization) or degradation of moisture-sensitive active ingredients (APIs) increases substantially. Store tightly sealed, preferably below {(currentExcipient.criticalRH - 10)}% RH.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Matrix side-by-side comparative layout */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4 font-sans" id="comparison-matrix">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <LayersCompareIcon className="w-4 h-4 text-sky-400" />
                  Full Excipient Sorption Comparison Matrix
                </h2>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Compare all registered excipients' equilibrium moisture levels at a specific condition.
                </p>
              </div>
              
              {/* Sliders for comparison adjustments */}
              <div className="flex items-center gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-mono uppercase block">Target RH: {compareRH}%</label>
                  <input
                    type="range"
                    min="5"
                    max="95"
                    step="5"
                    value={compareRH}
                    onChange={(e) => setCompareRH(Number(e.target.value))}
                    className="w-24 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-mono uppercase block">Temp: {compareTemp}°C</label>
                  <select
                    value={compareTemp}
                    onChange={(e) => setCompareTemp(Number(e.target.value))}
                    className="bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 rounded text-[10px] px-1 py-0.5 outline-none"
                  >
                    {AVAILABLE_TEMPERATURES.map(t => (
                      <option key={t} value={t}>{t}°C</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-900">
              <table className="w-full text-xs text-left" id="matrix-table">
                <thead className="bg-slate-900 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3 min-w-[150px]">Excipient Material Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-center">Class</th>
                    <th className="py-2.5 px-3 text-center">Critical RH</th>
                    <th className="py-2.5 px-3 text-right text-indigo-400 font-mono">EMC (25°C, 60% RH)</th>
                    <th className="py-2.5 px-3 text-center text-indigo-500 font-mono">a<sub>w</sub> (25°C, 60% RH)</th>
                    <th className="py-2.5 px-3 text-right text-rose-400 font-mono">EMC (40°C, 75% RH)</th>
                    <th className="py-2.5 px-3 text-center text-rose-500 font-mono">a<sub>w</sub> (40°C, 75% RH)</th>
                    <th className="py-2.5 px-3 text-right text-sky-400 font-mono">EMC ({compareTemp}°C, {compareRH}% RH)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/50">
                  {excipients.map(exc => {
                    const emcVal = calculateGAB(compareRH / 100, compareTemp, exc.standardGAB);
                    const emc25_60 = calculateGAB(0.60, 25, exc.standardGAB);
                    const emc40_75 = calculateGAB(0.75, 40, exc.standardGAB);
                    const isSelected = exc.id === selectedExcipientId;
                    return (
                      <tr 
                        key={`matrix_row_${exc.id}`}
                        onClick={() => setSelectedExcipientId(exc.id)}
                        className={`hover:bg-slate-900/60 transition-all cursor-pointer ${
                          isSelected ? 'bg-sky-950/20 text-white font-semibold border-l-2 border-l-sky-500' : 'text-slate-300'
                        }`}
                      >
                        <td className="py-2 px-3 font-medium flex items-center gap-1.5 min-w-[150px]">
                          {exc.id.startsWith('custom') && <span className="text-sky-400" title="AI Predicted Excipient">✨</span>}
                          {exc.name.split(' (')[0]}
                        </td>
                        <td className="py-2 px-3 text-slate-400 text-[11px]">{exc.category}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            exc.hygroscopicityClass === 'Non-hygroscopic' ? 'bg-slate-900 text-slate-500' :
                            exc.hygroscopicityClass === 'Slightly hygroscopic' ? 'bg-indigo-950/40 text-indigo-400' :
                            exc.hygroscopicityClass === 'Moderately hygroscopic' ? 'bg-emerald-950/40 text-emerald-400' :
                            'bg-red-950/40 text-red-400'
                          }`}>
                            {exc.hygroscopicityClass.split(' ')[0]}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-slate-400">{exc.criticalRH}%</td>
                        <td className="py-2 px-3 text-right font-mono text-[11px] text-indigo-300">
                          {emc25_60.toFixed(2)}%
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-[10px] text-indigo-500 font-semibold">
                          0.60
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-[11px] text-rose-300">
                          {emc40_75.toFixed(2)}%
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-[10px] text-rose-500 font-semibold">
                          0.75
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-200">
                          {emcVal.toFixed(3)}% w/w
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          </>
          )}

          {activeTab === 'comparison' && (
            <div className="space-y-6 animate-in fade-in duration-300" id="batch-comparison-view">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5" id="batch-comparison-bench">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-800 pb-3.5">
                  <div>
                    <h2 className="text-md font-bold text-white flex items-center gap-2">
                      <Layers className="w-5 h-5 text-sky-400" />
                      Unified Batch Comparison Bench
                    </h2>
                    <p className="text-xs text-slate-400">
                      Plot up to 3 materials side-by-side at a uniform temperature range to compare moisture uptake patterns.
                    </p>
                  </div>
                  
                  {/* Uniform Temperature Regulator */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-505 uppercase block font-semibold">Regulated Temp:</span>
                    <select
                      value={comparisonTemp}
                      onChange={(e) => setComparisonTemp(Number(e.target.value))}
                      className="bg-slate-900 border border-slate-800 text-slate-200 rounded-lg text-xs px-3 py-1.5 outline-none font-bold"
                    >
                      {AVAILABLE_TEMPERATURES.map(t => (
                        <option key={t} value={t}>{t}°C Room Run</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Materials selectors cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Slot 1 Selection */}
                  <div className="bg-slate-900/40 p-3 border border-slate-800 rounded-lg space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-400 flex-shrink-0" />
                      <span className="text-[10px] font-mono text-slate-405 uppercase font-semibold">Material Slot A (Sky):</span>
                    </div>
                    <select
                      value={comparisonExcipientIds[0] || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setComparisonExcipientIds(prev => [val, prev[1], prev[2]]);
                      }}
                      className="w-full bg-slate-955 border border-slate-800 text-xs rounded px-2.5 py-1.5 outline-none font-bold text-sky-400"
                    >
                      <option value="">-- None Selected --</option>
                      {excipients.map(exc => (
                        <option key={`slotA_${exc.id}`} value={exc.id}>{exc.name.split(' (')[0]}</option>
                      ))}
                    </select>
                  </div>

                  {/* Slot 2 Selection */}
                  <div className="bg-slate-900/40 p-3 border border-slate-800 rounded-lg space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-pink-405 flex-shrink-0" />
                      <span className="text-[10px] font-mono text-slate-405 uppercase font-semibold">Material Slot B (Pink):</span>
                    </div>
                    <select
                      value={comparisonExcipientIds[1] || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setComparisonExcipientIds(prev => [prev[0], val, prev[2]]);
                      }}
                      className="w-full bg-slate-955 border border-slate-800 text-xs rounded px-2.5 py-1.5 outline-none font-bold text-pink-400"
                    >
                      <option value="">-- None Selected --</option>
                      {excipients.map(exc => (
                        <option key={`slotB_${exc.id}`} value={exc.id}>{exc.name.split(' (')[0]}</option>
                      ))}
                    </select>
                  </div>

                  {/* Slot 3 Selection */}
                  <div className="bg-slate-900/40 p-3 border border-slate-800 rounded-lg space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 flex-shrink-0" />
                      <span className="text-[10px] font-mono text-slate-405 uppercase font-semibold">Material Slot C (Emerald):</span>
                    </div>
                    <select
                      value={comparisonExcipientIds[2] || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setComparisonExcipientIds(prev => [prev[0], prev[1], val]);
                      }}
                      className="w-full bg-slate-955 border border-slate-800 text-xs rounded px-2.5 py-1.5 outline-none font-bold text-emerald-400"
                    >
                      <option value="">-- None Selected --</option>
                      {excipients.map(exc => (
                        <option key={`slotC_${exc.id}`} value={exc.id}>{exc.name.split(' (')[0]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {(() => {
                  // Filter out empty selections and look up excipient objects
                  const selectedMatus = comparisonExcipientIds
                    .map(id => excipients.find(e => e.id === id))
                    .filter(Boolean) as Excipient[];

                  if (selectedMatus.length === 0) {
                    return (
                      <div className="border border-slate-800 border-dashed rounded-lg p-12 text-center text-slate-500 font-semibold text-xs">
                        No materials selected. Use the Slot dropdowns above to display custom comparing curves!
                      </div>
                    );
                  }

                  // Calculate dynamic y axis ceiling for comparison
                  const maxComparisonEMC = Math.max(...selectedMatus.map(mat => calculateGAB(0.95, comparisonTemp, mat.standardGAB)));
                  const comparisonCeiling = Math.max(20.0, getAxisCeiling(maxComparisonEMC));

                  // SVG rendering helpers for comparison plot
                  const getCompY = (emc: number) => {
                    const ratio = emc / comparisonCeiling;
                    return (svgHeight - axisMarginBottom) - ratio * chartHeight;
                  };

                  const compColors = ["#38bdf8", "#f43f5e", "#10b981"];

                  // Generate lines details
                  const comparisonCurves = selectedMatus.map((mat, mIdx) => {
                    const pts = [];
                    for (let rh = 0; rh <= 95; rh += 1) {
                      pts.push({
                        RH: rh,
                        EMC: calculateGAB(rh / 100, comparisonTemp, mat.standardGAB)
                      });
                    }
                    const pointsStr = pts.map(p => `${getX(p.RH)},${getCompY(p.EMC)}`).join(" ");

                    return {
                      material: mat,
                      color: compColors[mIdx],
                      points: pts,
                      pointsString: pointsStr
                    };
                  });

                  return (
                    <div className="space-y-6">
                      <div className="relative bg-slate-950/85 border border-slate-900 rounded-lg overflow-hidden py-2 px-1">
                        <svg
                          ref={svgRef}
                          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                          className="w-full h-auto cursor-crosshair text-slate-400"
                          onMouseMove={handleSvgMouseMove}
                          onMouseLeave={handleSvgMouseLeave}
                          id="comparison-svg"
                        >
                          {/* X and Y Grid Lines */}
                          {Array.from({ length: 10 }).map((_, i) => {
                            const rh = i * 10;
                            const x = getX(rh);
                            return (
                              <line key={`comp_grid_x_${i}`} x1={x} y1={getCompY(0)} x2={x} y2={getCompY(comparisonCeiling)} stroke="#1e293b" strokeWidth="1" strokeDasharray="2,3" opacity="0.5" />
                            );
                          })}
                          {Array.from({ length: 5 }).map((_, i) => {
                            const emcVal = (comparisonCeiling / 4) * i;
                            const y = getCompY(emcVal);
                            return (
                              <g key={`comp_grid_y_${i}`}>
                                <line x1={getX(0)} y1={y} x2={getX(95)} y2={y} stroke="#1e293b" strokeWidth="1" strokeDasharray="2,3" opacity="0.5" />
                                <text x={getX(0) - 8} y={y + 3} textAnchor="end" className="text-[8px] font-mono fill-slate-500 font-bold">
                                  {emcUnit === 'percent' ? `${emcVal.toFixed(0)}%` : `${(emcVal/100).toFixed(2)}`}
                                </text>
                              </g>
                            );
                          })}

                          {/* X axis labels */}
                          {Array.from({ length: 11 }).map((_, i) => {
                            const rh = i * 10;
                            if (rh > 95) return null;
                            return (
                              <text key={`comp_lbl_x_${i}`} x={getX(rh)} y={svgHeight - axisMarginBottom + 12} textAnchor="middle" className="text-[8px] font-mono fill-slate-500 font-bold">
                                {rh}%
                              </text>
                            );
                          })}

                          {/* X axis title */}
                          <text x={axisMarginLeft + chartWidth / 2} y={svgHeight - 4} textAnchor="middle" className="text-[10px] font-semibold fill-slate-400">
                            Relative Humidity (% RH) / Water Activity (a<sub>w</sub>)
                          </text>

                          {/* Draw Curves */}
                          {comparisonCurves.map((curve) => (
                            <motion.polyline
                              key={`comp_poly_${curve.material.id}`}
                              fill="none"
                              stroke={curve.color}
                              strokeWidth="3.5"
                              animate={{ points: curve.pointsString }}
                              transition={{ duration: 0.5, ease: "easeInOut" }}
                              className="transition-all hover:stroke-[5] cursor-pointer"
                            />
                          ))}

                          {/* Cursor inspection lines */}
                          <g>
                            <line x1={getX(targetRH)} y1={getCompY(0)} x2={getX(targetRH)} y2={getCompY(comparisonCeiling)} stroke="#38bdf8" strokeWidth="1.5" opacity="0.85" />
                            {comparisonCurves.map(curve => {
                              const pt = curve.points.find(p => p.RH === targetRH);
                              if (!pt) return null;
                              return (
                                <circle
                                  key={`comp_pt_${curve.material.id}`}
                                  cx={getX(targetRH)}
                                  cy={getCompY(pt.EMC)}
                                  r="4"
                                  fill="#0f172a"
                                  stroke={curve.color}
                                  strokeWidth="3"
                                />
                              );
                            })}
                          </g>

                          {/* Interactive hovered tooltips over curves */}
                          {isHovered && hoveredRH !== null && mousePos && (
                            (() => {
                              let closestCurve: any = null;
                              let minDistance = Infinity;

                              comparisonCurves.forEach((curve) => {
                                const pt = curve.points.find(p => p.RH === hoveredRH);
                                if (pt) {
                                  const cy = getCompY(pt.EMC);
                                  const dist = Math.abs(mousePos.y - cy);
                                  if (dist < minDistance) {
                                    minDistance = dist;
                                    closestCurve = {
                                      material: curve.material,
                                      emc: pt.EMC,
                                      color: curve.color,
                                      y: cy
                                    };
                                  }
                                }
                              });

                              if (closestCurve && minDistance < 35) {
                                const tooltipX = getX(hoveredRH);
                                const tooltipY = closestCurve.y;
                                const isRightSide = hoveredRH > 50;
                                const boxWidth = 160;
                                const boxHeight = 56;
                                const boxX = isRightSide ? tooltipX - boxWidth - 10 : tooltipX + 10;
                                const boxY = Math.max(axisMarginTop, Math.min(svgHeight - axisMarginBottom - boxHeight, tooltipY - boxHeight / 2));

                                return (
                                  <g id="comp-hover-tooltip" className="pointer-events-none">
                                    <circle cx={tooltipX} cy={tooltipY} r="6" fill={closestCurve.color} opacity="0.4" className="animate-ping" />
                                    <circle cx={tooltipX} cy={tooltipY} r="4" fill={closestCurve.color} stroke="#ffffff" strokeWidth="1.5" />
                                    
                                    <rect
                                      x={boxX}
                                      y={boxY}
                                      width={boxWidth}
                                      height={boxHeight}
                                      rx="6"
                                      fill="#0b0f19"
                                      stroke={closestCurve.color}
                                      strokeWidth="1.5"
                                      opacity="0.95"
                                    />
                                    <text x={boxX + 8} y={boxY + 16} className="text-[10px] font-sans font-bold fill-white">
                                      {closestCurve.material.name.split(' (')[0]}
                                    </text>
                                    <text x={boxX + 8} y={boxY + 30} className="text-[9px] font-mono fill-slate-400">
                                      RH: {hoveredRH}% at {comparisonTemp}°C
                                    </text>
                                    <text x={boxX + 8} y={boxY + 44} className="text-[10px] font-mono font-bold fill-sky-305" style={{ fill: '#38bdf8' }}>
                                      EMC: {emcUnit === 'percent' ? `${closestCurve.emc.toFixed(2)} %` : `${(closestCurve.emc / 100).toFixed(4)} g/g`}
                                    </text>
                                  </g>
                                );
                              }
                              return null;
                            })()
                          )}
                        </svg>

                        {/* Legend overlay indicating slot values */}
                        <div className="absolute top-3 right-3 bg-slate-950/90 border border-slate-800 rounded-lg p-2.5 space-y-1.5 shadow-2xl text-[10px] font-mono leading-tight max-w-[170px]">
                          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Materials Legend:</div>
                          {comparisonCurves.map(curve => {
                            const pt = curve.points.find(p => p.RH === targetRH);
                            return (
                              <div key={`idx_lbl_${curve.material.id}`} className="flex items-center gap-1.5 text-slate-300">
                                <span className="w-2.5 h-1.5 rounded" style={{ backgroundColor: curve.color }} />
                                <div className="truncate flex-1 max-w-[90px] font-semibold">{curve.material.name.split(' (')[0]}</div>
                                {pt && <span className="text-white font-bold">{pt.EMC.toFixed(1)}%</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Performance Ranking Table */}
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2 flex items-center gap-2">
                          <ListFilter className="w-4 h-4 text-emerald-400" />
                          DVS Performance & Stability Ranking (at {targetRH}% RH)
                        </h2>

                        <div className="overflow-x-auto rounded-lg border border-slate-900">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-slate-900 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                              <tr>
                                <th className="py-2.5 px-3">Stability Rank</th>
                                <th className="py-2.5 px-3">Material Name</th>
                                <th className="py-2.5 px-3">Category</th>
                                <th className="py-2.5 px-3 text-center">Hygroscopicity Class</th>
                                <th className="py-2.5 px-3 text-right">Moisture EMC</th>
                                <th className="py-2.5 px-3 text-center">Critical RH Threshold</th>
                                <th className="py-2.5 px-3 text-right">Hysteresis / Stability Verdict</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                // Rank materials by moisture uptake (lowest uptake = Rank 1 (Most Resistant/Stable))
                                const ranked = [...selectedMatus].map(mat => {
                                  const emc = calculateGAB(targetRH / 100, comparisonTemp, mat.standardGAB);
                                  return { mat, emc };
                                }).sort((a, b) => a.emc - b.emc);

                                return ranked.map(({ mat, emc }, idx) => {
                                  const isCrossed = targetRH >= mat.criticalRH;
                                  
                                  return (
                                    <tr key={`rank_${mat.id}`} className="border-b border-slate-900 hover:bg-slate-900/45 text-slate-300 transition-all font-sans">
                                      <td className="py-2 px-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                          idx === 0 ? "bg-emerald-950 text-emerald-400 border border-emerald-900" :
                                          idx === 1 ? "bg-sky-950 text-sky-400 border border-sky-900" :
                                          "bg-slate-900 text-slate-500"
                                        }`}>
                                          Rank #{idx+1} {idx === 0 ? "🏆 Dry Base" : ""}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 font-semibold text-white">{mat.name}</td>
                                      <td className="py-2 px-3 text-[11px] text-slate-400">{mat.category}</td>
                                      <td className="py-2 px-3 text-center text-[10px]">
                                        <span className={`px-1.5 py-0.5 rounded ${
                                          mat.hygroscopicityClass === 'Non-hygroscopic' ? 'bg-slate-900 text-slate-500' :
                                          mat.hygroscopicityClass === 'Slightly hygroscopic' ? 'bg-indigo-950/40 text-indigo-400' :
                                          mat.hygroscopicityClass === 'Moderately hygroscopic' ? 'bg-emerald-950/40 text-emerald-400' :
                                          'bg-red-950/40 text-red-400'
                                        }`}>
                                          {mat.hygroscopicityClass}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 font-mono font-bold text-right text-sky-450" style={{ color: compColors[comparisonExcipientIds.indexOf(mat.id)] }}>
                                        {emcUnit === 'percent' ? `${emc.toFixed(3)} %` : `${(emc/100).toFixed(5)} g/g`}
                                      </td>
                                      <td className={`py-2 px-3 font-mono text-center font-bold ${isCrossed ? "text-pink-405" : "text-slate-400"}`}>
                                        {mat.criticalRH}% RH
                                      </td>
                                      <td className="py-2 px-3 text-[11px] text-right">
                                        {isCrossed ? (
                                          <span className="text-pink-400 font-bold inline-flex items-center gap-1">
                                            <AlertTriangle className="w-3.5 h-3.5" /> Stability Risk: Threshold Breached!
                                          </span>
                                        ) : (
                                          <span className="text-emerald-400 font-semibold">
                                            Stable • Secure Area
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                });
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {activeTab === 'formulation' && (
            <div className="space-y-6 animate-in fade-in duration-300" id="formulation-workbench-view">
              {/* Header Info Block */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
                <div className="flex items-center gap-3">
                  <div className="bg-pink-950/40 p-2.5 rounded-lg border border-pink-850">
                    <FlaskConical className="w-6 h-6 text-pink-400" />
                  </div>
                  <div>
                    <h2 className="text-md font-bold text-white uppercase tracking-wide">
                      Solid Dosage Formulation Composition & Moisture Activity Solver
                    </h2>
                    <p className="text-xs text-slate-400">
                      Construct active blends, calculate physical compound sorption isotherms, and solve thermodynamic water activity (ERH) shifts inside sealed containers.
                    </p>
                  </div>
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                
                {/* Left side: Recipe inputs */}
                <div className="xl:col-span-7 space-y-6">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold text-slate-200">
                          Dry Blending Recipe & Initial Hydration
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Specify the weight percentage of each material and its initial raw moisture content.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleResetFormulation}
                          className="text-[10px] uppercase tracking-wider bg-slate-900 hover:bg-slate-800 border border-slate-800 px-2.5 py-1.5 rounded text-slate-300 font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3 text-pink-400" /> Default Recipe
                        </button>
                        <button
                          onClick={() => setFormulationComponents([])}
                          className="text-[10px] uppercase tracking-wider bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 px-2.5 py-1.5 rounded text-red-400 font-bold transition-all cursor-pointer"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800/65 text-[10px] text-slate-450 uppercase tracking-wider font-mono">
                            <th className="py-2.5 px-2">Component Material</th>
                            <th className="py-2.5 px-2 w-[110px]">% Dry Share</th>
                            <th className="py-2.5 px-2 w-[130px]">Initial Moisture</th>
                            <th className="py-2.5 px-2 text-right w-[40px]"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900">
                          {formulationComponents.map((comp, idx) => {
                            const mat = excipients.find(e => e.id === comp.materialId) || excipients[0];
                            const isAPIValue = mat?.id === 'ibuprofen_api' || mat?.category?.toLowerCase().includes('api');
                            return (
                              <tr key={`form_row_${idx}`} className="hover:bg-slate-900/20 text-xs">
                                <td className="py-3 px-2 space-y-1">
                                  <select
                                    value={comp.materialId}
                                    onChange={(e) => handleUpdateCompMaterial(idx, e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 focus:border-pink-500 rounded px-2 py-1 text-slate-200 outline-none text-xs font-semibold"
                                  >
                                    {excipients.map((exc) => (
                                      <option key={`opt_${exc.id}`} value={exc.id}>
                                        {exc.name} ({exc.category})
                                      </option>
                                    ))}
                                  </select>
                                  <div className="flex gap-1.5 items-center flex-wrap">
                                    <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-semibold ${
                                      isAPIValue ? 'bg-rose-950/70 text-rose-300 border border-rose-900/30' : 'bg-slate-900 text-slate-400'
                                    }`}>
                                      {mat?.category || 'General'}
                                    </span>
                                    <span className="text-[9px] text-slate-500 font-mono">
                                      Critical Limit: {mat?.criticalRH || 50}% RH
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3 px-2">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="1"
                                      value={comp.percentage}
                                      onChange={(e) => handleUpdateCompProp(idx, Number(e.target.value) || 0)}
                                      className="w-14 bg-slate-950 border border-slate-800 focus:border-pink-500 rounded px-1.5 py-1 text-slate-200 text-center font-mono font-bold"
                                    />
                                    <span className="text-slate-500 font-mono text-[10px]">%</span>
                                  </div>
                                </td>
                                <td className="py-3 px-2">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      min="0"
                                      max="40"
                                      step="0.1"
                                      value={comp.initialMoisture}
                                      onChange={(e) => handleUpdateCompMoist(idx, Number(e.target.value) || 0)}
                                      className="w-14 bg-slate-950 border border-slate-800 focus:border-pink-500 rounded px-1.5 py-1 text-slate-200 text-center font-mono font-bold"
                                    />
                                    <span className="text-slate-500 font-mono text-[9px]">% w/w</span>
                                  </div>
                                </td>
                                <td className="py-3 px-2 text-right">
                                  <button
                                    onClick={() => handleRemoveComponent(idx)}
                                    className="p-1 text-slate-500 hover:text-red-400 transition-all rounded hover:bg-slate-900 cursor-pointer"
                                    title="Delete Ingredient"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}

                          {formulationComponents.length === 0 && (
                            <tr>
                              <td colSpan={4} className="py-6 text-center text-slate-500 text-xs italic font-semibold">
                                No ingredients added. Click "Add Ingredient Row" below to populate your blend.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                      <button
                        onClick={handleAddComponent}
                        className="text-xs font-bold bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3.5 py-2 rounded-lg text-slate-200 transition-all flex items-center gap-1.5 self-start cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-400" /> Add Ingredient Row
                      </button>

                      <div className="flex items-center gap-3">
                        <div className="text-xs text-right font-mono">
                          <span className="text-slate-450 uppercase block font-semibold text-[10px]">Total Proportion:</span>
                          <span className={`text-[13px] font-bold ${totalPercentage === 100 ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`}>
                            {totalPercentage.toFixed(1)} %
                          </span>
                        </div>
                        {totalPercentage !== 100 && totalPercentage > 0 && (
                          <button
                            onClick={handleNormalizePercentages}
                            className="text-[10px] bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer"
                            title="Scale percentages proportionally to sum to exactly 100%"
                          >
                            Auto-Normalize to 100%
                          </button>
                        )}
                      </div>
                    </div>

                    {totalPercentage !== 100 && (
                      <div className="bg-amber-950/30 border border-amber-900/50 rounded-lg p-3 text-[11px] leading-relaxed text-amber-300 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-450 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong>Percentage Desynchronized ({totalPercentage.toFixed(1)}%):</strong> Solid weight fractions must sum to 100% to ensure thermodynamic concentration integrity. Use the <strong>"Auto-Normalize to 100%"</strong> button to scale proportions proportionally.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Component Water Migration Analysis */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
                    <div className="border-b border-slate-800 pb-3">
                      <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                        <Droplets className="w-4 h-4 text-sky-400" />
                        Solid-Phase Moisture Redistribution & Migration Map (at Equilibrium)
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        In a sealed pack, different raw moisture levels equilibrate to a uniform water activity. Watch which materials dry out and which absorb moisture.
                      </p>
                    </div>

                    {formulationComponents.length > 0 ? (
                      <div className="space-y-3.5">
                        <div className="grid grid-cols-1 gap-3">
                          {(() => {
                            const totalWater = solverResult.finalCompositeEMC;
                            return solverResult.components.map((comp, idx) => {
                              const absTransfer = Math.abs(comp.transfer);
                              const percentOfTotalWater = totalWater > 0 
                                ? (comp.waterContribution / totalWater) * 100 
                                : 0;

                              return (
                                <div key={`mig_card_${idx}`} className="bg-slate-900/30 border border-slate-900 p-3.5 rounded-xl space-y-2.5 hover:border-slate-800 transition-all">
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="space-y-0.5">
                                      <h4 className="text-xs font-bold text-slate-200">{comp.name}</h4>
                                      <p className="text-[10px] text-slate-450 font-medium">
                                        {comp.category} • Dry Fraction: <span className="font-semibold text-slate-300 font-mono">{comp.percentage}%</span>
                                      </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {comp.transfer > 0.02 ? (
                                        <span className="px-1.5 py-0.5 bg-red-950/40 border border-red-900/40 rounded text-[9px] font-bold text-red-300 inline-flex items-center gap-0.5">
                                          <ArrowUpRight className="w-3 h-3 text-red-400" />
                                          Absorbed Water (+{comp.transfer.toFixed(2)}%)
                                        </span>
                                      ) : comp.transfer < -0.02 ? (
                                        <span className="px-1.5 py-0.5 bg-emerald-950/40 border border-emerald-900/40 rounded text-[9px] font-bold text-emerald-300 inline-flex items-center gap-0.5">
                                          <ArrowDownRight className="w-3 h-3 text-emerald-400" />
                                          Dehydrated ({comp.transfer.toFixed(2)}%)
                                        </span>
                                      ) : (
                                        <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-[9px] font-mono text-slate-500">
                                          Stable (0.00%)
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Comparison Bar graph */}
                                  <div className="space-y-1.5">
                                    <div className="flex justify-between items-center text-[10px] font-mono leading-none">
                                      <span className="text-slate-400">Moisture Profile: {comp.initial.toFixed(2)}% → {comp.final.toFixed(2)}% w/w</span>
                                      <span className="text-slate-300 font-bold block">Water mass share: {percentOfTotalWater.toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full bg-slate-950 h-2 rounded overflow-hidden flex">
                                      <div 
                                        className="bg-emerald-500 h-full transition-all" 
                                        style={{ width: `${Math.min(100, (comp.initial / 15) * 100)}%` }} 
                                        title="Initial Raw Moisture Level"
                                      />
                                      {comp.transfer > 0 ? (
                                        <div 
                                          className="bg-rose-500 h-full transition-all"
                                          style={{ width: `${Math.min(100, (absTransfer / 15) * 100)}%` }}
                                          title="Absorbed Water mass"
                                        />
                                      ) : (
                                        <div 
                                          className="bg-slate-705 h-full opacity-40 transition-all border-l border-slate-800"
                                          style={{ width: `${Math.min(100, (absTransfer / 15) * 100)}%` }}
                                          title="Released Water mass"
                                        />
                                      )}
                                    </div>
                                    
                                    {comp.isAPI && comp.transfer > 0.05 && (
                                      <div className="p-1.5 bg-rose-950/40 rounded border border-rose-900/30 text-[9px] text-rose-300 font-sans flex items-start gap-1">
                                        <AlertTriangle className="w-3.5 h-3.5 text-rose-450 flex-shrink-0 mt-0.5" />
                                        <span>
                                          API Protection Critical warning: This formulation causes the active pharmaceutical ingredient to absorb surrounding moisture from wet carrier excipients. Pre-dry standard binders (e.g., MCC) or use anhydrous diluents to protect therapeutic integrity.
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 text-center text-slate-500 text-xs italic">
                        Configure materials in your blend recipe to construct the thermodynamic migration map.
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side: Simulation Results Display */}
                <div className="xl:col-span-5 space-y-6">
                  
                  {/* Regulated Temperature & Equilibrium Solver Results */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h3 className="text-sm font-semibold text-white">
                        Thermodynamic Simulation Output
                      </h3>
                      <div className="flex gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                        {AVAILABLE_TEMPERATURES.map(t => (
                          <button
                            key={`form_temp_${t}`}
                            onClick={() => setFormulationTemp(t)}
                            className={`px-2.5 py-1 text-[10px] font-mono rounded cursor-pointer transition-all ${
                              formulationTemp === t
                                ? 'bg-pink-500 text-slate-950 font-bold'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {t}°C
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Solved Equilibrium Score */}
                      <div className="bg-slate-900/40 rounded-xl p-4 border border-slate-800 text-center space-y-2">
                        <span className="text-[10px] uppercase font-mono text-slate-450 tracking-widest block font-bold">
                          Equilibrated Sealed Water Activity
                        </span>
                        
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-3xl font-black text-pink-400 font-mono tracking-tight">
                            {solverResult.aw.toFixed(3)}
                          </span>
                          <span className="text-xs text-slate-500 font-mono font-bold uppercase ml-1">
                            aw
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Equal weight to <span className="text-pink-400 font-bold">{(solverResult.aw * 100).toFixed(1)}% RH</span> Equilibrium ERH
                        </div>

                        {/* Stability Warning Indicator badge */}
                        <div className="pt-1.5">
                          {solverResult.aw < 0.35 ? (
                            <span className="px-2.5 py-1 bg-emerald-950 text-emerald-400 border border-emerald-900 rounded-full text-[9px] font-bold block mx-auto w-fit">
                              🟢 Safe Zone: Low-Water Molecular Protection
                            </span>
                          ) : solverResult.aw < 0.55 ? (
                            <span className="px-2.5 py-1 bg-sky-950 text-sky-400 border border-sky-900 rounded-full text-[9px] font-bold block mx-auto w-fit">
                              🔵 Optimal: Standard Active Stability
                            </span>
                          ) : solverResult.aw < 0.65 ? (
                            <span className="px-2.5 py-1 bg-amber-950 text-amber-400 border border-amber-900 rounded-full text-[9px] font-bold block mx-auto w-fit">
                              🟡 Caution: Active Hydrolysis Susceptibility
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-red-950 text-red-400 border border-red-900 rounded-full text-[9px] font-bold block mx-auto w-fit animate-pulse">
                              🔴 Hazard: Severe Active Degradation & Deliquescence
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Diagnostic values */}
                      <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                        <div className="bg-slate-900/20 p-3 rounded-lg border border-slate-900 space-y-1">
                          <span className="text-[9px] uppercase text-slate-500 block font-bold">Composite Moisture</span>
                          <span className="text-xs font-bold text-slate-200">
                            {solverResult.finalCompositeEMC.toFixed(3)} % w/w
                          </span>
                          <p className="text-[8px] text-slate-500 leading-tight">Consolidated solid water dry-basis load.</p>
                        </div>

                        <div className="bg-slate-900/20 p-3 rounded-lg border border-slate-900 space-y-1">
                          <span className="text-[9px] uppercase text-slate-500 block font-bold">Safest Limit</span>
                          <span className="text-xs font-bold text-pink-400">
                            {formulationComponents.length > 0 
                              ? (Math.min(...solverResult.components.map(c => c.criticalRH)) / 100).toFixed(3) 
                              : '0.000'}
                          </span>
                          <p className="text-[8px] text-slate-500 leading-tight">Safest target activity for the dry blend.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SVG Sorption Isotherm Graph Card */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-white">
                        Formulation Composite Isotherm
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Combined sorption graph of the physical mix (solid pink line) vs. individual constituent curves at {formulationTemp}°C.
                      </p>
                    </div>

                    {/* SVG plotting area */}
                    <div className="bg-slate-950 rounded-xl border border-slate-900 p-2 overflow-x-auto">
                      {(() => {
                        const formPlotWidth = 400;
                        const formPlotHeight = 230;
                        const paddingL = 40;
                        const paddingR = 15;
                        const paddingT = 15;
                        const paddingB = 35;

                        // Calculate points for the Composite Isotherm visualizer
                        const compositeSorptionPoints = (() => {
                          const list: { RH: number; EMC: number }[] = [];
                          for (let rh = 1; rh <= 95; rh++) {
                            let sumEMC = 0;
                            formulationComponents.forEach(comp => {
                              const excVal = excipients.find(e => e.id === comp.materialId);
                              if (excVal) {
                                const emc = calculateGAB(rh / 100, formulationTemp, excVal.standardGAB);
                                sumEMC += (comp.percentage / 100) * emc;
                              }
                            });
                            list.push({ RH: rh, EMC: sumEMC });
                          }
                          return list;
                        })();

                        const maxCmc = Math.max(...compositeSorptionPoints.map(p => p.EMC), 5);
                        const ceilingY = Math.ceil(maxCmc + 2);

                        const getFormX = (rh: number) => {
                          return paddingL + (rh / 100) * (formPlotWidth - paddingL - paddingR);
                        };

                        const getFormY = (emcVal: number) => {
                          const scaleY = formPlotHeight - paddingT - paddingB;
                          const safeEMC = Math.max(0, Math.min(ceilingY, emcVal));
                          return formPlotHeight - paddingB - (safeEMC / ceilingY) * scaleY;
                        };

                        // Generate composite isotherm path
                        let isothermPath = "";
                        compositeSorptionPoints.forEach((pt, idx) => {
                          const x = getFormX(pt.RH);
                          const y = getFormY(pt.EMC);
                          if (idx === 0) {
                            isothermPath += `M ${getFormX(0)} ${getFormY(0)} L ${x} ${y}`;
                          } else {
                            isothermPath += ` L ${x} ${y}`;
                          }
                        });

                        return (
                          <svg width={formPlotWidth} height={formPlotHeight} className="mx-auto block overflow-visible select-none font-mono">
                            {/* Grid Lines */}
                            {[20, 40, 60, 80].map(rhLine => (
                              <line
                                key={`f_line_x_${rhLine}`}
                                x1={getFormX(rhLine)}
                                y1={getFormY(0)}
                                x2={getFormX(rhLine)}
                                y2={getFormY(ceilingY)}
                                stroke="#1e293b"
                                strokeDasharray="3 3"
                                strokeWidth="1"
                              />
                            ))}

                            {/* Horizontal grid lines */}
                            {Array.from({ length: 4 }).map((_, gi) => {
                              const emcLine = ((gi + 1) * ceilingY) / 5;
                              return (
                                <line
                                  key={`f_line_y_${gi}`}
                                  x1={getFormX(0)}
                                  y1={getFormY(emcLine)}
                                  x2={getFormX(100)}
                                  y2={getFormY(emcLine)}
                                  stroke="#1e293b"
                                  strokeDasharray="2 3"
                                  strokeWidth="1"
                                />
                              );
                            })}

                            {/* X and Y Axes */}
                            <line x1={getFormX(0)} y1={getFormY(0)} x2={getFormX(100)} y2={getFormY(0)} stroke="#334155" strokeWidth="1.5" />
                            <line x1={getFormX(0)} y1={getFormY(0)} x2={getFormX(0)} y2={getFormY(ceilingY)} stroke="#334155" strokeWidth="1.5" />

                            {/* X Scale Labels */}
                            {[0, 20, 40, 60, 80, 100].map(lbl => (
                              <g key={`f_lbl_x_${lbl}`}>
                                <text x={getFormX(lbl)} y={formPlotHeight - 15} textAnchor="middle" fill="#576f8e" className="text-[9px] font-sans">
                                  {lbl}%
                                </text>
                                <line x1={getFormX(lbl)} y1={getFormY(0)} x2={getFormX(lbl)} y2={getFormY(0) + 4} stroke="#475569" strokeWidth="1" />
                              </g>
                            ))}

                            {/* Y Scale Labels */}
                            {Array.from({ length: 5 }).map((_, yi) => {
                              const lbl = (yi * ceilingY) / 4;
                              return (
                                <g key={`f_lbl_y_${yi}`}>
                                  <text x={paddingL - 8} y={getFormY(lbl) + 3.5} textAnchor="end" fill="#576f8e" className="text-[9px] font-sans">
                                    {lbl.toFixed(1)}%
                                  </text>
                                  <line x1={getFormX(0)} y1={getFormY(lbl)} x2={getFormX(0) - 4} y2={getFormY(lbl)} stroke="#475569" strokeWidth="1" />
                                </g>
                              );
                            })}

                            <text x={formPlotWidth / 2 + 15} y={formPlotHeight - 2} textAnchor="middle" fill="#64748b" className="text-[8px] font-bold tracking-wider font-sans uppercase">
                              Water Activity / RH
                            </text>

                            <g transform={`rotate(-90 10 ${formPlotHeight/2 - 10})`}>
                              <text x={10} y={formPlotHeight/2 - 10} textAnchor="middle" fill="#64748b" className="text-[8px] font-bold tracking-wider font-sans uppercase">
                                Moisture (% w/w)
                              </text>
                            </g>

                            {/* Individual selection constituent curves (muted dotted lines) */}
                            {formulationComponents.map((comp, ci) => {
                              const excVal = excipients.find(e => e.id === comp.materialId);
                              if (!excVal) return null;
                              
                              let compIsothermPath = "";
                              for (let prh = 0; prh <= 95; prh += 5) {
                                const pemc = calculateGAB(prh / 100, formulationTemp, excVal.standardGAB);
                                const x = getFormX(prh);
                                const y = getFormY(pemc);
                                if (prh === 0) {
                                  compIsothermPath += `M ${getFormX(0)} ${getFormY(0)}`;
                                } else {
                                  compIsothermPath += ` L ${x} ${y}`;
                                }
                              }

                              const isIbu = excVal.id === 'ibuprofen_api' || excVal.category.toLowerCase().includes('api');

                              return (
                                <path
                                  key={`constituent_curve_${excVal.id}_${ci}`}
                                  d={compIsothermPath}
                                  fill="none"
                                  stroke={isIbu ? "#f43f5e" : "#38bdf8"}
                                  strokeDasharray="2 4"
                                  strokeWidth="1.0"
                                  opacity="0.30"
                                />
                              );
                            })}

                            {/* Composite Curve Path */}
                            {isothermPath && (
                              <path
                                d={isothermPath}
                                fill="none"
                                stroke="#ec4899"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                className="drop-shadow-[0_2px_4px_rgba(236,72,153,0.25)]"
                              />
                            )}

                            {/* Vertically dashed solved Equilibrium Water Activity indicator */}
                            {solverResult.aw > 0 && (
                              <g>
                                <line
                                  x1={getFormX(solverResult.aw * 100)}
                                  y1={getFormY(0)}
                                  x2={getFormX(solverResult.aw * 100)}
                                  y2={getFormY(ceilingY)}
                                  stroke="#e0f2fe"
                                  strokeWidth="1.2"
                                  strokeDasharray="3 3"
                                  opacity="0.6"
                                />
                                
                                {/* Pulsing Equilibrated intercept coordinates dot */}
                                <circle
                                  cx={getFormX(solverResult.aw * 100)}
                                  cy={getFormY(solverResult.finalCompositeEMC)}
                                  r="5"
                                  fill="#0f172a"
                                  stroke="#ec4899"
                                  strokeWidth="2.5"
                                />
                                <circle
                                  cx={getFormX(solverResult.aw * 100)}
                                  cy={getFormY(solverResult.finalCompositeEMC)}
                                  r="1.5"
                                  fill="#ffffff"
                                />
                              </g>
                            )}
                          </svg>
                        );
                      })()}
                    </div>

                    {/* Graph legend labels */}
                    <div className="flex justify-center items-center gap-3 text-[9px] text-slate-455 font-sans flex-wrap">
                      <div className="flex items-center gap-1">
                        <span className="w-3 h-0.5 bg-pink-500 block" />
                        <span className="font-semibold text-slate-300">Composite Blend Isotherm</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-3 h-0.5 border-t border-dashed border-sky-400 block opacity-50" />
                        <span>Carriers</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-3 h-0.5 border-t border-dashed border-rose-450 block opacity-50" />
                        <span>Active APIs</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* AI Advisor Chat Panel */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4" id="ai-advisor-panel">
            <h2 className="text-md font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sky-400" />
              Gemini AI Materials Advisor Chat
            </h2>
            <p className="text-xs text-slate-400">
              Query our scientific companion for formulation design recommendation, moisture-induced polymorphism, and dynamic packaging insights.
            </p>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">
                Gemini API Key (Demo Mode)
              </label>
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="Paste Gemini API Key"
                className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 text-slate-100 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-sky-500/50 transition-all"
              />
            </div>
            {/* Suggested quick items */}
            <div className="flex flex-wrap gap-2 pt-1">
              {quickQuestions.map((qq, qi) => (
                <button
                  key={`qq_${qi}`}
                  onClick={(e) => handleChatSubmit(e, qq.query)}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-full px-3 py-1.5 text-[10px] font-semibold text-left transition-all active:scale-95 cursor-pointer leading-tight flex items-center gap-1.5"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                  {qq.label}
                </button>
              ))}
            </div>

            {/* Conversational Screen */}
            <div className="border border-slate-900 rounded-lg bg-slate-950/90 h-64 flex flex-col overflow-hidden">
              <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs scrollbar-thin scrollbar-thumb-slate-800" id="chat-messages-container">
                {messages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={`flex flex-col max-w-[85%] ${
                      msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                    }`}
                  >
                    <span className="text-[10px] text-slate-500 font-mono mb-1">{msg.role === 'user' ? 'Researcher' : 'Gemini Advisor'} • {msg.timestamp}</span>
                    <div className={`p-3 rounded-xl leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-sky-600 text-white rounded-tr-none shadow-md shadow-sky-950/20'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex flex-col items-start max-w-xs mr-auto">
                    <span className="text-[10px] text-slate-500 font-mono mb-1">Gemini Advisor</span>
                    <div className="bg-slate-900 border border-slate-800 text-slate-400 p-3 rounded-xl rounded-tl-none flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                      <span className="text-[10px] italic">Analyzing molecular matrices...</span>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input box form */}
              <form onSubmit={handleChatSubmit} className="border-t border-slate-900 p-2 bg-slate-950 flex gap-2">
                <input
                  type="text"
                  placeholder="Ask a scientific question..."
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg outline-none focus:border-sky-500 transition-all placeholder:text-slate-600"
                />
                <button
                  type="submit"
                  disabled={!userInput.trim() || isTyping}
                  className="bg-sky-600 hover:bg-sky-500 text-white p-2 rounded-lg flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>

      {/* Humble Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 text-slate-500 py-6 text-center text-xs space-y-2 lg:mb-0 mb-16 no-print" id="main-footer">
        <p className="font-semibold text-slate-400">Pharmaceutical Sorption Isotherms Explorer • GAB Thermodynamic Solver</p>
        <p className="max-w-2xl mx-auto px-4 text-[11px] leading-relaxed text-slate-600">
          The Guggenheim-Anderson-de Boer (GAB) model represents raw experimental sorption data on a molecular basis, depicting the monomolecular layer (Xm) transition across multi-layer condensations. Constants generated by AI are physics-informed estimates and should be physically validated with clean gravimetric vapor sorption (DVS) trials.
        </p>
      </footer>

      {/* Floating Critical RH Threshold Toast Notification */}
      <AnimatePresence>
        {showThresholdToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="fixed bottom-6 right-6 z-50 max-w-sm bg-slate-950 border border-amber-500 rounded-xl p-4 shadow-2xl space-y-2.5 no-print"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                Stability Risk Alert
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowThresholdToast(false);
                  setToastDismissedId(currentExcipient.id);
                }}
                className="text-slate-400 hover:text-slate-200 cursor-pointer p-0.5 rounded bg-slate-900 border border-slate-800 transition"
                title="Dismiss warning for this material"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <p className="text-xs text-slate-200 leading-relaxed font-sans">
              Inspection slider reached <strong className="text-amber-400 font-bold">{targetRH}% RH</strong> ({(targetRH/100).toFixed(2)} a<sub>w</sub>), breaching the critical stability ceiling of <strong className="text-amber-400 font-bold">{currentExcipient.name.split(' (')[0]}</strong> (<strong className="text-amber-400 font-semibold">{currentExcipient.criticalRH}% RH</strong>).
            </p>
            <div className="text-[10px] text-slate-400 leading-snug bg-slate-900 p-2.5 rounded border border-slate-850 space-y-1">
              <p className="font-semibold text-slate-300">Potential Formulation Consequences:</p>
              <ul className="list-disc pl-3 text-slate-400 space-y-0.5">
                <li>Moisture absorption is highly accelerated.</li>
                <li>Glass transition temperature collapse risk.</li>
                <li>Increased catalytic hydrolysis degradation of API.</li>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Printable Report Preview Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto no-print" id="print-modal-overlay">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative flex flex-col max-h-[90vh]">
            {/* Modal On-Screen Action Bar */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-purple-400" />
                <span className="font-bold text-white text-sm uppercase tracking-wide">Lab Analysis Report Preview</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition shadow cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>

            {/* Preview Sheet Container (styled for screen preview) */}
            <div className="flex-1 overflow-y-auto bg-white text-slate-900 p-8 rounded-xl border border-slate-350 shadow-inner font-sans scrollbar-thin overflow-x-hidden leading-tight" id="printable-report-modal">
              {/* Report Document Style */}
              <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                  body * {
                    visibility: hidden !important;
                  }
                  #printable-report-modal, #printable-report-modal * {
                    visibility: visible !important;
                  }
                  #printable-report-modal {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    background: white !important;
                    color: black !important;
                  }
                  .no-print {
                    display: none !important;
                  }
                }
              `}} />

              {/* Document Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5 mb-6 text-xs">
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight uppercase text-slate-950 font-sans">
                    Pharmaceutical Moisture Adsorption Report
                  </h1>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase font-mono tracking-wider font-semibold">
                    Dynamic GAB Thermodynamic Isotherm Analysis
                  </p>
                </div>
                <div className="text-right font-mono">
                  <p className="font-bold text-slate-950">REF: SORP-GAB-{currentExcipient.id.toUpperCase()}</p>
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">Date: {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>

              {/* Material Metadata Area */}
              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 text-xs">
                <div className="space-y-1.5">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Material Characterization</p>
                  <p className="text-sm font-extrabold text-slate-950">{currentExcipient.name}</p>
                  <p className="text-slate-700 leading-normal font-medium"><strong className="font-bold text-slate-900">Functional Class:</strong> {currentExcipient.category}</p>
                  <p className="text-slate-700 leading-normal font-medium"><strong className="font-bold text-slate-900">Hygroscopicity classification:</strong> {currentExcipient.hygroscopicityClass}</p>
                </div>
                <div className="space-y-1.5 border-l border-slate-200 pl-4">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono font-sans">Molecular Mechanism</p>
                  <p className="text-slate-700 leading-relaxed font-normal text-[11px]">{currentExcipient.molecularRole}</p>
                </div>
              </div>

              {/* Modeling Constants Table */}
              <div className="space-y-2 mb-6">
                <h3 className="text-[11px] font-black uppercase text-slate-950 tracking-wider flex items-center gap-1">
                  1. GAB Sorption Fitting Coefficients
                </h3>
                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold font-mono text-[9px] uppercase">
                        <th className="py-2 px-3 border-r border-slate-300">Parameter</th>
                        <th className="py-2 px-3 border-r border-slate-300">Description</th>
                        <th className="py-2 px-3 text-right">Reference Value (25°C)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
                      <tr>
                        <td className="py-2 px-3 font-bold border-r border-slate-300 font-mono">Xm (25°C)</td>
                        <td className="py-2 px-3 border-r border-slate-300">Monolayer adsorption capacity (bound water status)</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-950 font-mono">{currentExcipient.standardGAB.Xm25.toFixed(4)} % w/w</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold border-r border-slate-300 font-mono">C (25°C)</td>
                        <td className="py-2 px-3 border-r border-slate-300">Guggenheim constant (monolayer sorption activation energy)</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-950 font-mono">{currentExcipient.standardGAB.C25.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold border-r border-slate-300 font-mono">K (25°C)</td>
                        <td className="py-2 px-3 border-r border-slate-300">Multilayer adjustment factor (bulk water compliance)</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-950 font-mono">{currentExcipient.standardGAB.K25.toFixed(4)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold border-r border-slate-300 font-mono font-sans font-bold">ΔHc (kJ/mol)</td>
                        <td className="py-2 px-3 border-r border-slate-300">Enthalpy difference of monolayer water excess heat</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-950 font-mono">{currentExcipient.standardGAB.delHc.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold border-r border-slate-300 font-mono font-sans font-bold">ΔHk (kJ/mol)</td>
                        <td className="py-2 px-3 border-r border-slate-300">Enthalpy difference of multi-layer water excess heat</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-950 font-mono">{currentExcipient.standardGAB.delHk.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Temperature Curves comparison Table */}
              <div className="space-y-2 mb-6">
                <h3 className="text-[11px] font-black uppercase text-slate-950 tracking-wider flex items-center gap-1">
                  2. Temperature Curve Equilibrium Moisture Matrix (% w/w)
                </h3>
                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold font-mono text-[9px] uppercase">
                        <th className="py-2 px-3 border-r border-slate-300">Temperature</th>
                        <th className="py-2 px-3 border-r border-slate-300 text-right">10% RH</th>
                        <th className="py-2 px-3 border-r border-slate-300 text-right">30% RH</th>
                        <th className="py-2 px-3 border-r border-slate-300 text-right font-bold text-slate-900">50% RH</th>
                        <th className="py-2 px-3 border-r border-slate-300 text-right">75% RH</th>
                        <th className="py-2 px-3 text-right">90% RH</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800 font-medium font-mono text-right">
                      {selectedTemps.map(temp => (
                        <tr key={`print_temp_${temp}`}>
                          <td className="py-2 px-3 border-r border-slate-300 font-bold font-sans text-left text-slate-950">{temp} °C Isotherm</td>
                          <td className="py-2 px-3 border-r border-slate-300">{calculateGAB(0.10, temp, currentExcipient.standardGAB).toFixed(2)}%</td>
                          <td className="py-2 px-3 border-r border-slate-300">{calculateGAB(0.30, temp, currentExcipient.standardGAB).toFixed(2)}%</td>
                          <td className="py-2 px-3 border-r border-slate-300 font-bold text-slate-950">{calculateGAB(0.50, temp, currentExcipient.standardGAB).toFixed(2)}%</td>
                          <td className="py-2 px-3 border-r border-slate-300">{calculateGAB(0.75, temp, currentExcipient.standardGAB).toFixed(2)}%</td>
                          <td className="py-2 px-3">{calculateGAB(0.90, temp, currentExcipient.standardGAB).toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Inspection at targetRH */}
              <div className="space-y-2 mb-6">
                <h3 className="text-[11px] font-black uppercase text-slate-950 tracking-wider">
                  3. Equilibrium Moisture Content and Sorption Heat Excess at inspected RH ({targetRH}% RH)
                </h3>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                  <div className="flex justify-between items-center bg-white p-2 rounded-md border border-slate-250 font-mono">
                    <span className="font-bold text-slate-900 font-sans">Relative Humidity:</span>
                    <span className="font-bold text-slate-950 bg-slate-100 px-2 py-0.5 rounded border border-slate-250">{targetRH}% RH</span>
                    <span className="font-bold text-slate-900 font-sans">Water Activity (a<sub>w</sub>):</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-250">{(targetRH/100).toFixed(2)} a<sub>w</sub></span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-[10px] uppercase font-sans tracking-wide mb-1">State Moisture Profiles:</p>
                    <div className="grid grid-cols-3 gap-3">
                      {selectedTemps.map(temp => {
                        const emc = calculateGAB(targetRH / 100, temp, currentExcipient.standardGAB);
                        const sorptionHeat = calculateSorptionHeat(emc, currentExcipient.standardGAB);
                        return (
                          <div key={`print_inspect_${temp}`} className="bg-white p-2.5 rounded-md border border-slate-200 font-mono">
                            <p className="font-bold text-slate-900 font-sans">{temp}°C Isotherm</p>
                            <p className="text-sm font-black text-indigo-700 mt-1">{emc.toFixed(2)}% w/w</p>
                            <p className="text-[9px] text-amber-600 mt-1 font-sans font-medium">Excess Heat: {sorptionHeat.toFixed(1)} kJ/mol</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Warnings and Advisories */}
              <div className="space-y-2 mb-8">
                <h3 className="text-[11px] font-black uppercase text-slate-950 tracking-wider">
                  4. Stability Limits & Formulation Advisories
                </h3>
                <div className="space-y-3">
                  <div className="flex gap-2.5 items-start bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] leading-relaxed">
                    <div className="font-semibold text-slate-850">Critical Moisture Threshold:</div>
                    <div className="font-semibold text-slate-950 font-mono">{currentExcipient.criticalRH}% RH / {(currentExcipient.criticalRH/100).toFixed(2)} a<sub>w</sub></div>
                  </div>

                  {targetRH >= currentExcipient.criticalRH ? (
                    <div className="bg-yellow-50 border-2 border-yellow-500 rounded-lg p-3.5 flex items-start gap-4">
                      <div className="text-yellow-600 font-bold font-mono text-lg leading-none mt-0.5">⚠️</div>
                      <div className="text-xs">
                        <p className="font-extrabold text-slate-950 uppercase tracking-wide">⚠️ HIGH ENVIRONMENTAL MOISTURE STABILITY BREACH WARNING</p>
                        <p className="text-slate-850 mt-1 leading-relaxed">
                          The current inspection relative humidity ({targetRH}% RH) meets or surpasses the calculated critical stability threshold ({currentExcipient.criticalRH}% RH) for <strong className="font-bold text-slate-950">{currentExcipient.name}</strong>. Accelerated multi-layer condensations can facilitate free molecular water movement, dramatically lowering dry composite powder flow, triggering potential active ingredient chemical hydrolytic decay, or powder caking and structural collapses.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3.5 flex items-start gap-4">
                      <div className="text-emerald-600 font-bold font-mono text-lg leading-none mt-0.5">✔</div>
                      <div className="text-xs">
                        <p className="font-bold text-slate-950">FORMULATION WITHIN STABLE RH THRESHOLD</p>
                        <p className="text-slate-700 mt-0.5 leading-relaxed font-sans font-medium">
                          The requested inspection humidity ({targetRH}% RH) operates safely underneath the critical threshold bound ({currentExcipient.criticalRH}% RH) for this material. Crystalline bonds remain dry and cohesive matrix flow can be expected. Maintain storage tightly sealed in environments with humidity margins lower than {currentExcipient.criticalRH}% RH.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Lab Sign Off Footer */}
              <div className="mt-12 pt-6 border-t-2 border-slate-900 text-[10px] text-slate-600 flex justify-between uppercase tracking-wider font-mono font-bold">
                <div>
                  <p>Documented by: Sorption System Automated Agent</p>
                  <p className="mt-1 text-slate-500 lowercase font-medium">Generated via Gemini 3.5 AI Core</p>
                </div>
                <div className="text-right">
                  <p className="border-b border-slate-400 pb-4 min-w-[150px]">Analyst Signature Lines</p>
                  <p className="mt-1">Authorized Laboratory Seal</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple Inline Custom Icon for Comparing Matrix layout
function LayersCompareIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M2 17h10M2 13h15M2 9h20M2 5h12" />
    </svg>
  );
}
