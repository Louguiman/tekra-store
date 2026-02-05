import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as Tesseract from 'tesseract.js';
import * as pdfParse from 'pdf-parse';
import * as fs from 'fs';
import { Supplier } from '../entities/supplier.entity';
import { RuleBasedExtractionService } from './rule-based-extraction.service';
import { DuplicateDetectionService } from './duplicate-detection.service';

export interface ExtractedProduct {
  name: string;
  brand?: string;
  category?: string;
  condition?: string;
  grade?: 'A' | 'B' | 'C' | 'D';
  price?: number;
  currency?: string;
  quantity?: number;
  specifications?: Record<string, string>;
  confidenceScore: number;
  extractionMetadata: {
    sourceType: 'text' | 'image' | 'pdf';
    processingTime: number;
    aiModel: string;
    extractedFields: string[];
    fallbackUsed: boolean;
  };
}

export interface DuplicateMatch {
  productId: string;
  similarity: number;
  suggestedAction: 'merge' | 'update' | 'ignore';
}

@Injectable()
export class AIProcessingService {
  private readonly logger = new Logger(AIProcessingService.name);
  private readonly ollamaBaseUrl: string;
  private readonly ollamaModel: string;
  private readonly aiProcessingEnabled: boolean;
  private readonly fallbackToRules: boolean;
  private readonly confidenceThreshold: number;

  constructor(
    private configService: ConfigService,
    private ruleBasedExtraction: RuleBasedExtractionService,
    private duplicateDetection: DuplicateDetectionService,
  ) {
    this.ollamaBaseUrl = this.configService.get<string>('OLLAMA_BASE_URL', 'http://ollama:11434');
    this.ollamaModel = this.configService.get<string>('OLLAMA_MODEL', 'llama3.2:1b');
    this.aiProcessingEnabled = this.configService.get<boolean>('AI_PROCESSING_ENABLED', true);
    this.fallbackToRules = this.configService.get<boolean>('AI_FALLBACK_TO_RULES', true);
    this.confidenceThreshold = this.configService.get<number>('AI_CONFIDENCE_THRESHOLD', 0.7);
  }

  async initializeLocalModel(): Promise<void> {
    try {
      this.logger.log('Checking Ollama connection...');
      const response = await axios.get(`${this.ollamaBaseUrl}/api/tags`);
      const models = response.data.models || [];
      
      const hasModel = models.some((model: any) => model.name === this.ollamaModel);
      if (!hasModel) {
        this.logger.warn(`Model ${this.ollamaModel} not found. Please ensure it's pulled.`);
      } else {
        this.logger.log(`Model ${this.ollamaModel} is available`);
      }
    } catch (error) {
      this.logger.error('Failed to connect to Ollama:', error.message);
      if (!this.fallbackToRules) {
        throw new Error('Ollama connection failed and fallback is disabled');
      }
    }
  }

  async processTextMessage(content: string, supplier: Supplier): Promise<ExtractedProduct[]> {
    const startTime = Date.now();
    
    try {
      // First try rule-based extraction
      const ruleBasedResults = this.extractWithRules(content);
      
      // Enhance with LLM if enabled and available
      let finalResults = ruleBasedResults;
      if (this.aiProcessingEnabled && ruleBasedResults.length > 0) {
        try {
          finalResults = await this.enhanceWithLLM(ruleBasedResults, content);
        } catch (error) {
          this.logger.warn('LLM enhancement failed, using rule-based results:', error.message);
          finalResults = ruleBasedResults.map(result => ({
            ...result,
            extractionMetadata: {
              ...result.extractionMetadata,
              fallbackUsed: true,
            },
          }));
        }
      }

      const processingTime = Date.now() - startTime;
      return finalResults.map(result => ({
        ...result,
        extractionMetadata: {
          ...result.extractionMetadata,
          sourceType: 'text' as const,
          processingTime,
        },
      }));
    } catch (error) {
      this.logger.error('Text processing failed:', error.message);
      return [];
    }
  }

