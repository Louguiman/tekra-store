import { Injectable, Logger } from '@nestjs/common';
import { ExtractedProduct } from './ai-processing.service';

interface ExtractionPattern {
  field: string;
  patterns: RegExp[];
  processor?: (match: string) => any;
  priority: number;
}

@Injectable()
export class RuleBasedExtractionService {
  private readonly logger = new Logger(RuleBasedExtractionService.name);

  private readonly extractionPatterns: ExtractionPattern[] = [
    // Price patterns
    {
      field: 'price',
      patterns: [
        /(?:price|prix|cost|coût|amount|montant)[\s:]*([A-Z]{3})?[\s]*(\d+(?:[.,]\d{2})?)/i,
        /(\d+(?:[.,]\d{2})?)[\s]*(?:XOF|CFA|FCFA|EUR|USD|GBP)/i,
        /(?:XOF|CFA|FCFA|EUR|USD|GBP)[\s]*(\d+(?:[.,]\d{2})?)/i,
      ],
      processor: (match: string) => {
        const numbers = match.match(/\d+(?:[.,]\d{2})?/g);
        return numbers ? parseFloat(numbers[0].replace(',', '.')) : null;
      },
      priority: 9,
    },
    
    // Currency patterns
    {
      field: 'currency',
      patterns: [
        /(XOF|CFA|FCFA|EUR|USD|GBP|NGN|GHS)/i,
      ],
      processor: (match: string) => match.toUpperCase(),
      priority: 8,
    },

    // Quantity patterns
    {
      field: 'quantity',
      patterns: [
        /(?:qty|quantity|quantité|stock|available|disponible|pieces|pcs)[\s:]*(\d+)/i,
        /(\d+)[\s]*(?:pieces|pcs|units|unités|items)/i,
        /x(\d+)(?:\s|$)/i, // e.g., "iPhone x5"
      ],
      processor: (match: string) => {
        const numbers = match.match(/\d+/);
        return numbers ? parseInt(numbers[0]) : null;
      },
      priority: 7,
    },

    // Brand patterns (West African common brands)
    {
      field: 'brand',
      patterns: [
        /(?:brand|marque|make|manufacturer)[\s:]*([A-Za-z0-9\s]+)/i,
        /(Samsung|Apple|iPhone|Huawei|Xiaomi|Oppo|Vivo|Tecno|Infinix|Itel|Nokia|LG|Sony|HP|Dell|Lenovo|Acer|Asus|MSI|Canon|Nikon|Panasonic|Philips|Bosch|Siemens|Whirlpool|Haier|TCL|Hisense|Skyworth|Changhong|Konka|Midea|Gree|Daikin|Carrier|York|Trane|Rheem|AO Smith|Ariston|Vaillant|Junkers|Buderus|Viessmann|Wolf|Remeha|Intergas|Nefit|Rinnai|Navien|Noritz|Takagi|Paloma|Purpose|Rinnai)/i,
      ],
      processor: (match: string) => {
        // Extract brand name, clean up
        const brandMatch = match.match(/([A-Za-z0-9]+)/);
        return brandMatch ? brandMatch[1] : match.trim();
      },
      priority: 6,
    },

    // Condition patterns
    {
      field: 'condition',
      patterns: [
        /(?:condition|état|state)[\s:]*([A-Za-z\s]+)/i,
        /(new|nouveau|neuf|used|utilisé|occasion|refurbished|reconditionné|like new|comme neuf|excellent|très bon|good|bon|fair|correct|poor|mauvais)/i,
      ],
      processor: (match: string) => {
        const conditionMap: Record<string, string> = {
          'new': 'new',
          'nouveau': 'new',
          'neuf': 'new',
          'used': 'used',
          'utilisé': 'used',
          'occasion': 'used',
          'refurbished': 'refurbished',
          'reconditionné': 'refurbished',
          'like new': 'like_new',
          'comme neuf': 'like_new',
          'excellent': 'excellent',
          'très bon': 'very_good',
          'good': 'good',
          'bon': 'good',
          'fair': 'fair',
          'correct': 'fair',
          'poor': 'poor',
          'mauvais': 'poor',
        };
        
        const normalized = match.toLowerCase().trim();
        return conditionMap[normalized] || normalized;
      },
      priority: 5,
    },

    // Grade patterns (for refurbished items)
    {
      field: 'grade',
      patterns: [
        /(?:grade|qualité|quality)[\s:]*([ABCD])/i,
        /grade[\s]*([ABCD])/i,
        /([ABCD])[\s]*grade/i,
      ],
      processor: (match: string) => {
        const gradeMatch = match.match(/[ABCD]/i);
        return gradeMatch ? gradeMatch[0].toUpperCase() as 'A' | 'B' | 'C' | 'D' : null;
      },
      priority: 4,
    },

    // Storage/Memory patterns (for electronics)
    {
      field: 'specifications.storage',
      patterns: [
        /(\d+)\s*(GB|TB|Go|To)\s*(?:storage|stockage|memory|mémoire|SSD|HDD)/i,
        /(?:storage|stockage|memory|mémoire)[\s:]*(\d+)\s*(GB|TB|Go|To)/i,
      ],
      processor: (match: string) => {
        const storageMatch = match.match(/(\d+)\s*(GB|TB|Go|To)/i);
        if (storageMatch) {
          const value = parseInt(storageMatch[1]);
          const unit = storageMatch[2].toUpperCase();
          return `${value}${unit}`;
        }
        return match.trim();
      },
      priority: 3,
    },

    // RAM patterns (for electronics)
    {
      field: 'specifications.ram',
      patterns: [
        /(\d+)\s*(GB|Go)\s*(?:RAM|ram)/i,
        /(?:RAM|ram)[\s:]*(\d+)\s*(GB|Go)/i,
      ],
      processor: (match: string) => {
        const ramMatch = match.match(/(\d+)\s*(GB|Go)/i);
        if (ramMatch) {
          const value = parseInt(ramMatch[1]);
          return `${value}GB`;
        }
        return match.trim();
      },
      priority: 3,
    },

    // Screen size patterns
    {
      field: 'specifications.screen_size',
      patterns: [
        /(\d+(?:\.\d+)?)\s*(?:inch|inches|pouces|")/i,
        /(?:screen|écran|display|affichage)[\s:]*(\d+(?:\.\d+)?)\s*(?:inch|inches|pouces|")/i,
      ],
      processor: (match: string) => {
        const sizeMatch = match.match(/(\d+(?:\.\d+)?)/);
        return sizeMatch ? `${sizeMatch[1]}"` : match.trim();
      },
      priority: 3,
    },

    // Color patterns
    {
      field: 'specifications.color',
      patterns: [
        /(?:color|colour|couleur)[\s:]*([A-Za-z\s]+)/i,
        /(black|white|red|blue|green|yellow|orange|purple|pink|gray|grey|silver|gold|rose gold|space gray|midnight|starlight|noir|blanc|rouge|bleu|vert|jaune|orange|violet|rose|gris|argent|or)/i,
      ],
      processor: (match: string) => {
        const colorMap: Record<string, string> = {
          'noir': 'black',
          'blanc': 'white',
          'rouge': 'red',
          'bleu': 'blue',
          'vert': 'green',
          'jaune': 'yellow',
          'orange': 'orange',
          'violet': 'purple',
          'rose': 'pink',
          'gris': 'gray',
          'argent': 'silver',
          'or': 'gold',
        };
        
        const normalized = match.toLowerCase().trim();
        return colorMap[normalized] || normalized;
      },
      priority: 2,
    },
  ];

  private readonly categoryKeywords = {
    'smartphones': [
      'iphone', 'samsung galaxy', 'huawei', 'xiaomi', 'oppo', 'vivo', 
      'tecno', 'infinix', 'itel', 'phone', 'smartphone', 'mobile'
    ],
    'laptops': [
      'laptop', 'notebook', 'macbook', 'thinkpad', 'pavilion', 'inspiron',
      'ideapad', 'vivobook', 'zenbook', 'surface', 'chromebook'
    ],
    'tablets': [
      'ipad', 'tablet', 'tab', 'surface pro', 'galaxy tab'
    ],
    'televisions': [
      'tv', 'television', 'smart tv', 'led tv', 'oled', 'qled', 'uhd', '4k'
    ],
    'audio': [
      'headphones', 'earphones', 'speaker', 'soundbar', 'airpods', 
      'beats', 'jbl', 'bose', 'sony wh', 'marshall'
    ],
    'gaming': [
      'playstation', 'xbox', 'nintendo', 'ps4', 'ps5', 'gaming console',
      'controller', 'gaming chair', 'gaming keyboard', 'gaming mouse'
    ],
    'appliances': [
      'refrigerator', 'washing machine', 'microwave', 'air conditioner',
      'freezer', 'dishwasher', 'oven', 'cooker', 'blender'
    ],
    'cameras': [
      'camera', 'canon', 'nikon', 'sony alpha', 'fujifilm', 'gopro',
      'dslr', 'mirrorless', 'lens', 'tripod'
    ],
  };

  extractProductsFromText(text: string): ExtractedProduct[] {
    const lines = this.preprocessText(text);
    const products: ExtractedProduct[] = [];
    
    // Try to identify product boundaries (multiple products in one message)
    const productSections = this.identifyProductSections(lines);
    
    for (const section of productSections) {
      const product = this.extractSingleProduct(section);
      if (product) {
        products.push(product);
      }
    }

    return products.length > 0 ? products : [this.extractSingleProduct(lines)].filter(Boolean);
  }

  private preprocessText(text: string): string[] {
    // Clean and normalize text
    const cleaned = text
      .replace(/[^\w\s\-.,:"'()]/g, ' ') // Remove special chars except common punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    return cleaned
      .split(/\n|;|\.(?=\s[A-Z])/) // Split on newlines, semicolons, or sentence boundaries
      .map(line => line.trim())
      .filter(line => line.length > 2);
  }

  private identifyProductSections(lines: string[]): string[][] {
    const sections: string[][] = [];
    let currentSection: string[] = [];
    
    for (const line of lines) {
      // Check if this line starts a new product (contains product-like keywords)
      const isNewProduct = this.looksLikeProductStart(line) && currentSection.length > 0;
      
      if (isNewProduct) {
        if (currentSection.length > 0) {
          sections.push([...currentSection]);
        }
        currentSection = [line];
      } else {
        currentSection.push(line);
      }
    }
    
    if (currentSection.length > 0) {
      sections.push(currentSection);
    }
    
    return sections.length > 0 ? sections : [lines];
  }

  private looksLikeProductStart(line: string): boolean {
    // Check if line contains brand names or product indicators
    const productIndicators = [
      /^[A-Z][a-z]+\s+[A-Z]/,  // Brand Name Pattern
      /^\d+\.\s/,              // Numbered list
      /^-\s/,                  // Bullet point
      /^[A-Z]{2,}/,            // All caps (often brand names)
    ];

    return productIndicators.some(pattern => pattern.test(line.trim()));
  }

  private extractSingleProduct(lines: string[]): ExtractedProduct | null {
    if (lines.length === 0) return null;

    const extractedData: any = {
      specifications: {},
    };
    const extractedFields: string[] = [];
    const fullText = lines.join(' ');

    // Extract product name (usually the first substantial line)
    const productName = this.extractProductName(lines);
    if (productName) {
      extractedData.name = productName;
      extractedFields.push('name');
    }

    // Apply extraction patterns
    for (const pattern of this.extractionPatterns) {
      for (const regex of pattern.patterns) {
        const match = fullText.match(regex);
        if (match) {
          let value = pattern.processor ? pattern.processor(match[0]) : match[1] || match[0];
          
          if (value !== null && value !== undefined) {
            // Handle nested fields (e.g., specifications.storage)
            if (pattern.field.includes('.')) {
              const [parent, child] = pattern.field.split('.');
              if (!extractedData[parent]) extractedData[parent] = {};
              extractedData[parent][child] = value;
            } else {
              extractedData[pattern.field] = value;
            }
            
            extractedFields.push(pattern.field);
            break; // Use first match for each field
          }
        }
      }
    }

    // Infer category if not explicitly found
    if (!extractedData.category) {
      extractedData.category = this.inferCategory(extractedData.name || fullText);
      if (extractedData.category !== 'general') {
        extractedFields.push('category');
      }
    }

    // Set defaults
    extractedData.currency = extractedData.currency || 'XOF';
    extractedData.quantity = extractedData.quantity || 1;

    // Calculate confidence score
    const confidenceScore = this.calculateConfidenceScore(extractedFields, extractedData);

    if (!extractedData.name && extractedFields.length < 2) {
      return null; // Not enough data to create a product
    }

    return {
      name: extractedData.name || 'Unknown Product',
      brand: extractedData.brand,
      category: extractedData.category || 'general',
      condition: extractedData.condition,
      grade: extractedData.grade,
      price: extractedData.price,
      currency: extractedData.currency,
      quantity: extractedData.quantity,
      specifications: extractedData.specifications || {},
      confidenceScore,
      extractionMetadata: {
        sourceType: 'text',
        processingTime: 0,
        aiModel: 'rule-based-enhanced',
        extractedFields,
        fallbackUsed: false,
      },
    };
  }

  private extractProductName(lines: string[]): string | null {
    // Look for the most likely product name
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip lines that are clearly not product names
      if (this.isNotProductName(trimmed)) {
        continue;
      }
      
      // Prefer lines with brand names or model numbers
      if (this.containsBrandOrModel(trimmed)) {
        return this.cleanProductName(trimmed);
      }
      
      // Use first substantial line as fallback
      if (trimmed.length > 3 && trimmed.length < 100) {
        return this.cleanProductName(trimmed);
      }
    }
    
    return null;
  }

  private isNotProductName(line: string): boolean {
    const skipPatterns = [
      /^(?:price|prix|cost|coût|qty|quantity|condition|état|brand|marque)/i,
      /^\d+\s*(?:XOF|CFA|FCFA|EUR|USD)/i,
      /^(?:available|disponible|stock|en stock)/i,
      /^(?:contact|call|whatsapp|tel)/i,
    ];
    
    return skipPatterns.some(pattern => pattern.test(line));
  }

  private containsBrandOrModel(line: string): boolean {
    const brandPattern = /(Samsung|Apple|iPhone|Huawei|Xiaomi|Oppo|Vivo|Tecno|Infinix|HP|Dell|Lenovo|Sony|LG|Canon|Nikon)/i;
    const modelPattern = /[A-Z0-9]{2,}\s*[A-Z0-9]+/; // Model number pattern
    
    return brandPattern.test(line) || modelPattern.test(line);
  }

  private cleanProductName(name: string): string {
    return name
      .replace(/^[-•\d+\.\s]+/, '') // Remove leading bullets, numbers
      .replace(/\s+/g, ' ')
      .trim();
  }

  private inferCategory(text: string): string {
    const lowerText = text.toLowerCase();
    
    for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
        return category;
      }
    }
    
    return 'general';
  }

  private calculateConfidenceScore(extractedFields: string[], data: any): number {
    const essentialFields = ['name', 'price'];
    const importantFields = ['brand', 'category', 'condition'];
    const bonusFields = ['quantity', 'specifications'];
    
    let score = 0;
    
    // Essential fields (40% of score)
    const hasEssentials = essentialFields.filter(field => 
      extractedFields.includes(field) && data[field]
    ).length;
    score += (hasEssentials / essentialFields.length) * 0.4;
    
    // Important fields (30% of score)
    const hasImportant = importantFields.filter(field => 
      extractedFields.includes(field) && data[field]
    ).length;
    score += (hasImportant / importantFields.length) * 0.3;
    
    // Bonus fields (20% of score)
    const hasBonus = bonusFields.filter(field => 
      extractedFields.includes(field) && data[field]
    ).length;
    score += (hasBonus / bonusFields.length) * 0.2;
    
    // Completeness bonus (10% of score)
    const totalPossibleFields = essentialFields.length + importantFields.length + bonusFields.length;
    const completeness = extractedFields.length / totalPossibleFields;
    score += completeness * 0.1;
    
    return Math.min(score, 1.0);
  }
}