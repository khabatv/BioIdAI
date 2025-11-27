
# BioIdAI – Advanced Compound & Biological ID Finder




A modern, fast, fully client-side web tool that instantly resolves chemical names, biological entities, and identifiers using AI.

**Live Demo**: https://bioidai.vercel.app *(coming in 60 seconds after you deploy)*

### Features
- Resolve any compound name → PubChem CID, SMILES, InChI, molecular formula  
- Biological entity recognition (proteins, genes, pathways, diseases)  
- Bulk processing via CSV upload  
- Interactive pie chart of result types  
- One-click CSV export with full metadata  
- 100% client-side – no backend, no server, no setup  

### Screenshots
![BioIdAI Interface](https://raw.githubusercontent.com/khabatv/BioIdAI/main/screenshot.png)

### Quick Start (5 seconds)
```bash
git clone https://github.com/khabatv/BioIdAI.git
cd BioIdAI
npm install
echo VITE_GEMINI_API_KEY=your-gemini-api-key-here > .env
npm run dev