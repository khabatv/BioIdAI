import React, { useState, useRef, useCallback, useEffect } from 'react';
import { EntityType, EntityResult, ApiProvider, OntologyType, SessionState } from './types';
import { fetchEntityInfo } from './services/geminiService';
import { generateAndDownloadCsv } from './utils/csvHelper';

type AnalysisPhase = 'idle' | 'initial' | 'deep_search_pending' | 'deep_searching' | 'complete';
type AppTab = 'setup' | 'execution' | 'results';

// --- Helper Icon Components ---
const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>);
const PlayIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
const StopIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 10l-2 2" /></svg>);
const HelpIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
const SettingsIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>);
const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>);
const SaveIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>);
const LoadIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5V4M4 15v5h5v-5M15 4v5h5V4M15 15v5h5v-5" /></svg>);


// --- UI Components ---
const ResultsTable: React.FC<{ results: EntityResult[] }> = ({ results }) => {
    if (results.length === 0) return null;
    const headers = ["Input", "Resolved", "Type", "Ontology Term", "Key ID", "Time (s)", "Issues"];
    return (
        <div className="mt-4"><h3 className="text-lg font-bold text-slate-700 mb-3">Results</h3><div className="overflow-x-auto bg-white rounded-lg shadow-md border border-slate-200"><table className="min-w-full divide-y divide-slate-200"><thead className="bg-slate-50"><tr>{headers.map(header => (<th key={header} scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{header}</th>))}</tr></thead><tbody className="bg-white divide-y divide-slate-200">{results.map((result, index) => (<tr key={`${result["Input Entity"]}-${index}`} className="hover:bg-slate-50 transition-colors duration-150"><td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">{result["Input Entity"]}</td><td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">{result["Resolved Name"] || 'N/A'}</td><td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">{result["Entity Type"] || 'N/A'}</td><td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">{result["Ontology Term"] || 'N/A'}</td><td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">{result["UniProt"] || result["PubChem CID"] || 'N/A'}</td><td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">{result["Processing Time (s)"]?.toFixed(2) ?? 'N/A'}</td><td className="px-4 py-3 whitespace-normal text-sm text-amber-600">{result["Validation Issues"]}</td></tr>))}</tbody></table></div></div>
    );
};

const VisualizationDashboard: React.FC<{ results: EntityResult[] }> = ({ results }) => {
    const chartRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (results.length > 0 && chartRef.current) {
            const typeCounts = results.reduce((acc, result) => {
                const type = result["Entity Type"] || 'Unknown';
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {} as { [key: string]: number });

            const data = [{
                values: Object.values(typeCounts),
                labels: Object.keys(typeCounts),
                type: 'pie',
                hole: .4,
                hoverinfo: 'label+percent',
                textinfo: 'value',
                automargin: true,
            }];

            const layout = {
                title: 'Entity Type Distribution',
                showlegend: true,
                height: 400,
                margin: { t: 50, b: 50, l: 50, r: 50 },
            };

            (window as any).Plotly.newPlot(chartRef.current, data, layout, {responsive: true});
        }
    }, [results]);

    if (results.length === 0) return null;

    return (
        <div className="mt-4">
             <h3 className="text-lg font-bold text-slate-700 mb-3">Visualizations</h3>
             <div ref={chartRef} className="bg-white rounded-lg shadow-md border border-slate-200 p-4"></div>
        </div>
    );
};


const HelpModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 p-5 flex justify-between items-center"><h2 className="text-2xl font-bold text-slate-800">How to Use This App</h2><button onClick={onClose} className="text-slate-500 hover:text-slate-800"><CloseIcon className="h-7 w-7" /></button></div>
            <div className="p-6 space-y-6"><div className="prose prose-slate max-w-none">
                <p>This guide will walk you through using the Advanced ID Finder to get the most out of its features.</p>
                <h4><span className="font-mono text-indigo-600 bg-indigo-100 px-2 py-1 rounded">1.</span> Setup Tab</h4>
                <ul className="space-y-2">
                    <li><strong>API Settings:</strong> Choose your AI provider and enter your API key. For Google Gemini, an environment key can be used if you leave it blank.</li>
                    <li><strong>Search Options:</strong> Provide an entity type hint, optional background context, and select an Ontology (e.g., Gene Ontology, ChEBI) to enrich your results.</li>
                    <li><strong>Load List:</strong> Upload a `.txt` file or paste your entity list directly.</li>
                </ul>
                 <h4><span className="font-mono text-indigo-600 bg-indigo-100 px-2 py-1 rounded">2.</span> Execution Tab</h4>
                <ul className="space-y-2">
                    <li><strong>Session Management:</strong> Use "Save Session" to store your progress in the browser. "Load Last Session" will restore your previous work.</li>
                    <li><strong>Run Analysis:</strong> Start the process here. Monitor the progress bar and live log window for updates.</li>
                    <li><strong>Deep Search:</strong> If some entities fail, a "Deep Search" button will appear to run a more exhaustive search on just those items.</li>
                </ul>
                 <h4><span className="font-mono text-indigo-600 bg-indigo-100 px-2 py-1 rounded">3.</span> Results & Visualization Tab</h4>
                <ul className="space-y-2">
                    <li><strong>Results Table:</strong> View your results in real-time as they are processed.</li>
                    <li><strong>Visualization:</strong> An interactive pie chart shows the distribution of identified entity types.</li>
                    <li><strong>Download:</strong> A CSV file of your results is downloaded automatically after each analysis phase completes.</li>
                </ul>
            </div></div>
        </div>
    </div>
);