  async processImage(imageUrl: string, supplier: Supplier): Promise<ExtractedProduct[]> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Processing image: ${imageUrl}`);
      
      // Use Tesseract.js for OCR
      const { data: { text } } = await Tesseract.recognize(imageUrl, 'eng', {
        logger: m => this.logger.debug(`OCR: ${m.status} - ${m.progress}`),
      });

      if (!text.trim()) {
        this.logger.warn('No text extracted from image');
        return [];
      }

      this.logger.log(`Extracted text from image: ${text.substring(0, 100)}...`);
      
      // Process the extracted text
      const results = await this.processTextMessage(text, supplier);
      
      const processingTime = Date.now() - startTime;
      return results.map(result => ({
        ...result,
        extractionMetadata: {
          ...result.extractionMetadata,
          sourceType: 'image' as const,
          processingTime,
        },
      }));
    } catch (error) {
      this.logger.error('Image processing failed:', error.message);
      return [];
    }
  }

  async processPDF(pdfUrl: string, supplier: Supplier): Promise<ExtractedProduct[]> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Processing PDF: ${pdfUrl}`);
      
      // Read PDF file
      const pdfBuffer = fs.readFileSync(pdfUrl);
      const pdfData = await pdfParse(pdfBuffer);
      
      if (!pdfData.text.trim()) {
        this.logger.warn('No text extracted from PDF');
        return [];
      }

      this.logger.log(`Extracted text from PDF: ${pdfData.text.substring(0, 100)}...`);
      
      // Process the extracted text
      const results = await this.processTextMessage(pdfData.text, supplier);
      
      const processingTime = Date.now() - startTime;
      return results.map(result => ({
        ...result,
        extractionMetadata: {
          ...result.extractionMetadata,
          sourceType: 'pdf' as const,
          processingTime,
        },
      }));
    } catch (error) {
      this.logger.error('PDF processing failed:', error.message);
      return [];
    }
  }

  extractWithRules(text: string): ExtractedProduct[] {
    return this.ruleBasedExtraction.extractProductsFromText(text);
  }

  async enhanceWithLLM(ruleBasedExtraction: ExtractedProduct[], originalText: string): Promise<ExtractedProduct[]> {
    try {
      const prompt = this.buildExtractionPrompt(originalText, ruleBasedExtraction);
      
      const response = await axios.post(`${this.ollamaBaseUrl}/api/generate`, {
        model: this.ollamaModel,
        prompt,
        stream: false,
        options: {
          temperature: 0.1, // Low temperature for consistent extraction
          top_p: 0.9,
        },
      });

      const llmResponse = response.data.response;
      const enhancedProducts = this.parseLLMResponse(llmResponse, ruleBasedExtraction);
      
      return enhancedProducts.map(product => ({
        ...product,
        extractionMetadata: {
          ...product.extractionMetadata,
          aiModel: this.ollamaModel,
          fallbackUsed: false,
        },
      }));
    } catch (error) {
      this.logger.error('LLM enhancement failed:', error.message);
      throw error;
    }
  }

  private buildExtractionPrompt(text: string, ruleBasedResults: ExtractedProduct[]): string {
    return `You are a product information extraction assistant. Extract structured product information from the following text.

Text to analyze:
${text}

Current extraction (from rules):
${JSON.stringify(ruleBasedResults[0] || {}, null, 2)}

Please improve and complete the product information. Focus on:
1. Product name (clear, descriptive)
2. Brand/manufacturer
3. Category (electronics, clothing, etc.)
4. Condition (new, used, refurbished)
5. Grade for refurbished items (A, B, C, D)
6. Price and currency
7. Quantity available
8. Key specifications

Respond with a JSON object containing the improved product information. Use the same structure as the input but with enhanced/corrected values.`;
  }

  private parseLLMResponse(response: string, fallback: ExtractedProduct[]): ExtractedProduct[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and merge with fallback
      const enhanced = fallback[0] || {
        name: 'Unknown Product',
        confidenceScore: 0.1,
        extractionMetadata: {
          sourceType: 'text',
          processingTime: 0,
          aiModel: 'rule-based',
          extractedFields: [],
          fallbackUsed: true,
        },
      };
      
      return [{
        name: parsed.name || enhanced.name || 'Unknown Product',
        brand: parsed.brand || enhanced.brand,
        category: parsed.category || enhanced.category,
        condition: parsed.condition || enhanced.condition,
        grade: parsed.grade || enhanced.grade,
        price: parsed.price || enhanced.price,
        currency: parsed.currency || enhanced.currency || 'XOF',
        quantity: parsed.quantity || enhanced.quantity || 1,
        specifications: parsed.specifications || enhanced.specifications || {},
        confidenceScore: this.calculateLLMConfidence(parsed, enhanced),
        extractionMetadata: {
          sourceType: enhanced.extractionMetadata?.sourceType || 'text',
          processingTime: 0,
          aiModel: this.ollamaModel,
          extractedFields: Object.keys(parsed).filter(key => parsed[key] !== undefined),
          fallbackUsed: false,
        },
      }];
    } catch (error) {
      this.logger.error('Failed to parse LLM response:', error.message);
      return fallback;
    }
  }

  calculateConfidenceScore(extraction: ExtractedProduct): number {
    return extraction.confidenceScore;
  }

  private calculateRuleBasedConfidence(extractedFields: string[]): number {
    const totalFields = ['name', 'brand', 'category', 'condition', 'grade', 'price', 'quantity'];
    const extractedCount = extractedFields.length;
    const baseScore = (extractedCount / totalFields.length) * 0.8; // Max 80% for rule-based
    
    // Bonus for having essential fields
    let bonus = 0;
    if (extractedFields.includes('name')) bonus += 0.1;
    if (extractedFields.includes('price')) bonus += 0.1;
    
    return Math.min(baseScore + bonus, 1.0);
  }

  private calculateLLMConfidence(llmResult: any, ruleResult: ExtractedProduct): number {
    const hasEssentialFields = llmResult.name && (llmResult.price || ruleResult.price);
    const fieldCount = Object.keys(llmResult).filter(key => llmResult[key] !== undefined).length;
    
    let confidence = hasEssentialFields ? 0.7 : 0.4;
    confidence += (fieldCount / 10) * 0.3; // Up to 30% bonus for completeness
    
    return Math.min(confidence, 1.0);
  }

  private inferCategory(productName: string): string {
    const categoryKeywords = {
      'electronics': ['phone', 'laptop', 'computer', 'tablet', 'tv', 'camera', 'headphone', 'speaker'],
      'clothing': ['shirt', 'dress', 'pants', 'shoes', 'jacket', 'hat', 'bag'],
      'home': ['furniture', 'chair', 'table', 'bed', 'sofa', 'lamp'],
      'automotive': ['car', 'motorcycle', 'tire', 'engine', 'battery'],
    };

    const lowerName = productName.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => lowerName.includes(keyword))) {
        return category;
      }
    }
    
    return 'general';
  }

  async detectDuplicates(product: ExtractedProduct): Promise<DuplicateMatch[]> {
    return this.duplicateDetection.detectDuplicates(product);
  }
}