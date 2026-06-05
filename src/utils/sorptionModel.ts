/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExcipientGABParams, IsothermPoint, IsothermCurve } from '../types';

const R = 8.314; // Universal gas constant in J/(mol*K)

/**
 * Calculates the Equilibrium Moisture Content (EMC % w/w) using the thermodynamic GAB model.
 * 
 * @param aw Water activity (RH % / 100) from 0 to 1
 * @param tempC Temperature in Celsius
 * @param params Excipient's GAB benchmark parameters
 */
export function calculateGAB(aw: number, tempC: number, params: ExcipientGABParams): number {
  if (aw <= 0.0001) return 0;
  
  // Convert temperature to Kelvin
  const T = tempC + 273.15;
  const Tref = 298.15; // 25°C in Kelvin
  
  // 1. Calculate temperature-dependent Monolayer moisture content Xm
  // Monolayer decreases slightly as temperature increases (due to thermal excitation of adsorbed molecules)
  const Xm = params.Xm25 * (1 - 0.008 * (tempC - 25));
  
  // 2. Calculate temperature-dependent C constant (Guggenheim constant)
  // C = C0 * exp(dQ_C / RT), models monolayer binding energy change relative to T
  // we translate the difference (1/T - 1/Tref) to scale relative to C25
  const deltaInvTc = (1 / T) - (1 / Tref);
  const C = params.C25 * Math.exp((params.delHc * 1000 / R) * deltaInvTc);
  
  // 3. Calculate temperature-dependent K constant (multilayer factor)
  // K = K0 * exp(dQ_K / RT), models multilayer binding relative to bulk water
  const deltaInvTk = (1 / T) - (1 / Tref);
  let K = params.K25 * Math.exp((params.delHk * 1000 / R) * deltaInvTk);
  
  // Math bounds safety for GAB model convergence
  K = Math.max(0.1, Math.min(K, 0.98));
  const safeAw = Math.max(0, Math.min(aw, 0.99));
  
  // 4. Compute GAB equation
  // EMC = Xm * C * K * aw / [ (1 - K * aw) * (1 - K * aw + C * K * aw) ]
  const num = Xm * C * K * safeAw;
  const den1 = 1 - K * safeAw;
  const den2 = 1 - K * safeAw + C * K * safeAw;
  
  if (Math.abs(den1 * den2) < 0.00001) {
    // Fallback if denominator approaches zero
    return Xm * C * K * safeAw;
  }
  
  const emc = num / (den1 * den2);
  
  return parseFloat(Math.max(0, emc).toFixed(3));
}

/**
 * Calculates the local Sorption Heat excess (kJ/mol) above bulk condensation.
 * Thermodynamically, when coverage is low (EMC <= Xm), water binds to active high-energy monolayer sites
 * releasing high excess energy (~ delHc + delHk). As coverage increases (EMC > Xm), it decays to multilayer
 * energy levels (~ delHk) and asymptotically approaches bulk water condensation heat (0 kJ/mol excess).
 *
 * @param emc The current moisture content (% w/w) at the given state
 * @param params Excipient's GAB thermodynamics parameters
 */
export function calculateSorptionHeat(emc: number, params: ExcipientGABParams): number {
  const Xm = params.Xm25;
  const delHc = params.delHc;
  const delHk = params.delHk;
  
  if (emc <= 0.01) {
    return Math.max(0, delHc + delHk);
  }
  
  const ratio = emc / Xm;
  if (ratio <= 1.0) {
    // Linear transition from maximum excess down to delHk level
    const val = delHk + delHc * (1.0 - ratio);
    return parseFloat(Math.max(0, val).toFixed(2));
  } else {
    // Exponential transition from delHk level approaching bulk water (0 kJ/mol excess)
    const val = delHk * Math.exp(-(ratio - 1.0) * 1.5);
    return parseFloat(Math.max(0, val).toFixed(2));
  }
}

/**
 * Generates an entire moisture sorption isotherm curve (points from 0% to 95% RH)
 * at a specific temperature.
 */
export function generateIsothermCurve(
  temperature: number,
  params: ExcipientGABParams,
  stepSize = 5
): IsothermCurve {
  const points: IsothermPoint[] = [];
  
  // Always include 0% RH
  points.push({ RH: 0, EMC: 0 });
  
  for (let rh = stepSize; rh <= 95; rh += stepSize) {
    const aw = rh / 100;
    const emc = calculateGAB(aw, temperature, params);
    points.push({ RH: rh, EMC: emc });
  }
  
  // Force clean ending if 95 was bypassed due to step size
  if (points[points.length - 1].RH !== 95) {
    const emc = calculateGAB(0.95, temperature, params);
    points.push({ RH: 95, EMC: emc });
  }
  
  return {
    temperature,
    points
  };
}

/**
 * Generates interactive data for plotting several temperatures (e.g. 8°C, 15°C, 25°C, 40°C)
 * formatted for responsive visual plotting.
 */
export function generateMultiTempIsotherms(
  temperatures: number[],
  params: ExcipientGABParams
): IsothermCurve[] {
  return temperatures.map(temp => generateIsothermCurve(temp, params));
}
