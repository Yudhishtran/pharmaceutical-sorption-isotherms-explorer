/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Excipient } from '../types';

export const STANDARD_EXCIPIENTS: Excipient[] = [
  {
    id: 'mcc',
    name: 'Microcrystalline Cellulose (MCC, Avicel® PH-101)',
    category: 'Binder',
    description: 'The premier dry binder used in direct compression. Derived from purified wood pulps, its high porosity and crystalline cellulose chains provide moderate moisture interaction.',
    hygroscopicityClass: 'Moderately hygroscopic',
    criticalRH: 75,
    molecularRole: 'Relies on intra- and intermolecular hydrogen bonding between cellulose microfibrils. Sorbs water primarily in amorphous regions, causing slight swelling but maintaining chemical stability.',
    standardGAB: {
      Xm25: 6.20,  // 6.2% monolayer moisture capacity
      C25: 18.2,  // strong monolayer interaction site
      K25: 0.82,  // multilayer attenuation factor
      delHc: 12.5,  // Enthalpy excess kJ/mol
      delHk: -1.2   // kJ/mol
    },
    literatureNotes: 'Exhibits a classic sigmoidal Type II isotherm. EMC rises steadily. At 8°C, it reaches ~7.2% EMC at 50% RH, whereas at 40°C, it decreases to ~5.4% EMC at the same 50% RH. Store below 65% RH for superior tablet hardness.',
  },
  {
    id: 'lactose_mono',
    name: 'Lactose Monohydrate (Crystalline)',
    category: 'Diluent',
    description: 'Highly crystalline disaccharide used universally as a tablet diluent. Excellent powder flow, low mechanical deformation, and extremely low surface affinity for water.',
    hygroscopicityClass: 'Slightly hygroscopic',
    criticalRH: 80,
    molecularRole: 'Contains a chemically bound stoichiometric molecule of crystalline hydration (5.0% w/w) which is highly stable. Secondary water sorption on the crystal surface is minimal unless amorphous cracks exist.',
    standardGAB: {
      Xm25: 0.18,
      C25: 5.5,
      K25: 0.72,
      delHc: 7.2,
      delHk: -0.3
    },
    literatureNotes: 'Flat sorption behavior up to 80% RH (moisture adsorption < 0.25% w/w). Above 85% RH, liquid film condensation on crystals creates a rapid uptick. Amorphous lactose (spray-dried fraction) can absorb heavily and recrystallize, releasing water.',
  },
  {
    id: 'pregel_starch',
    name: 'Pregelatinized Starch (Starch 1500®)',
    category: 'Binder',
    description: 'Chemically and physically disrupted starch granules, making it cold-water soluble. Highly hydrophilic with outstanding self-disintegrating and binding features in wet granulation.',
    hygroscopicityClass: 'Very hygroscopic',
    criticalRH: 65,
    molecularRole: 'Ruined starch envelopes expose a vast collection of free hydroxyl clusters, creating numerous high-affinity adsorption coordinates for monomolecular water chains.',
    standardGAB: {
      Xm25: 9.20,
      C25: 22.5,
      K25: 0.84,
      delHc: 14.8,
      delHk: -1.6
    },
    literatureNotes: 'Very high monolayer capacity (9.2%). Standard moisture content at 50% RH is about 11.5% w/w. EMC drops significantly when temperature ascends from 8°C to 40°C. Protect moisture-sensitive APIs in dual-pack strip packaging.',
  },
  {
    id: 'pvp_k30',
    name: 'Povidone (PVP K30)',
    category: 'Binder',
    description: 'An amorphous, water-soluble polymer utilized as dry binder, solubility enhancer, and suspension stabilizer. Highly amorphous with strong thermodynamic affinity for water.',
    hygroscopicityClass: 'Very hygroscopic',
    criticalRH: 50,
    molecularRole: 'The pyrrolidone peptide groups are highly polar and form strong hydrogen bonds with water molecules, leading to progressive polymeric swelling and glass transition temperature (Tg) depression.',
    standardGAB: {
      Xm25: 11.50,
      C25: 14.0,
      K25: 0.91,
      delHc: 16.5,
      delHk: -2.2
    },
    literatureNotes: 'At RH levels >55%, Povidone undergoes glass-to-rubber transition (Tg falls below room temp) causing sticky powder agglomeration and liquefaction. Equilibrates to >20% moisture at 60% RH. Store in air-tight aluminum foil layers with thick desiccants.',
  },
  {
    id: 'colloidal_silica',
    name: 'Colloidal Silicon Dioxide (Aerosil® 200)',
    category: 'Glidant/Adsorbent',
    description: 'Light, submicron fumed silica with an extremely high specific surface area (~200 m²/g). Primarily acting as a flow aid and dynamic moisture-adsorbing scavenger.',
    hygroscopicityClass: 'Moderately hygroscopic',
    criticalRH: 70,
    molecularRole: 'The surface is covered with hydrophilic silanol (Si-OH) groups. It adsorbs water via physical capillary condensation and silanol coordination, acting as an internal tablet desiccant.',
    standardGAB: {
      Xm25: 4.80,
      C25: 11.0,
      K25: 0.85,
      delHc: 10.2,
      delHk: -0.9
    },
    literatureNotes: 'Sorption curve is mostly linear at mid-RH (Type I/II mix). Excellent buffer excipient; it sequesters residual free moisture in tablet formulations, preventing the moisture from reaching hydrolysis-prone API molecules.',
  },
  {
    id: 'mannitol',
    name: 'Mannitol (Pearlitol®)',
    category: 'Diluent',
    description: 'A sugar alcohol isomer used extensively in chewable tablets and lyophilized products. Noted for its sweet, cool mouthfeel and total inertness to moisture sorption.',
    hygroscopicityClass: 'Non-hygroscopic',
    criticalRH: 90,
    molecularRole: 'Highly stable crystalline polymorphs (beta/alpha) pack densely, leaving zero surface pockets or active groups capable of binding water under normal biological or climatic humilities.',
    standardGAB: {
      Xm25: 0.05,
      C25: 2.2,
      K25: 0.62,
      delHc: 3.5,
      delHk: -0.1
    },
    literatureNotes: 'Practically zero moisture pickup (<0.1% w/w) all the way up to 90% RH. At 93-95% RH, it reaches its deliquescence point, dissolving rapidly. The absolute standard diluent for moisture-sensitive active ingredients like aspirin or vitamins.',
  },
  {
    id: 'croscarmellose',
    name: 'Croscarmellose Sodium (Ac-Di-Sol®)',
    category: 'Disintegrant',
    description: 'An internally cross-linked sodium carboxymethylcellulose designed for rapid tablet disintegration. Highly swollen upon water contact.',
    hygroscopicityClass: 'Very hygroscopic',
    criticalRH: 60,
    molecularRole: 'The sodium carboxymethyl groups are highly hydrophilic, pulling water molecules into the core crosslinked fibrous network via osmotic pressure, inducing huge swelling/wicking forces.',
    standardGAB: {
      Xm25: 11.00,
      C25: 19.5,
      K25: 0.85,
      delHc: 15.0,
      delHk: -1.3
    },
    literatureNotes: 'Type II sigmoid isotherm. Can absorb up to 14% water at 50% RH and over 35% at 90% RH. While crucial for rapid tablet breakdown, high moisture levels in raw powders can compromise tablet stability if stored loosely.',
  },
  {
    id: 'mag_stearate',
    name: 'Magnesium Stearate',
    category: 'Lubricant',
    description: 'A hydrophobic lubricant consisting of magnesium salts of stearic and palmitic acids. Acts as a boundary lubricant to reduce ejection force.',
    hygroscopicityClass: 'Non-hygroscopic',
    criticalRH: 85,
    molecularRole: 'Long, hydrophobic aliphatic hydrocarbon stearate chains stretch outward, creating a hydrophobic protective layer that prevents solid state moisture condensation.',
    standardGAB: {
      Xm25: 0.28,
      C25: 3.8,
      K25: 0.70,
      delHc: 6.0,
      delHk: -0.2
    },
    literatureNotes: 'Extremely flat moisture sorption isotherm (<0.5% weight pickup at 75% RH). At high temperatures (above 40°C) and extreme humidities, slight crystal lattice changes can lock in additional water, but it is practically non-hygroscopic in typical pharmaceutical scenarios.'
  },
  {
    id: 'crospovidone',
    name: 'Crospovidone (Kollidon® CL)',
    category: 'Disintegrant',
    description: 'A water-insoluble, cross-linked homopolymer of N-vinyl-2-pyrrolidone. Used as a superdisintegrant with high capillary action.',
    hygroscopicityClass: 'Very hygroscopic',
    criticalRH: 55,
    molecularRole: 'Maintains immense capillary wicking network. Water is pulled physically into the crossjoined polymer pores, swelling strongly but maintaining structure.',
    standardGAB: {
      Xm25: 10.80,
      C25: 14.5,
      K25: 0.84,
      delHc: 15.2,
      delHk: -1.8
    },
    literatureNotes: 'Sorbs large volumes of water immediately without forming a gel. At 50% RH, EMC is around 12% w/w. Highly susceptible to humidity-driven enzymatic or chemical breakdown in moisture-sensitive core formulations.'
  },
  {
    id: 'sodium_starch_glycolate',
    name: 'Sodium Starch Glycolate (Primojel®)',
    category: 'Disintegrant',
    description: 'A cross-linked, carboxymethylated potato starch derivative utilized as a rapid tablet superdisintegrant.',
    hygroscopicityClass: 'Very hygroscopic',
    criticalRH: 60,
    molecularRole: 'Sodium carboxylate molecules draw water inside. Highly localized osmotic gradients result in extremely violent swelling (increases up to 300% in volume).',
    standardGAB: {
      Xm25: 12.00,
      C25: 23.0,
      K25: 0.86,
      delHc: 16.0,
      delHk: -1.5
    },
    literatureNotes: 'Exhibits extreme water uptake behavior above 60% RH. Rapidly develops thick hydrated gels under high moistures, which can retard dissolution if used in over-lubricated recipes.'
  },
  {
    id: 'hpmc',
    name: 'Hypromellose (HPMC K100M)',
    category: 'Coating Agent',
    description: 'A semi-synthetic propylene glycol ether of methylcellulose. Universally used for hydrophilic polymer matrix sustained release.',
    hygroscopicityClass: 'Moderately hygroscopic',
    criticalRH: 70,
    molecularRole: 'Hydroxypropyl and methoxyl linkages form custom spatial grids. Slowly bonds with water molecules, forming an impervious viscous mucilage boundary layer.',
    standardGAB: {
      Xm25: 5.80,
      C25: 15.0,
      K25: 0.80,
      delHc: 11.8,
      delHk: -0.9
    },
    literatureNotes: 'Provides controlled sigmoidal water progression. Hydrates smoothly to create a solid gel barrier that regulates further water infiltration. Protect from elevated temperatures to avoid premature polymer-state transition.'
  },
  {
    id: 'ethylcellulose',
    name: 'Ethylcellulose (Ethocel®)',
    category: 'Coating Agent',
    description: 'A fully water-insoluble, hydrophobic ethyl ether cellulose derivative used in controlled release coatings and microencapsulation.',
    hygroscopicityClass: 'Slightly hygroscopic',
    criticalRH: 85,
    molecularRole: 'Hydrophobic ethoxy functional parameters substitute bulk glucoside silanols, preventing dense hydrogen clustering with environmental vapor molecules.',
    standardGAB: {
      Xm25: 1.10,
      C25: 4.8,
      K25: 0.65,
      delHc: 5.5,
      delHk: -0.4
    },
    literatureNotes: 'Extremely dry, durable water barrier. Equilibrium moisture remains below 2.5% w/w under normal humidity climates. Ideal for water-proofing vulnerable multivitamin granules and delayed-release pills.'
  },
  {
    id: 'sucrose',
    name: 'Sucrose (Refined Sugar)',
    category: 'Diluent',
    description: 'Natural crystalline alpha-D-glucopyranosyl beta-D-fructofuranoside disaccharide. Widely used as a binder, diluent, and taste mask.',
    hygroscopicityClass: 'Deliquescent',
    criticalRH: 85,
    molecularRole: 'Crystalline structure excludes water inclusion at low humilities. At the specific deliquescence limit, the surface crystals collapse to create a saturated solution.',
    standardGAB: {
      Xm25: 0.20,
      C25: 6.0,
      K25: 0.70,
      delHc: 8.5,
      delHk: -0.2
    },
    literatureNotes: 'Classic deliquescence profile: flat curve (<0.3% EMC) up to 80% RH, followed by total liquid collapse at 86% RH. Highly subject to caking, sticky bridging, and biological rotting in damp storage rooms.'
  },
  {
    id: 'calcium_phosphate',
    name: 'Calcium Phosphate Tribasic',
    category: 'Diluent',
    description: 'A solid mineral diluent representing a mixture of variable calcium phosphates. Completely insoluble and chemically robust.',
    hygroscopicityClass: 'Non-hygroscopic',
    criticalRH: 90,
    molecularRole: 'Extremely strong inorganic ionic lattice binds calcium and orthophosphate tightly, resisting environmental moisture coordination at all regular climates.',
    standardGAB: {
      Xm25: 0.35,
      C25: 4.0,
      K25: 0.50,
      delHc: 5.0,
      delHk: -0.1
    },
    literatureNotes: 'Highly recommended for hydrolytically unstable active ingredients. Sorps less than 1.0% w/w water even at 90% RH. Excellent compressibility and thermal resilience.'
  },
  {
    id: 'stearic_acid',
    name: 'Stearic Acid (Type I)',
    category: 'Lubricant',
    description: 'A crystalline mixture of solid fatty acids (octadecanoic and hexadecanoic acid) acting as lubricant and tablet hardener.',
    hygroscopicityClass: 'Non-hygroscopic',
    criticalRH: 90,
    molecularRole: 'Aliphatic chains pack tightly into crystalline structures, presenting an impermeable paraffin-like defense against vapor adsorption.',
    standardGAB: {
      Xm25: 0.12,
      C25: 2.0,
      K25: 0.45,
      delHc: 4.0,
      delHk: -0.1
    },
    literatureNotes: 'Water uptake is practically negligible. Excellent glidant/lubricant choice in effervescent tablets, resisting premature autocatalytic effervescence caused by trace surface humidity.'
  },
  {
    id: 'peg_4000',
    name: 'Polyethylene Glycol (PEG 4000)',
    category: 'Lubricant',
    description: 'A semi-crystalline, water-soluble linear polymer of ethylene oxide. Applied as dynamic plasticizer, water binder, and solid dispersion matrix.',
    hygroscopicityClass: 'Deliquescent',
    criticalRH: 55,
    molecularRole: 'The ether oxygens (-O-) are highly hydrophilic. At moderate air relative humidities, they interact with moisture, descending the crystalline melting point.',
    standardGAB: {
      Xm25: 2.80,
      C25: 8.5,
      K25: 0.90,
      delHc: 9.8,
      delHk: -1.7
    },
    literatureNotes: 'Exhibits sharp hygroscopic threshold above 55% RH. The polymer structure undergoes sudden hygroscopic dissolution, turning into a dense liquid slush. Keep away from warm, tropical storage chambers.'
  },
  {
    id: 'sls',
    name: 'Sodium Lauryl Sulfate (SLS)',
    category: 'Diluent',
    description: 'Anionic surfactant powder used universally as a wetting agent, dissolution promoter, and lubricant aid.',
    hygroscopicityClass: 'Very hygroscopic',
    criticalRH: 75,
    molecularRole: 'Contains a highly polar ionic sulfate head which forms robust hydration coordinate spheres with raw water molecules.',
    standardGAB: {
      Xm25: 3.50,
      C25: 12.0,
      K25: 0.85,
      delHc: 11.2,
      delHk: -1.1
    },
    literatureNotes: 'Exhibits moderate water absorption at low climates, surging above 75% RH. Increases moisture uptake in tablets, but vastly improves bioavailability of hydrophobic drugs by enhancing water wetting angles.'
  },
  {
    id: 'xanthan_gum',
    name: 'Xanthan Gum (USP-NF)',
    category: 'Binder',
    description: 'A high molecular weight natural polysaccharide gum. Excellent stabilizing agent and sustained release gel former.',
    hygroscopicityClass: 'Very hygroscopic',
    criticalRH: 60,
    molecularRole: 'Polyanionic trisaccharide sidegroups bind water through strong hydrogen and ionic linkages, expanding into highly dense, viscous polymer networks.',
    standardGAB: {
      Xm25: 10.50,
      C25: 20.0,
      K25: 0.85,
      delHc: 15.8,
      delHk: -1.5
    },
    literatureNotes: 'Type II sigmoid isotherm. Normal moisture capacity is about 12% at 50% RH, inflating to 28% at 90% RH. Provides incredible swelling matrices for sustained drug release pills.'
  },
  {
    id: 'dextrose',
    name: 'Dextrose Anhydrous',
    category: 'Diluent',
    description: 'Fully anhydrous crystalline D-glucose. Easily digestible sugar filler offering pleasant sweet taste and quick dissolution.',
    hygroscopicityClass: 'Slightly hygroscopic',
    criticalRH: 80,
    molecularRole: 'Anhydrous crystal lattice contains vacant hydration pockets which are gradually occupied by moisture under high pressure climates.',
    standardGAB: {
      Xm25: 0.40,
      C25: 6.5,
      K25: 0.78,
      delHc: 8.0,
      delHk: -0.3
    },
    literatureNotes: 'Stays extremely dry up to 75% RH. Rapidly transforms into dextrose monohydrate and deliquesces once the critical 80% RH ceiling is breached.'
  },
  {
    id: 'sorbitol',
    name: 'Sorbitol (Crystalline)',
    category: 'Diluent',
    description: 'Hexahydric crystalline sugar alcohol. Exceptional humectant, plasticizer, and chewable tablet sugar substitute.',
    hygroscopicityClass: 'Deliquescent',
    criticalRH: 68,
    molecularRole: 'Abundant open carbon-hydroxyl grids offer direct bonding with incoming water, which easily liquefies the crystal planes.',
    standardGAB: {
      Xm25: 5.20,
      C25: 14.0,
      K25: 0.88,
      delHc: 12.0,
      delHk: -1.6
    },
    literatureNotes: 'Very critical humectant. Picks up substantial water above 65% RH. Turns into clear solution film when kept at 75% RH (EU/US Zone II/IV standard humidity).'
  },
  {
    id: 'gelatin',
    name: 'Gelatin (Type A, USP)',
    category: 'Binder',
    description: 'Collagen-derived soluble gelling protein used as tablet dry adhesive, microencapsulation shell, and hard/soft capsules.',
    hygroscopicityClass: 'Very hygroscopic',
    criticalRH: 60,
    molecularRole: 'Polypeptide chain backbones contains polar amino carboxyl clusters that pull water molecules, plasticizing the solid protein glass.',
    standardGAB: {
      Xm25: 9.80,
      C25: 18.0,
      K25: 0.83,
      delHc: 14.5,
      delHk: -1.2
    },
    literatureNotes: 'Sorption levels must be kept between 13% and 16% w/w to maintain elastic mechanical strength of capsule walls. Below 10%, capsules become highly brittle; above 20%, they soften and stick.'
  },
  {
    id: 'chitosan',
    name: 'Chitosan (Highly Deacetylated)',
    category: 'Coating Agent',
    description: 'A cationic biopolymer obtained by deacetylation of marine chitin. Used in mucoadhesive coatings and non-viral gene delivery.',
    hygroscopicityClass: 'Very hygroscopic',
    criticalRH: 65,
    molecularRole: 'Amine (-NH2) and hydroxyl (-OH) chains are highly reactive, forming complex coordinated hydrogen networks with surrounding moisture.',
    standardGAB: {
      Xm25: 8.50,
      C25: 16.5,
      K25: 0.82,
      delHc: 13.5,
      delHk: -1.4
    },
    literatureNotes: 'A premium natural polymer offering biocompatibility. Extremely hygroscopic due to cationic character. Adsorbs over 15% moisture at 60% RH. Excellent film forming behavior.'
  },
  {
    id: 'cellulose_acetate',
    name: 'Cellulose Acetate (CA-398-10)',
    category: 'Coating Agent',
    description: 'An acetylated cellulose ester. Acts as the primary semi-permeable membrane in osmotic pump tablets (OROS®).',
    hygroscopicityClass: 'Slightly hygroscopic',
    criticalRH: 80,
    molecularRole: 'Bulky acetyl chemical groups block hydrogen binding sites of glucoside blocks, drastically reducing moisture penetration.',
    standardGAB: {
      Xm25: 1.80,
      C25: 7.2,
      K25: 0.70,
      delHc: 7.5,
      delHk: -0.5
    },
    literatureNotes: 'Adsorbs small quantities of moisture (<4.0% w/w) but remains physically intact. Crucial for osmotic drug delivery where stable hydro-pressures are needed to push active drugs.'
  },
  {
    id: 'talc',
    name: 'Talc (Superfine Pharmaceutical)',
    category: 'Glidant/Adsorbent',
    description: 'A purified hydrated magnesium silicate mineral powder. The primary anti-tacking agent used in coating suspension recipes.',
    hygroscopicityClass: 'Non-hygroscopic',
    criticalRH: 90,
    molecularRole: 'Composed of layered magnesium sheets enveloped by silica. The basal planes are entirely hydrophobic and repel water.',
    standardGAB: {
      Xm25: 0.15,
      C25: 3.0,
      K25: 0.55,
      delHc: 4.5,
      delHk: -0.1
    },
    literatureNotes: 'Virtually zero moisture adsorption (<0.2% EMC) under all humidity levels. Prevents tacky cohesion during organic or aqueous tablet coating runs.'
  },
  {
    id: 'copovidone',
    name: 'Copovidone (Kollidon® VA64)',
    category: 'Binder',
    description: 'A copolymer of 1-vinyl-2-pyrrolidone and vinyl acetate (6:4 ratio). Outstanding dry binder for direct compression and hot-melt extrusion (HME).',
    hygroscopicityClass: 'Very hygroscopic',
    criticalRH: 50,
    molecularRole: 'The vinyl acetate part reduces the extreme hygroscopicity of pure PVP, but pyrrolidone groups still bind water molecules strongly.',
    standardGAB: {
      Xm25: 8.80,
      C25: 12.5,
      K25: 0.86,
      delHc: 13.0,
      delHk: -1.6
    },
    literatureNotes: 'Less hygroscopic than pure PVP K30, but still highly moisture sensitive. At 50% RH it reaches around 9% w/w moisture. Widely used to formulate stable amorphous solid dispersions (ASD).'
  },
  {
    id: 'ashwagandha_powder',
    name: 'Ashwagandha Root Extract (Ayurveda)',
    category: 'Herbal Powder / Ayurveda',
    description: 'Dried aqueous-alcoholic root extract of Withania somnifera. Highly rich in withanolides, water-soluble sugars, and polysaccharides which are highly hydrophilic.',
    hygroscopicityClass: 'Very hygroscopic',
    criticalRH: 55,
    molecularRole: 'Relies on abundant active hydroxyl sites from sucrose, oligosaccharides, and hydrophilic starches. Attracts moisture rapidly, leading to glassy-state caking and powder sticky degradation.',
    standardGAB: {
      Xm25: 8.80,
      C25: 14.0,
      K25: 0.88,
      delHc: 12.0,
      delHk: -1.5
    },
    literatureNotes: 'Shows standard Type II behavior. At 50% RH, ashwagandha powder reaches ~11.5% w/w moisture. When critical RH exceeds 55%, withanolide chemical stability deteriorates via hydrolysis.'
  },
  {
    id: 'guggul_resin',
    name: 'Guggul Gum Resin (Ayurveda)',
    category: 'Herbal Binder / Ayurveda',
    description: 'Purified oleo-gum-resin from Commiphora mukul. Composed of natural polysaccharides combined with lipophilic guggulsterones.',
    hygroscopicityClass: 'Moderately hygroscopic',
    criticalRH: 65,
    molecularRole: 'Polysaccharide chains form a porous gum grid that binds moisture under temperate zones, while lipids provide mild hydrophobic resistance relative to standard botanical extracts.',
    standardGAB: {
      Xm25: 6.00,
      C25: 11.5,
      K25: 0.82,
      delHc: 10.5,
      delHk: -1.1
    },
    literatureNotes: 'Acts as a natural tablet binder in traditional ayurvedic vati recipes. Protect from humidities above 65% RH to avoid surface stickiness, hardening, or mold proliferation.'
  },
  {
    id: 'turmeric_powder',
    name: 'Turmeric Curcumin Powder (Ayurveda/Food)',
    category: 'Active Powder / Food',
    description: 'Ground rhizomes of Curcuma longa. High in crystalline Curcuminoid pigments (~3-5%) along with starch grains and cellulose matrices.',
    hygroscopicityClass: 'Slightly hygroscopic',
    criticalRH: 75,
    molecularRole: 'Relies on crystalline curcuminoids and cellulose fractions which display small surface affinity for environmental water. Adsorption is dominated by the starch granules.',
    standardGAB: {
      Xm25: 3.20,
      C25: 8.5,
      K25: 0.76,
      delHc: 9.0,
      delHk: -0.8
    },
    literatureNotes: 'Displays stable behavior upto 70% RH, with moisture content under 5.0% w/w. Rapidly absorbs water above 75% RH due to swelling behavior of natural rhizome starches.'
  },
  {
    id: 'triphala_powder',
    name: 'Triphala Herb Powder (Ayurveda)',
    category: 'Herbal Formulation / Ayurveda',
    description: 'A traditional mixture of Amalaki, Bibhitaki, and Haritaki. Highly concentrated in hydrophilic organic acids, complex tannins, and mucilage polymers.',
    hygroscopicityClass: 'Very hygroscopic',
    criticalRH: 50,
    molecularRole: 'Polyphenols, gallic acid, and fructose monomers form a highly hygroscopic matrix, forming numerous water-complexing pathways.',
    standardGAB: {
      Xm25: 9.50,
      C25: 16.0,
      K25: 0.89,
      delHc: 13.8,
      delHk: -1.7
    },
    literatureNotes: 'Extremely moisture-sensitive. At 50% RH it absorbs over 13% w/w water, turning dark and clumping. Store in double-sealed glass containers or airtight blister strips.'
  },
  {
    id: 'sodium_alginate',
    name: 'Sodium Alginate (Food/Pharma)',
    category: 'Gelling Agent / Food',
    description: 'Sodium salt of alginic acid extracted from brown seaweed. Widely used as a thickener, microencapsulation matrix, and food stabilizer.',
    hygroscopicityClass: 'Very hygroscopic',
    criticalRH: 60,
    molecularRole: 'Carboxylate and hydroxyl groups on the guluronic and mannuronic acid blocks form tight hydration complexes, establishing massive water absorption capacities.',
    standardGAB: {
      Xm25: 11.20,
      C25: 21.0,
      K25: 0.85,
      delHc: 15.5,
      delHk: -1.6
    },
    literatureNotes: 'Shows strong sigmoidal moisture profiles. Exhibits great swelling potential. Exceeding 60% RH turns the powder into a highly cohesive gel, causing flow blockages.'
  },
  {
    id: 'gum_arabic',
    name: 'Gum Arabic (Pharma/Food)',
    category: 'Binder / Food',
    description: 'Exudate from Acacia senegal trees. A highly branched complex glycoprotein binder and microencapsulating agent.',
    hygroscopicityClass: 'Very hygroscopic',
    criticalRH: 65,
    molecularRole: 'High molecular weight arabinogalactan proteins display extensive branching, offering a vast array of hydrogen-bonding terminals.',
    standardGAB: {
      Xm25: 10.00,
      C25: 18.0,
      K25: 0.84,
      delHc: 14.2,
      delHk: -1.4
    },
    literatureNotes: 'Absorbs up to 12.5% moisture at 50% RH and over 30% under damp environments. Widely used in food spray-drying of volatile flavors and lipids to stabilize them from humidity oxidation.'
  },
  {
    id: 'maltodextrin',
    name: 'Maltodextrin DE19 (Food)',
    category: 'Diluent / Food',
    description: 'Slightly hydrolyzed food starch polymer. Extensively utilized as an encapsulation agent, food bulking diluent, and beverage dispersant.',
    hygroscopicityClass: 'Very hygroscopic',
    criticalRH: 55,
    molecularRole: 'Amorphous dextrose equivalent networks contain many open glucose-chain ends that lock water down in monomolecular arrays.',
    standardGAB: {
      Xm25: 8.50,
      C25: 15.5,
      K25: 0.88,
      delHc: 12.5,
      delHk: -1.5
    },
    literatureNotes: 'Amorphous state triggers plasticization and glass transition. Stored above 55% RH, maltodextrin collapses into a sticky, dense, structural caramel-like liquid.'
  },
  {
    id: 'whey_protein',
    name: 'Whey Protein Isolate (Food)',
    category: 'Active Powder / Food',
    description: 'highly purified dairy protein containing beta-lactoglobulin and alpha-lactalbumin. Used as nutritional bulking powder and emulsion stabilizer.',
    hygroscopicityClass: 'Moderately hygroscopic',
    criticalRH: 70,
    molecularRole: 'Peptide amino sidegroups, and amorphous protein folding geometries, trap moisture in localized pockets, showing stable hydration until high water activity.',
    standardGAB: {
      Xm25: 6.50,
      C25: 12.0,
      K25: 0.80,
      delHc: 11.0,
      delHk: -1.0
    },
    literatureNotes: 'Equilibrates to ~8% water at 50% RH. Above 70% RH, protein chains become highly mobile, facilitating lactose crystallization if spray-dried whey fractions contain amorphous lactose.'
  },
  {
    id: 'urea_fertilizer',
    name: 'Urea Granules (Agriculture)',
    category: 'Agriculture',
    description: 'High-nitrogen organic chemical compound (NH2)2CO. Universally utilized solid nitrogen fertilizer granule.',
    hygroscopicityClass: 'Deliquescent',
    criticalRH: 72,
    molecularRole: 'An extremely polar crystalline molecule. Below 70% RH moisture sorption is strictly restricted to superficial crystals. At deliquescence, the entire bulk dissolves.',
    standardGAB: {
      Xm25: 0.25,
      C25: 4.5,
      K25: 0.86,
      delHc: 7.0,
      delHk: -0.5
    },
    literatureNotes: 'Extremely critical deliquescence. While absorbing less than 0.3% w/w water at 65% RH, keeping it above 73% RH results in spontaneous conversion to a nitrogen-rich liquid sludge.'
  },
  {
    id: 'ammonium_sulfate',
    name: 'Ammonium Sulfate (Agriculture)',
    category: 'Agriculture',
    description: 'Crystalline inorganic fertilizer salt (NH4)2SO4, supplying primary nitrogen and sulfur minerals.',
    hygroscopicityClass: 'Slightly hygroscopic',
    criticalRH: 79,
    molecularRole: 'Strong ionic crystal lattice excludes water infiltration. Only surface moisture condensation occurs until its critical deliquescence boundary is breached.',
    standardGAB: {
      Xm25: 0.30,
      C25: 5.0,
      K25: 0.74,
      delHc: 7.5,
      delHk: -0.4
    },
    literatureNotes: 'Maintains zero bulk water sorption up to 78% RH. Excellent physical storage characteristics; less prone to caking than urea or ammonium nitrate in high tropical humidities.'
  },
  {
    id: 'bentonite_clay',
    name: 'Bentonite Clay (Agriculture/Pharma)',
    category: 'Adsorbent / Agriculture',
    description: 'Natural colloidal aluminum silicate clay (montmorillonite). Extensively used as soil moisture-retainer, wine clarifier, and binding agent.',
    hygroscopicityClass: 'Very hygroscopic',
    criticalRH: 65,
    molecularRole: 'Three-layer crystalline sheets have dynamic interlayer spacing that attracts water molecules physically, causing massive crystalline swelling.',
    standardGAB: {
      Xm25: 12.50,
      C25: 24.0,
      K25: 0.82,
      delHc: 16.5,
      delHk: -1.8
    },
    literatureNotes: 'Highly superior adsorbent. At 50% RH, can absorb over 14% water and is able to swell to multiple times its dry volume. Protect in moisture-proof drums.'
  },
  {
    id: 'diatomaceous_earth',
    name: 'Diatomaceous Earth (Agriculture)',
    category: 'Glidant / Agriculture',
    description: 'Geologically fossilized siliceous diatom skeletal remains. Natural anti-clumping flow aid and mechanical insecticide carrier.',
    hygroscopicityClass: 'Moderately hygroscopic',
    criticalRH: 75,
    molecularRole: 'Highly porous micro-spherical silica skeletons absorb water physically by capillary suction into skeletal pores rather than chemical bonding.',
    standardGAB: {
      Xm25: 4.20,
      C25: 10.5,
      K25: 0.80,
      delHc: 9.5,
      delHk: -0.8
    },
    literatureNotes: 'Has outstanding flow-enhancement. Excellent as physical anti-caking agent for agricultural fertilizer blends, preventing sticky bridges from forming.'
  },
  {
    id: 'trehalose_di',
    name: 'Trehalose Dihydrate (Pharma)',
    category: 'Diluent',
    description: 'Highly stable non-reducing alpha-D-glucopyranosyl disaccharide. An outstanding protein stabilizer (lyoprotectant) in biologics.',
    hygroscopicityClass: 'Slightly hygroscopic',
    criticalRH: 85,
    molecularRole: 'Crystalline dihydrate captures two stoichiometric water molecules tightly, creating a stable chemical matrix with minimal surface hygroscopicity.',
    standardGAB: {
      Xm25: 0.35,
      C25: 6.2,
      K25: 0.75,
      delHc: 8.2,
      delHk: -0.3
    },
    literatureNotes: 'Isotherm is extremely flat up to 80% RH. Provides critical lyoprotective glass matrices that protect fragile enzymes and antibody conjugates from temperature or humidity drying stress.'
  },
  {
    id: 'carbomer_934p',
    name: 'Carbomer 934P (Pharma)',
    category: 'Binder',
    description: 'A synthetic high molecular weight polymer of acrylic acid crosslinked with allyl sucrose. Bioadhesive gel former used in gels and sustained release.',
    hygroscopicityClass: 'Very hygroscopic',
    criticalRH: 55,
    molecularRole: 'Dense collections of carboxylic acid groups polymerize to attract water, expanding polymer grids into viscous mucilaginous gels.',
    standardGAB: {
      Xm25: 12.80,
      C25: 26.0,
      K25: 0.88,
      delHc: 18.0,
      delHk: -2.0
    },
    literatureNotes: 'Highly superior water binder. Absorbs over 15% water at 50% RH. Rapidly develops solid-state viscous friction, slowing down formulation tablet compaction rates.'
  },
  {
    id: 'poloxamer_188',
    name: 'Poloxamer 188 (Pharma)',
    category: 'Diluent',
    description: 'Synthetic polyoxyethylene-polyoxypropylene block copolymer (Pluronic® F68). Universal solubilizer, solid dispersant, and wetting agent.',
    hygroscopicityClass: 'Deliquescent',
    criticalRH: 70,
    molecularRole: 'Hydrophilic ethylene oxide chain fragments form strong coordinate linkages with gaseous vapor, dissolving the low-melting polymeric matrix.',
    standardGAB: {
      Xm25: 2.40,
      C25: 7.8,
      K25: 0.89,
      delHc: 9.2,
      delHk: -1.5
    },
    literatureNotes: 'Exhibits sudden hygroscopic solubilization above 70% RH, dissolving the solid wax. Keep below 65% RH in tight packages to prevent solidification caking.'
  },
  {
    id: 'sodium_stearyl_fumarate',
    name: 'Sodium Stearyl Fumarate (Pharma)',
    category: 'Lubricant',
    description: 'Hydrophilic tablet lubricant (PRUV®). Avoids common tablet capping and dissolution slowdown challenges of magnesium stearate.',
    hygroscopicityClass: 'Non-hygroscopic',
    criticalRH: 85,
    molecularRole: 'The stearic carbon chains repel bulk condensation, while the sodium carboxylate group provides mild water hydrophilic wetting.',
    standardGAB: {
      Xm25: 0.22,
      C25: 3.5,
      K25: 0.65,
      delHc: 5.8,
      delHk: -0.2
    },
    literatureNotes: 'Maintains extreme dryness (<0.5%) up to 85% RH. Far superior in tablet hardness retention because its hydrophilic links prevent dry core capping.'
  },
  {
    id: 'calcium_carbonate',
    name: 'Calcium Carbonate (Pharma/Food)',
    category: 'Diluent / Food',
    description: 'Dense mineral filler used as antacid active, calcium dietary adjuvant, and strong solid tablet diluent.',
    hygroscopicityClass: 'Non-hygroscopic',
    criticalRH: 90,
    molecularRole: 'Extremely dense ionic crystal lattice bounds atoms rigidly. Gaseous water molecules cannot infiltrate, demonstrating high dry properties.',
    standardGAB: {
      Xm25: 0.08,
      C25: 2.5,
      K25: 0.50,
      delHc: 4.0,
      delHk: -0.1
    },
    literatureNotes: 'Absorbs practically zero moisture (<0.2%) under 90% RH. Highly stable, economic, and completely resistant to environmental humidity in all global storage rooms.'
  },
  {
    id: 'paracetamol_api',
    name: 'Paracetamol (Acetaminophen) (API)',
    category: 'API / Active Pharmaceutical Ingredient',
    description: 'A widely used analgesic and antipyretic active pharmaceutical ingredient in stable crystalline form.',
    hygroscopicityClass: 'Slightly hygroscopic',
    criticalRH: 85,
    molecularRole: 'Crystalline lattice allows low moisture interaction on crystal surfaces. Adsorption remains stable until critical structural cracking or dissolution occurs.',
    standardGAB: {
      Xm25: 0.45,
      C25: 5.5,
      K25: 0.72,
      delHc: 6.2,
      delHk: -0.4
    },
    literatureNotes: 'Highly stable during storage. Equilibrium moisture content stays below 1.5% w/w at 75% RH. Prone to capping during heavy tableting if moisture level fluctuates too high.'
  },
  {
    id: 'ibuprofen_api',
    name: 'Ibuprofen (API)',
    category: 'API / Active Pharmaceutical Ingredient',
    description: 'A hydrophobic non-steroidal anti-inflammatory drug (NSAID) with low water solubility and minimal surface hydration.',
    hygroscopicityClass: 'Non-hygroscopic',
    criticalRH: 90,
    molecularRole: 'Lipophilic aromatic rings and aliphatic chains repel water condensation. Sorption is strictly localized to microscopic crystal boundaries.',
    standardGAB: {
      Xm25: 0.12,
      C25: 2.8,
      K25: 0.58,
      delHc: 4.5,
      delHk: -0.1
    },
    literatureNotes: 'Exhibits nearly zero moisture uptake (<0.25% w/w) across all normal humidity zones. Physical mixtures are used to compare binder capabilities and solid dispersion flow behaviors.'
  },
  {
    id: 'metformin_hcl_api',
    name: 'Metformin Hydrochloride (API)',
    category: 'API / Active Pharmaceutical Ingredient',
    description: 'An oral biguanide anti-diabetic substance in an ionic crystalline salt structure. High water solubility and high hygroscopicity.',
    hygroscopicityClass: 'Very hygroscopic',
    criticalRH: 65,
    molecularRole: 'Strong ionic charge density on the metformin salt complex attracts water molecules into the crystalline interstitial channels rapidly.',
    standardGAB: {
      Xm25: 5.40,
      C25: 18.5,
      K25: 0.86,
      delHc: 12.8,
      delHk: -1.3
    },
    literatureNotes: 'Shows moderate moisture levels under 55% RH but quickly exceeds 8% w/w at humidities past its critical RH of 65%. Requires immediate protection via high-density polyethylene drums or PVDC coated blister foils.'
  },
  {
    id: 'ranitidine_hcl_api',
    name: 'Ranitidine Hydrochloride (API)',
    category: 'API / Active Pharmaceutical Ingredient',
    description: 'An H2-receptor antagonist active substance used to treat gastric acid, known for severe solid state degradation in humid conditions.',
    hygroscopicityClass: 'Deliquescent',
    criticalRH: 60,
    molecularRole: 'Hydrophilic nitroethenediamine polar structures form rapid, strong hydrogen bonds with gaseous water vapor, initiating spontaneous liquid-phase dissolving behavior.',
    standardGAB: {
      Xm25: 4.80,
      C25: 14.0,
      K25: 0.88,
      delHc: 11.2,
      delHk: -1.4
    },
    literatureNotes: 'Fades and darkens dramatically when exposed to humid climates above 60% due to chemical hydrolysis of active groups. Must be processed and packaged under strict 30% relative humidity parameters.'
  },
  {
    id: 'caffeine_api',
    name: 'Caffeine Anhydrous (API)',
    category: 'API / Active Pharmaceutical Ingredient',
    description: 'A xanthine alkaloid central nervous system stimulant, stable in its anhydrous crystalline polymorphic state under ambient conditions.',
    hygroscopicityClass: 'Slightly hygroscopic',
    criticalRH: 80,
    molecularRole: 'The anhydrous crystal structure displays stable resistance to environmental moisture, but transforms into caffeine hydrate above 80% RH.',
    standardGAB: {
      Xm25: 0.85,
      C25: 6.8,
      K25: 0.74,
      delHc: 7.2,
      delHk: -0.5
    },
    literatureNotes: 'Moisture uptake is minimal (under 1.0%) below 80% RH. Above 80% RH, it absorbs up to 9% w/w, transforming into the solid caffeine monohydrate state with massive change in physical powder flow.'
  }
];
