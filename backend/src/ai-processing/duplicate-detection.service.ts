import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { ExtractedProduct, DuplicateMatch } from './ai-processing.service';

interface SimilarityScore {
  productId: string;
  score: number;
  matchedFields: string[];
}

@Injectable()
export class DuplicateDetectionService {
  private readonly logger = new Logger(DuplicateDetectionService.name);

  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async detectDuplicates(extractedProduct: ExtractedProduct): Promise<DuplicateMatch[]> {
    try {
      // Get existing products for comparison
      const existingProducts = await this.getRelevantProducts(extractedProduct);
      
      if (existingProducts.length === 0) {
        return [];
      }

      // Calculate similarity scores
      const similarities = existingProducts.map(product => 
        this.calculateSimilarity(extractedProduct, product)
      ).filter(similarity => similarity.score > 0.3); // Only consider matches above 30%

      // Sort by similarity score (highest first)
      similarities.sort((a, b) => b.score - a.score);

      // Convert to duplicate matches with suggested actions
      return similarities.slice(0, 5).map(similarity => ({
        productId: similarity.productId,
        similarity: similarity.score,
        suggestedAction: this.determineSuggestedAction(similarity.score, similarity.matchedFields),
      }));

    } catch (error) {
      this.logger.error('Duplicate detection failed:', error.message);
      return [];
    }
  }

  private async getRelevantProducts(extractedProduct: ExtractedProduct): Promise<Product[]> {
    const queryBuilder = this.productRepository.createQueryBuilder('product');

    // Search by name similarity (using ILIKE for case-insensitive partial matching)
    if (extractedProduct.name) {
      const nameWords = extractedProduct.name.toLowerCase().split(' ').filter(word => word.length > 2);
      if (nameWords.length > 0) {
        const nameConditions = nameWords.map((word, index) => 
          `LOWER(product.name) LIKE :nameWord${index}`
        ).join(' OR ');
        
        queryBuilder.andWhere(`(${nameConditions})`);
        
        nameWords.forEach((word, index) => {
          queryBuilder.setParameter(`nameWord${index}`, `%${word}%`);
        });
      }
    }

    // Filter by brand if available
    if (extractedProduct.brand) {
      queryBuilder.orWhere('LOWER(product.brand) = LOWER(:brand)', { 
        brand: extractedProduct.brand 
      });
    }

    // Filter by category if available
    if (extractedProduct.category) {
      queryBuilder.leftJoin('product.category', 'category');
      queryBuilder.orWhere('LOWER(category.name) = LOWER(:category)', { 
        category: extractedProduct.category 
      });
    }

    // Limit results to avoid performance issues
    queryBuilder.limit(50);

    return queryBuilder.getMany();
  }

