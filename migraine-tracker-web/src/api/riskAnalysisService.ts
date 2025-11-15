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
    console.log('AI Agent response structure:', {
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length,
      hasContent: !!data.content,
      dataType: typeof data
    });
    
    // Extract the assistant's message content
    // DigitalOcean AI agents return OpenAI-compatible format
    let aiText = '';
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      aiText = data.choices[0].message.content;
      console.log('📝 Extracted content from choices[0].message.content');
    } else if (data.content) {
      aiText = data.content;
      console.log('📝 Extracted content from data.content');
    } else if (typeof data === 'string') {
      aiText = data;
      console.log('📝 Using data directly as string');
    } else {
      aiText = JSON.stringify(data);
      console.log('⚠️ No recognized format, stringifying entire response');
    }
    
    console.log('📄 Text to parse (length:', aiText.length, ')');
    console.log('📄 First 200 chars:', aiText.substring(0, 200));
    
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
  console.log('Parsing AI response (first 500 chars):', text.substring(0, 500));
  
  // Extract risk level percentage - multiple patterns including markdown formatting
  let riskLevel = 0;
  const patterns = [
    /\*\*Risk Level\*\*[:\s]*(\d+)%/i,           // **Risk Level:** 80%
    /Risk Level[:\s*-]+(\d+)%/i,                 // Risk Level: 80%
    /(?:risk level|risk)[:\s-]*(\d+)%/i,         // risk level: 80%
    /(\d+)%[:\s]*risk/i,                         // 80% risk
    /(\d+)%\s*(?:risk|chance|probability)/i,     // 80% chance
    /(?:likelihood|probability|chance)[:\s-]*(\d+)%/i, // likelihood: 80%
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      riskLevel = parseInt(match[1]);
      console.log(`✅ Found risk level: ${riskLevel}% using pattern: ${pattern}`);
      break;
    }
  }
  
  if (riskLevel === 0) {
    console.warn('⚠️ Could not extract risk level from response. Checking raw text...');
    console.log('Full response length:', text.length);
    console.log('First 1000 characters:', text.substring(0, 1000));
    console.log('Looking for "Risk Level" or "risk level":', text.toLowerCase().includes('risk level'));
    
    // Try to find any percentage in the text
    const anyPercentMatch = text.match(/(\d+)%/);
    if (anyPercentMatch) {
      console.log('Found a percentage in text:', anyPercentMatch[0], 'at position', anyPercentMatch.index);
      console.log('Context around it:', text.substring(Math.max(0, anyPercentMatch.index! - 50), anyPercentMatch.index! + 50));
    }
  }

  // Extract risk category - handle markdown formatting
  const categoryPatterns = [
    /\*\*Risk Category\*\*[:\s]*(Very High|High|Moderate|Low)/i,
    /Risk Category[:\s*-]+(Very High|High|Moderate|Low)/i,
    /(?:risk category|category)[:\s-]*(Very High|High|Moderate|Low)/i,
  ];
  
  let riskCategory = 'Unknown';
  for (const pattern of categoryPatterns) {
    const match = text.match(pattern);
    if (match) {
      riskCategory = match[1];
      console.log(`✅ Found risk category: ${riskCategory}`);
      break;
    }
  }

  // Extract key risk factors - handle markdown and numbered lists
  const factorsPatterns = [
    /\*\*Key Risk Factors?\*\*[:\s]*\n([\s\S]*?)(?:\n\n|\*\*[A-Z])/i,
    /Key Risk Factors?[:\s]*\n([\s\S]*?)(?:\n\n|\n[A-Z])/i,
  ];
  
  const keyRiskFactors: string[] = [];
  for (const pattern of factorsPatterns) {
    const match = text.match(pattern);
    if (match) {
      const factorLines = match[1].split('\n');
      factorLines.forEach(line => {
        const trimmed = line.trim();
        // Match numbered lists (1., 2.), bullets (-, •), or **bold items**
        if (trimmed && (trimmed.startsWith('-') || trimmed.startsWith('•') || /^\d+\./.test(trimmed))) {
          // Remove list markers and extract text, handling **bold** markers
          let factor = trimmed.replace(/^[-•\d.)\s]+/, '').replace(/\*\*/g, '');
          // Remove markdown and get just the main text (before explanations)
          if (factor.includes('–')) {
            factor = factor.split('–')[0].trim();
          }
          if (factor) {
            keyRiskFactors.push(factor);
          }
        }
      });
      if (keyRiskFactors.length > 0) {
        console.log(`✅ Found ${keyRiskFactors.length} risk factors`);
        break;
      }
    }
  }

  // Extract trend analysis - handle markdown
  const trendPatterns = [
    /\*\*Trend Analysis\*\*[:\s]*\n([\s\S]*?)(?:\n\n|\*\*[A-Z])/i,
    /Trend Analysis[:\s]*\n([\s\S]*?)(?:\n\n|\n[A-Z])/i,
  ];
  
  let trendAnalysis = '';
  for (const pattern of trendPatterns) {
    const match = text.match(pattern);
    if (match) {
      trendAnalysis = match[1].trim();
      console.log('✅ Found trend analysis');
      break;
    }
  }

  // Extract recommendations - handle markdown and numbered lists
  const recsPatterns = [
    /\*\*Recommendations?\*\*[:\s]*\n([\s\S]*?)(?:\n\n|\*\*[A-Z])/i,
    /Recommendations?[:\s]*\n([\s\S]*?)(?:\n\n|\n[A-Z]|$)/i,
  ];
  
  const recommendations: string[] = [];
  for (const pattern of recsPatterns) {
    const match = text.match(pattern);
    if (match) {
      const recLines = match[1].split('\n');
      recLines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed && (trimmed.startsWith('-') || trimmed.startsWith('•') || /^\d+\./.test(trimmed))) {
          let rec = trimmed.replace(/^[-•\d.)\s]+/, '').replace(/\*\*/g, '');
          if (rec) {
            recommendations.push(rec);
          }
        }
      });
      if (recommendations.length > 0) {
        console.log(`✅ Found ${recommendations.length} recommendations`);
        break;
      }
    }
  }

  // Extract confidence level - handle markdown
  const confidencePatterns = [
    /\*\*Confidence Level\*\*[:\s]*(Low|Medium|High)/i,
    /Confidence Level[:\s]*(Low|Medium|High)/i,
    /confidence[:\s]*(Low|Medium|High)/i,
  ];
  
  let confidenceLevel = 'Unknown';
  for (const pattern of confidencePatterns) {
    const match = text.match(pattern);
    if (match) {
      confidenceLevel = match[1];
      console.log(`✅ Found confidence: ${confidenceLevel}`);
      break;
    }
  }

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

