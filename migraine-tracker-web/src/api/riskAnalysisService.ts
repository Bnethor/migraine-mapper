import { api } from './apiClient';
import type { ApiResponse } from '../types';

export interface RiskAnalysisPrompt {
  prompt: string;
  summary: {
    hasWearableData: boolean;
    dataPoints: number;
    patternCount: number;
    migraineType: string;
    timeRange: {
      start: string;
      end: string;
    } | null;
  };
  metadata: {
    generatedAt: string;
    dataPointsCount: number;
    patternsCount: number;
    hasProfile: boolean;
    timeRange: {
      start: string;
      end: string;
    };
  };
}

export interface RiskAnalysisData {
  wearableData: Array<{
    timestamp: string;
    stress: number | null;
    recovery: number | null;
    heartRate: number | null;
    hrv: number | null;
    sleepEfficiency: number | null;
    sleepHeartRate: number | null;
    skinTemperature: number | null;
    restlessPeriods: number | null;
  }>;
  patterns: Array<{
    patternType: string;
    patternName: string;
    patternDefinition: string;
    thresholdValue: number | null;
    correlationStrength: number | null;
    confidenceScore: number | null;
  }>;
  timeRange: {
    start: string;
    end: string;
  };
  dataPointsCount: number;
  patternsCount: number;
}

export interface SimulatedMetrics {
  stress?: number;
  recovery?: number;
  hrv?: number;
  heartRate?: number;
  sleepEfficiency?: number;
  skinTemp?: number;
}

/**
 * Get formatted AI prompt for migraine risk analysis
 */
export const getRiskAnalysisPrompt = async (simulatedData?: SimulatedMetrics): Promise<
  ApiResponse<RiskAnalysisPrompt>
> => {
  if (simulatedData) {
    return api.post<RiskAnalysisPrompt>('/risk-prediction/prompt', { simulatedData });
  }
  return api.get<RiskAnalysisPrompt>('/risk-prediction/prompt');
};

/**
 * Get raw data for risk prediction (24h data + patterns)
 */
export const getRiskAnalysisData = async (): Promise<
  ApiResponse<RiskAnalysisData>
> => {
  return api.get<RiskAnalysisData>('/risk-prediction/data');
};

export interface AIAnalysisResponse {
  riskLevel: number; // 0-100
  riskCategory: string; // Low, Moderate, High, Very High
  keyRiskFactors: string[];
  trendAnalysis: string;
  recommendations: string[];
  confidenceLevel: string; // Low, Medium, High
  fullAnalysis: string;
}

/**
 * Call DigitalOcean AI agent with the prompt
 */
export const callAIAgent = async (prompt: string): Promise<AIAnalysisResponse> => {
  const AI_AGENT_URL = 'https://lerrqtyr45trfkm5hhmzek2y.agents.do-ai.run/api/v1/chat/completions';
  
  // Get AI agent API key from environment or localStorage
  // Note: Even "public" agents require an API key for programmatic API access
  // The embedded widget works differently (loaded from agent's domain)
  const apiKey = import.meta.env.VITE_DO_AI_AGENT_API_KEY || 
                 localStorage.getItem('do_ai_agent_api_key');
  
  if (!apiKey) {
    throw new Error('AI Agent API key required. Please configure your API key in the Dashboard. Get it from: DigitalOcean Control Panel → AI Agents → Your Agent → API Keys');
  }
  
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add authorization header if API key is provided
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    const response = await fetch(AI_AGENT_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Agent error response:', errorText);
      throw new Error(`AI Agent returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('AI Agent response:', data);
    
    // Extract the assistant's message content
    // DigitalOcean AI agents return OpenAI-compatible format
    let aiText = '';
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      aiText = data.choices[0].message.content;
    } else if (data.content) {
      aiText = data.content;
    } else if (typeof data === 'string') {
      aiText = data;
    } else {
      aiText = JSON.stringify(data);
    }
    
    // Parse the AI response to extract structured data
    return parseAIResponse(aiText);
  } catch (error) {
    console.error('Error calling AI agent:', error);
    throw error;
  }
};

/**
 * Parse AI response text into structured format
 */
function parseAIResponse(text: string): AIAnalysisResponse {
  // Extract risk level percentage
  const riskLevelMatch = text.match(/(?:Risk Level|risk level)[:\s]*(\d+)%/i);
  const riskLevel = riskLevelMatch ? parseInt(riskLevelMatch[1]) : 0;

  // Extract risk category
  const categoryMatch = text.match(/(?:Risk Category|category)[:\s]*(Low|Moderate|High|Very High)/i);
  const riskCategory = categoryMatch ? categoryMatch[1] : 'Unknown';

  // Extract key risk factors
  const factorsSection = text.match(/(?:Key Risk Factors?|risk factors?)[:\s]*\n([\s\S]*?)(?:\n\n|\n[A-Z])/i);
  const keyRiskFactors: string[] = [];
  if (factorsSection) {
    const factorLines = factorsSection[1].split('\n');
    factorLines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && (trimmed.startsWith('-') || trimmed.startsWith('•') || /^\d+\./.test(trimmed))) {
        keyRiskFactors.push(trimmed.replace(/^[-•\d.)\s]+/, ''));
      }
    });
  }

  // Extract trend analysis
  const trendMatch = text.match(/(?:Trend Analysis|trend analysis)[:\s]*\n([\s\S]*?)(?:\n\n|\n[A-Z])/i);
  const trendAnalysis = trendMatch ? trendMatch[1].trim() : '';

  // Extract recommendations
  const recsSection = text.match(/(?:Recommendations?)[:\s]*\n([\s\S]*?)(?:\n\n|\n[A-Z]|$)/i);
  const recommendations: string[] = [];
  if (recsSection) {
    const recLines = recsSection[1].split('\n');
    recLines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && (trimmed.startsWith('-') || trimmed.startsWith('•') || /^\d+\./.test(trimmed))) {
        recommendations.push(trimmed.replace(/^[-•\d.)\s]+/, ''));
      }
    });
  }

  // Extract confidence level
  const confidenceMatch = text.match(/(?:Confidence Level|confidence)[:\s]*(Low|Medium|High)/i);
  const confidenceLevel = confidenceMatch ? confidenceMatch[1] : 'Unknown';

  return {
    riskLevel,
    riskCategory,
    keyRiskFactors,
    trendAnalysis,
    recommendations,
    confidenceLevel,
    fullAnalysis: text,
  };
}