const ApiKeyStatus: React.FC<{ provider: ApiProvider; apiKey: string }> = ({ provider, apiKey }) => {
    if (apiKey) return <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">User Key Provided</span>;
    if (provider === 'Google Gemini') return <span className="px-2 py-1 text-xs font-medium text-sky-800 bg-sky-100 rounded-full">Environment Default</span>;
    return <span className="px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded-full">Key Required</span>;
};

const SESSION_STORAGE_KEY = 'bioIdAiSession';

const App: React.FC = () => {
    // State management
    const [entityList, setEntityList] = useState<string[]>([]);
    const [entityType, setEntityType] = useState<EntityType>("Auto");
    const [backgroundInfo, setBackgroundInfo] = useState('');
    const [ontology, setOntology] = useState<OntologyType>("None");
    const [logs, setLogs] = useState<string[]>(["Welcome! Please load your data in the Setup tab."]);
    const [progress, setProgress] = useState(0);
    const [totalForProgress, setTotalForProgress] = useState(0);
    const [results, setResults] = useState<EntityResult[]>([]);
    const [fileName, setFileName] = useState<string>('');
    const [analysisPhase, setAnalysisPhase] = useState<AnalysisPhase>('idle');
    const [textAreaContent, setTextAreaContent] = useState('');
    const [apiProvider, setApiProvider] = useState<ApiProvider>('Google Gemini');
    const [apiKey, setApiKey] = useState('');
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<AppTab>('setup');

    const runningRef = useRef(false);
    const logContainerRef = useRef<HTMLDivElement>(null);
    const apiProviders: ApiProvider[] = ["Google Gemini", "OpenAI", "Groq", "Anthropic", "Cohere", "Mistral AI", "Perplexity", "Together AI"];
    const ontologies: OntologyType[] = ["None", "Gene Ontology", "ChEBI", "MeSH"];

    // Effects
    useEffect(() => {
        if (logContainerRef.current) logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }, [logs]);

    // Callbacks and handlers
    const addLog = useCallback((message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    }, []);
    
    const handleSaveSession = () => {
        try {
            const sessionState: SessionState = {
                entityList, entityType, backgroundInfo, ontology, results, logs,
                analysisPhase, apiProvider, textAreaContent, fileName
            };
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionState));
            addLog("Session saved successfully to browser storage.");
        } catch (error) {
            addLog("Error saving session. Browser storage might be full or disabled.");
            console.error("Failed to save session:", error);
        }
    };
    
    const handleLoadSession = () => {
        try {
            const savedStateJSON = localStorage.getItem(SESSION_STORAGE_KEY);
            if (savedStateJSON) {
                const savedState: SessionState = JSON.parse(savedStateJSON);
                setEntityList(savedState.entityList);
                setEntityType(savedState.entityType);
                setBackgroundInfo(savedState.backgroundInfo);
                setOntology(savedState.ontology);
                setResults(savedState.results);
                setLogs(savedState.logs);
                setAnalysisPhase(savedState.analysisPhase as AnalysisPhase);
                setApiProvider(savedState.apiProvider);
                setTextAreaContent(savedState.textAreaContent);
                setFileName(savedState.fileName);
                addLog("Successfully loaded previous session.");
            } else {
                addLog("No saved session found.");
            }
        } catch (error) {
            addLog("Error loading session. Saved data might be corrupt.");
            console.error("Failed to load session:", error);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                setEntityList(lines);
                setFileName(file.name);
                setTextAreaContent('');
                addLog(`Loaded ${lines.length} entities from ${file.name}`);
            };
            reader.readAsText(file);
            event.target.value = '';
        }
    };
    
    const handleTextAreaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const content = event.target.value;
        setTextAreaContent(content);
        const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        setEntityList(lines);
        if (lines.length > 0) setFileName('');
    };
    
    const handleStop = () => {
        runningRef.current = false;
        addLog("Stop signal received. Finishing current entity...");
    };

    const processEntity = async (entity: string, isDeepSearch: boolean) => {
        const startTime = performance.now();
        const apiResponse = await fetchEntityInfo(apiProvider, apiKey, entity, entityType, backgroundInfo, ontology, isDeepSearch);
        const endTime = performance.now();
        const result: EntityResult = {
            "Input Entity": entity,
            "Corrected Name by AI": apiResponse.corrected_name !== entity ? apiResponse.corrected_name : "",
            "Entity Type": apiResponse.entity_type,
            "Resolved Name": apiResponse.resolved_name,
            "Validation Issues": apiResponse.validation_issues.join('; '),
            "Pathways": apiResponse.pathways.join('; '),
            "Function": apiResponse.biological_function.join('; '),
            "Cellular Component": apiResponse.cellular_component.join('; '),
            "Ontology ID": apiResponse.ontology_id,
            "Ontology Term": apiResponse.ontology_term,
            ...apiResponse.identifiers,
            ...apiResponse.links,
            "Processing Time (s)": (endTime - startTime) / 1000,
        };
        return result;
    };

    const runAnalysis = async (list: string[], isDeepSearch: boolean) => {
        const currentResults = isDeepSearch ? [...results] : [];
        setTotalForProgress(list.length);
        let totalTime = 0;
        
        for (let i = 0; i < list.length; i++) {
            if (!runningRef.current) { addLog(`Analysis stopped by user.`); break; }
            const entity = list[i];
            addLog(`${isDeepSearch ? "Deep searching" : "Processing"} (${i + 1}/${list.length}): ${entity}`);
            
            try {
                if (i > 0) await new Promise(resolve => setTimeout(resolve, 1500)); // Rate limiting
                const result = await processEntity(entity, isDeepSearch);
                totalTime += result["Processing Time (s)"] || 0;

                if (isDeepSearch) {
                    const resultIndex = currentResults.findIndex(r => r["Input Entity"] === entity);
                    if(resultIndex !== -1) currentResults[resultIndex] = result;
                } else {
                    currentResults.push(result);
                }
                addLog(`Processed: ${entity} -> ${result["Resolved Name"] || 'Not Resolved'}`);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
                addLog(`Error processing '${entity}': ${errorMessage}`);
                if (!isDeepSearch) {
                     currentResults.push({ "Input Entity": entity, "Validation Issues": `Failed to process: ${errorMessage}` } as EntityResult);
                }
            }
            setResults([...currentResults]);
            setProgress(i + 1);
        }
        
        const resolvedCount = currentResults.filter(r => !r["Validation Issues"]).length;
        addLog(`--- Run Phase Complete ---`);
        addLog(`Total Processed: ${list.length}`);
        addLog(`Successfully Resolved: ${resolvedCount} (${((resolvedCount / list.length) * 100 || 0).toFixed(1)}%)`);
        addLog(`Average Time/Entity: ${(totalTime / list.length || 0).toFixed(2)}s`);
        
        return currentResults;
    }

    const handleStart = async () => {
        if (entityList.length === 0) { addLog("Error: No entities loaded."); return; }
        if (apiProvider !== 'Google Gemini' && !apiKey) { addLog(`Error: API Key is required for ${apiProvider}.`); return; }
        setActiveTab('execution');
        setAnalysisPhase('initial');
        runningRef.current = true;
        setResults([]);
        setProgress(0);
        addLog(`--- Analysis started for ${entityList.length} entities using ${apiProvider} ---`);
        const newResults = await runAnalysis(entityList, false);
        const runId = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        generateAndDownloadCsv(newResults, `results-initial-${runId}.csv`);
        addLog(`Initial analysis complete. CSV file generated.`);
        const failedEntities = newResults.filter(r => r["Validation Issues"]);
        if (failedEntities.length > 0 && runningRef.current) {
            setAnalysisPhase('deep_search_pending');
        } else {
            setAnalysisPhase('complete');
        }
        runningRef.current = false;
        setActiveTab('results');
    };

    const handleDeepSearch = async () => {
        const failedEntitiesList = results.filter(r => r["Validation Issues"]).map(r => r["Input Entity"]);
        if (failedEntitiesList.length === 0) { addLog("No failed entities to deep search."); return; }
        setActiveTab('execution');
        setAnalysisPhase('deep_searching');
        runningRef.current = true;
        setProgress(0);
        addLog(`--- Deep Search started for ${failedEntitiesList.length} entities ---`);
        const finalResults = await runAnalysis(failedEntitiesList, true);
        const runId = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        generateAndDownloadCsv(finalResults, `results-final-${runId}.csv`);
        addLog(`Deep search complete. Final CSV file generated.`);
        setAnalysisPhase('complete');
        runningRef.current = false;
        setActiveTab('results');
    };

    const isProcessing = analysisPhase === 'initial' || analysisPhase === 'deep_searching';
    const failedCount = results.filter(r => r["Validation Issues"]).length;

    const TabButton: React.FC<{ tabId: AppTab; title: string }> = ({ tabId, title }) => (
        <button onClick={() => setActiveTab(tabId)} className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === tabId ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}>
            {title}
        </button>
    );

    return (
        <>
            {isHelpOpen && <HelpModal onClose={() => setIsHelpOpen(false)} />}
            <div className="min-h-screen bg-slate-100 flex flex-col items-center p-4 sm:p-6 lg:p-8">
                <div className="w-full max-w-6xl mx-auto">
                    <header className="text-center mb-6 relative">
                        <h1 className="text-4xl font-bold text-slate-800">BioIdAI</h1>
                        <p className="text-slate-600 mt-2">Compound & Biological ID Finder: Use AI to correct, identify, and annotate entities</p>
                         <button onClick={() => setIsHelpOpen(true)} className="absolute top-0 right-0 p-2 text-slate-500 hover:text-blue-600 transition-colors" aria-label="Help">
                            <HelpIcon className="h-8 w-8" />
                        </button>
                    </header>

                    <main className="bg-white rounded-lg shadow-xl p-6 border border-slate-200">
                        <div className="border-b border-slate-200 mb-6">
                            <nav className="flex space-x-4" aria-label="Tabs">
                                <TabButton tabId="setup" title="1. Setup" />
                                <TabButton tabId="execution" title="2. Execution" />
                                <TabButton tabId="results" title="3. Results & Visualization" />
                            </nav>
                        </div>
                        
                        {/* Setup Tab */}
                        <div className={activeTab === 'setup' ? '' : 'hidden'}>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <div className="p-4 border border-slate-200 rounded-lg space-y-4">
                                        <h2 className="text-xl font-bold text-slate-700 flex items-center"><SettingsIcon className="h-6 w-6 mr-2 text-slate-500" />API Settings</h2>
                                        <div><label htmlFor="apiProvider" className="block text-sm font-medium text-slate-600 mb-1">Active API Provider</label><select id="apiProvider" value={apiProvider} onChange={e => setApiProvider(e.target.value as ApiProvider)} className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900">{apiProviders.map(p => <option key={p}>{p}</option>)}</select></div>
                                        <div><label htmlFor="apiKey" className="block text-sm font-medium text-slate-600 mb-1">API Key</label><input type="password" id="apiKey" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={apiProvider === 'Google Gemini' ? 'Using environment key if empty' : 'Enter your API key'} className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900" /></div>
                                    </div>
                                    <div className="p-4 border border-slate-200 rounded-lg space-y-4 mt-6">
                                        <h2 className="text-lg font-bold text-slate-700">Search Options</h2>
                                        <div><label htmlFor="entityType" className="block text-sm font-medium text-slate-600 mb-1">Entity Type Hint</label><select id="entityType" value={entityType} onChange={e => setEntityType(e.target.value as EntityType)} className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900"><option>Auto</option><option>Chemical</option><option>Protein</option><option>Gene</option></select></div>
                                        <div><label htmlFor="ontology" className="block text-sm font-medium text-slate-600 mb-1">Ontology Mapping</label><select id="ontology" value={ontology} onChange={e => setOntology(e.target.value as OntologyType)} className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900">{ontologies.map(o => <option key={o}>{o}</option>)}</select></div>
                                        <div><label htmlFor="backgroundInfo" className="block text-sm font-medium text-slate-600 mb-1">Background Information (Optional)</label><textarea id="backgroundInfo" rows={3} value={backgroundInfo} onChange={e => setBackgroundInfo(e.target.value)} placeholder="e.g., 'These are phytohormones involved in plant growth.'" className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900"/></div>
                                    </div>
                                </div>
                                <div className="p-4 border border-slate-200 rounded-lg flex flex-col"><h2 className="text-lg font-bold text-slate-700 mb-3">Load Your Entity List</h2><div className="flex-grow flex flex-col justify-center bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg p-6 text-center"><UploadIcon className="h-12 w-12 text-slate-400 mx-auto" /><label htmlFor="file-upload" className="mt-4 cursor-pointer bg-white px-3 py-2 text-sm font-semibold text-indigo-600 rounded-md shadow-sm hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"><span>Select a .txt file</span><input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".txt" onChange={handleFileChange} /></label><div className="relative my-4"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-300" /></div><div className="relative flex justify-center"><span className="bg-slate-50 px-2 text-sm text-slate-500">OR</span></div></div><label htmlFor="text-input" className="sr-only">Paste your list</label><textarea id="text-input" rows={6} value={textAreaContent} onChange={handleTextAreaChange} placeholder="Paste your list here, one per line..." className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white text-slate-900"/><p className="mt-4 text-sm text-slate-600 font-medium">{entityList.length > 0 ? `${entityList.length} ${entityList.length === 1 ? 'entity' : 'entities'} loaded` : "Awaiting entity list..."}{fileName && <span className="text-slate-500 font-normal"> from {fileName}</span>}</p></div></div>
                            </div>
                        </div>
                        
                        {/* Execution Tab */}
                         <div className={activeTab === 'execution' ? '' : 'hidden'}>
                            <div className="p-4 border border-slate-200 rounded-lg">
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 flex items-center justify-between flex-wrap gap-4">
                                    <div className="flex items-center space-x-2"><span className="text-sm font-medium text-slate-600">API in Use:</span><span className="font-bold text-slate-800">{apiProvider}</span></div>
                                    <div className="flex items-center space-x-2"><span className="text-sm font-medium text-slate-600">API Key Status:</span><ApiKeyStatus provider={apiProvider} apiKey={apiKey} /></div>
                                    <div className="flex items-center space-x-2">
                                        <button onClick={handleSaveSession} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-slate-600 hover:bg-slate-700"><SaveIcon className="h-4 w-4 mr-2"/>Save Session</button>
                                        <button onClick={handleLoadSession} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-slate-600 hover:bg-slate-700"><LoadIcon className="h-4 w-4 mr-2"/>Load Last Session</button>
                                    </div>
                                </div>
                                
                                <div className="flex space-x-4">
                                    <button onClick={handleStart} disabled={isProcessing || entityList.length === 0 || analysisPhase === 'deep_search_pending' || analysisPhase === 'complete'} className="flex-1 inline-flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-slate-400 disabled:cursor-not-allowed"><PlayIcon className="h-5 w-5 mr-2" />Start Analysis</button>
                                    <button onClick={handleStop} disabled={!isProcessing} className="flex-1 inline-flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:bg-slate-400 disabled:cursor-not-allowed"><StopIcon className="h-5 w-5 mr-2" />Stop Analysis</button>
                                </div>

                                {analysisPhase === 'deep_search_pending' && (
                                    <div className="mt-4 p-4 border border-amber-300 bg-amber-50 rounded-lg"><h3 className="text-md font-bold text-slate-700 mb-2">Deep Search Ready</h3><p className="text-slate-600 mb-4 text-sm">{failedCount} {failedCount === 1 ? 'entity' : 'entities'} could not be identified. You can run a more intensive, slower search to try and find them.</p><button onClick={handleDeepSearch} className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"><SearchIcon className="h-5 w-5 mr-2" />Start Deep Search for {failedCount} {failedCount === 1 ? 'Item' : 'Items'}</button></div>
                                )}

                                <div className="mt-4">
                                    <h3 className="text-md font-semibold mb-2">Progress</h3>
                                    <div className="w-full bg-slate-200 rounded-full h-4"><div className="bg-indigo-600 h-4 rounded-full transition-all duration-500" style={{ width: `${(progress / (totalForProgress || 1)) * 100}%` }}></div></div>
                                    <p className="text-sm text-slate-600 text-right mt-1">{progress} / {totalForProgress}</p>
                                    <h3 className="text-md font-semibold mt-4 mb-2">Logs</h3>
                                    <div ref={logContainerRef} className="bg-slate-800 text-white font-mono text-sm rounded-md p-4 h-64 overflow-y-auto">{logs.map((log, i) => <p key={i} className="whitespace-pre-wrap">{log}</p>)}</div>
                                </div>
                            </div>
                        </div>

                        {/* Results Tab */}
                        <div className={activeTab === 'results' ? '' : 'hidden'}>
                            {results.length > 0 ? (
                                <>
                                  <ResultsTable results={results} />
                                  <VisualizationDashboard results={results} />
                                </>
                            ) : (
                                <div className="text-center py-16">
                                    <h3 className="text-lg font-medium text-slate-700">No results to display.</h3>
                                    <p className="text-slate-500 mt-2">Complete an analysis on the 'Execution' tab to see your results here.</p>
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>
        </>
    );
};

export default App;












