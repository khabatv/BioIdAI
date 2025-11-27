import { GoogleGenAI} from "@google/genai";
import { GeminiApiResponse, ApiProvider, OntologyType } from "../types";

// --- Gemini-Specific Implementation ---

const getGeminiClient = (apiKey?: string) => {
    const key = apiKey || import.meta.env.VITE_GEMINI_API_KEY as string;
    if (!key) {
        throw new Error("API key is not provided. Please set it in the API Settings or environment variables.");
    }
    return new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
};

const getResponseSchema = (ontology: OntologyType) => {
    const schema = {
        type: Type.OBJECT,
        properties: {
            corrected_name: { type: Type.STRING, description: "The spell-corrected name of the entity." },
            entity_type: { type: Type.STRING, description: "The determined type: 'chemical', 'protein', 'gene', or 'unknown'." },
            synonyms: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of common synonyms." },
            resolved_name: { type: Type.STRING, description: "The most common or official name for the entity." },
            validation_issues: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of issues if entity cannot be found or identified." },
            pathways: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of biological pathways this entity is involved in." },
            biological_function: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of biological functions of this entity." },
            cellular_component: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of cellular components where this entity is found." },
            identifiers: {
                type: Type.OBJECT,
                properties: {
                    "PubChem CID": { type: Type.STRING, nullable: true },
                    "ChEMBL ID": { type: Type.STRING, nullable: true },
                    "KEGG": { type: Type.STRING, nullable: true },
                    "UniProt": { type: Type.STRING, nullable: true },
                    "RefSeq": { type: Type.STRING, nullable: true },
                    "Ensembl": { type: Type.STRING, nullable: true },
                    "InterPro": { type: Type.STRING, nullable: true },
                    "InChIKey": { type: Type.STRING, nullable: true },
                    "SMILES": { type: Type.STRING, nullable: true },
                },
            },
            links: {
                type: Type.OBJECT,
                properties: {
                    "PubChem Link": { type: Type.STRING, nullable: true },
                    "ChEMBL Link": { type: Type.STRING, nullable: true },
                    "KEGG Link": { type: Type.STRING, nullable: true },
                    "UniProt Link": { type: Type.STRING, nullable: true },
                },
            }
        },
        required: ["corrected_name", "entity_type", "synonyms", "resolved_name", "validation_issues", "pathways", "biological_function", "cellular_component", "identifiers", "links"]
    };

    if (ontology !== 'None') {
        schema.properties['ontology_id'] = { type: Type.STRING, nullable: true, description: `The primary ID from the ${ontology} database (e.g., GO:0008150, CHEBI:16236).` };
        schema.properties['ontology_term'] = { type: Type.STRING, nullable: true, description: `The corresponding term name from ${ontology}.` };
    }
    
    return schema;
};

const callGeminiApi = async (prompt: string, apiKey: string | undefined, ontology: OntologyType): Promise<GeminiApiResponse> => {
     try {
        const ai = getGeminiClient(apiKey);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: getResponseSchema(ontology),
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as GeminiApiResponse;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error(`Failed to get data from Gemini. Check console for details. Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
}

// --- Generic API Service ---

const createPrompt = (
    originalName: string,
    entityTypeHint: string,
    backgroundInfo: string,
    ontology: OntologyType,
    isDeepSearch: boolean
): string => {
    const ontologyInstruction = ontology !== 'None' 
        ? `Additionally, find its corresponding term and ID from the ${ontology} database.`
        : '';
    
    if (isDeepSearch) {
        return `
        You are an expert research assistant performing a deep, exhaustive search for a biological or chemical entity. A previous quick search failed to find it. You must now try harder, using alternative search strategies.

        You MUST respond ONLY with a valid JSON object that conforms to the provided schema.

        Entity Name to Analyze: "${originalName}"
        User Provided Type Hint: "${entityTypeHint}"
        Additional Background Context: "${backgroundInfo || 'None provided.'}"

        Perform the following actions with maximum effort:
        1. The name "${originalName}" might be misspelled, an obscure synonym, or an abbreviation. Brainstorm and search for alternative spellings and related terms.
        2. Search across a WIDE range of databases. Do not give up easily. Check PubChem, ChEMBL, KEGG, UniProt, Gene Ontology, Reactome, STRING, and perform general web searches for research papers or wikis mentioning the term.
        3. Find its biological pathways (e.g., "Glycolysis").
        4. Describe its biological function (e.g., "Enzyme catalysis").
        5. Identify its cellular component/location (e.g., "Mitochondrion").
        6. ${ontologyInstruction}
        7. Retrieve any standard identifiers and direct links you can find, even if it's just one.
        8. If, after an exhaustive search, you still cannot find anything, populate 'validation_issues' with "Exhaustive search failed to find a match". Otherwise, provide as much information as you discovered.

        Return your findings in the specified JSON format.
        `;
    }
    return `
    You are an expert chemist and biologist acting as a data aggregation service. Your task is to analyze a given entity name, correct it, and find its identifiers, pathways, function, and cellular location from scientific databases.

    You MUST respond ONLY with a valid JSON object that conforms to the provided schema. Do not include any explanatory text, markdown formatting, or anything outside the JSON object.

    Entity Name to Analyze: "${originalName}"
    User Provided Type Hint: "${entityTypeHint}"
    Additional Background Context: "${backgroundInfo || 'None provided.'}"

    Based on the entity name and context, perform the following actions:
    1. Correct any spelling errors in the entity name.
    2. Determine the entity's type (e.g., 'chemical', 'protein', 'gene'). Prioritize the user's hint but correct it if it's clearly wrong.
    3. Find common synonyms for the corrected name.
    4. Search relevant databases (PubChem, ChEMBL, KEGG, UniProt, Gene Ontology, etc.).
    5. Retrieve standard identifiers and direct links.
    6. Find its biological pathways (e.g., "Glycolysis", "MAPK signaling pathway").
    7. Describe its biological function (e.g., "Enzyme catalysis", "Transcription factor").
    8. Identify its cellular component/location (e.g., "Mitochondrion", "Nucleus", "Cytoplasm").
    9. ${ontologyInstruction}
    10. If you cannot find the entity, populate 'validation_issues' with a descriptive message like "No definitive IDs found in any database". Otherwise, leave it as an empty array and fill the other fields.

    Return your findings in the specified JSON format.
    `;
};


export const fetchEntityInfo = async (
    provider: ApiProvider,
    apiKey: string,
    originalName: string,
    entityTypeHint: string,
    backgroundInfo: string,
    ontology: OntologyType,
    isDeepSearch: boolean
): Promise<GeminiApiResponse> => {
    const prompt = createPrompt(originalName, entityTypeHint, backgroundInfo, ontology, isDeepSearch);

    switch (provider) {
        case "Google Gemini":
            return callGeminiApi(prompt, apiKey, ontology);
        
        // --- Placeholder for other API providers ---
        case "OpenAI":
        case "Groq":
        case "Anthropic":
        // ... other cases
        default:
            console.warn(`Provider ${provider} is not implemented yet. Falling back to Google Gemini.`);
            // As a fallback for this example, we'll still call Gemini. 
            // In a real application, you would throw an error or call the specific provider's implementation.
            return callGeminiApi(prompt, apiKey, ontology);
    }
};