  private calculateSimilarity(extractedProduct: ExtractedProduct, existingProduct: Product): SimilarityScore {
    let totalScore = 0;
    let maxPossibleScore = 0;
    const matchedFields: string[] = [];

    // Name similarity (weight: 40%)
    const nameWeight = 0.4;
    maxPossibleScore += nameWeight;
    if (extractedProduct.name && existingProduct.name) {
      const nameScore = this.calculateStringSimilarity(
        extractedProduct.name.toLowerCase(),
        existingProduct.name.toLowerCase()
      );
      totalScore += nameScore * nameWeight;
      if (nameScore > 0.5) {
        matchedFields.push('name');
      }
    }

    // Brand similarity (weight: 20%)
    const brandWeight = 0.2;
    maxPossibleScore += brandWeight;
    if (extractedProduct.brand && existingProduct.brand) {
      const brandScore = this.calculateStringSimilarity(
        extractedProduct.brand.toLowerCase(),
        existingProduct.brand.toLowerCase()
      );
      totalScore += brandScore * brandWeight;
      if (brandScore > 0.8) {
        matchedFields.push('brand');
      }
    }

    // Category similarity (weight: 15%)
    const categoryWeight = 0.15;
    maxPossibleScore += categoryWeight;
    if (extractedProduct.category && existingProduct.category) {
      const categoryScore = extractedProduct.category.toLowerCase() === existingProduct.category.name.toLowerCase() ? 1 : 0;
      totalScore += categoryScore * categoryWeight;
      if (categoryScore > 0) {
        matchedFields.push('category');
      }
    }

    // Price similarity (weight: 15%)
    const priceWeight = 0.15;
    maxPossibleScore += priceWeight;
    if (extractedProduct.price && existingProduct.prices && existingProduct.prices.length > 0) {
      const existingPrice = existingProduct.prices[0].price;
      const priceDifference = Math.abs(extractedProduct.price - existingPrice) / Math.max(extractedProduct.price, existingPrice);
      const priceScore = Math.max(0, 1 - priceDifference);
      totalScore += priceScore * priceWeight;
      if (priceScore > 0.8) {
        matchedFields.push('price');
      }
    }

    // Condition similarity (weight: 10%)
    const conditionWeight = 0.1;
    maxPossibleScore += conditionWeight;
    // Note: Product entity doesn't have condition field, so we skip condition comparison
    // This could be enhanced by adding condition to InventoryItem or ProductSpecification
    const conditionScore = 0.5; // Neutral score when condition comparison is not available
    totalScore += conditionScore * conditionWeight;

    // Normalize score to 0-1 range
    const finalScore = maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;

    return {
      productId: existingProduct.id,
      score: finalScore,
      matchedFields,
    };
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // Use Levenshtein distance for string similarity
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    
    if (maxLength === 0) return 1;
    
    return 1 - (distance / maxLength);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private normalizeCondition(condition: string): string {
    const conditionMap: Record<string, string> = {
      'new': 'new',
      'nouveau': 'new',
      'neuf': 'new',
      'used': 'used',
      'utilisé': 'used',
      'occasion': 'used',
      'refurbished': 'refurbished',
      'reconditionné': 'refurbished',
      'like_new': 'like_new',
      'comme_neuf': 'like_new',
      'excellent': 'excellent',
      'very_good': 'very_good',
      'très_bon': 'very_good',
      'good': 'good',
      'bon': 'good',
      'fair': 'fair',
      'correct': 'fair',
      'poor': 'poor',
      'mauvais': 'poor',
    };

    const normalized = condition.toLowerCase().replace(/\s+/g, '_');
    return conditionMap[normalized] || normalized;
  }

  private determineSuggestedAction(score: number, matchedFields: string[]): 'merge' | 'update' | 'ignore' {
    // High similarity with name and brand match suggests merge
    if (score > 0.8 && matchedFields.includes('name') && matchedFields.includes('brand')) {
      return 'merge';
    }

    // Medium-high similarity suggests update (same product, different details)
    if (score > 0.6 && matchedFields.includes('name')) {
      return 'update';
    }

    // Lower similarity or different core attributes suggest ignore (different product)
    return 'ignore';
  }

  async findExactDuplicates(extractedProduct: ExtractedProduct): Promise<Product[]> {
    const queryBuilder = this.productRepository.createQueryBuilder('product');

    // Exact name match
    if (extractedProduct.name) {
      queryBuilder.where('LOWER(product.name) = LOWER(:name)', { 
        name: extractedProduct.name 
      });
    }

    // Exact brand match
    if (extractedProduct.brand) {
      queryBuilder.andWhere('LOWER(product.brand) = LOWER(:brand)', { 
        brand: extractedProduct.brand 
      });
    }

    // Same condition
    if (extractedProduct.condition) {
      queryBuilder.andWhere('LOWER(product.condition) = LOWER(:condition)', { 
        condition: extractedProduct.condition 
      });
    }

    return queryBuilder.getMany();
  }

  async getSimilarProductsByBrand(brand: string, limit: number = 10): Promise<Product[]> {
    return this.productRepository.find({
      where: { brand },
      take: limit,
      order: { createdAt: 'DESC' },
    });
  }

  async getSimilarProductsByCategory(categoryName: string, limit: number = 10): Promise<Product[]> {
    return this.productRepository
      .createQueryBuilder('product')
      .leftJoin('product.category', 'category')
      .where('LOWER(category.name) = LOWER(:categoryName)', { categoryName })
      .limit(limit)
      .orderBy('product.createdAt', 'DESC')
      .getMany();
  }
}