import * as cheerio from 'cheerio';
import PhoneNumberReputation from '@/models/PhoneNumberReputation';
import { connectToDatabase } from '@/lib/db';
import mongoose from 'mongoose';

export interface ReputationData {
  dangerLevel: number;
  status: 'safe' | 'neutral' | 'annoying' | 'dangerous' | 'unknown';
  commentCount: number;
  visitCount: number;
  lastComment?: string;
  lastCommentDate?: Date;
  lastVisitDate?: Date;
  allComments?: Array<{
    text: string;
    date?: Date;
    category?: string;
  }>;
  categories?: string[];
  description?: string;
  sourceUrl: string;
}

export interface ReputationProvider {
  name: string;
  countryCode: string;
  getReputationUrl: (number: string) => string;
  scrapeReputation: (html: string, url: string) => Promise<ReputationData>;
}

// Provider implementations
const pageJauneBelgiumProvider: ReputationProvider = {
  name: 'page-jaune-be',
  countryCode: '+32',
  getReputationUrl: (number: string) => {
    // Format for page-jaune.be: full international number without + sign
    // Example: +3223354400 -> 3223354400
    let cleanNumber = number.replace(/[^\d]/g, ''); // Remove all non-digits
    
    // Ensure we have the full international format (32...)
    if (cleanNumber.startsWith('0') && cleanNumber.length === 10) {
      // Belgian national format (0xxxxxxxx) -> add country code
      cleanNumber = '32' + cleanNumber.substring(1);
    } else if (!cleanNumber.startsWith('32')) {
      // If no country code, assume Belgian and add it
      cleanNumber = '32' + cleanNumber;
    }
    
    console.log(`[Reputation] Checking number: ${number} -> formatted: ${cleanNumber}`);
    return `https://www.page-jaune.be/numero/${cleanNumber}`;
  },
  scrapeReputation: async (html: string, url: string) => {
    const $ = cheerio.load(html);
    
    let dangerLevel = 0;
    let status: ReputationData['status'] = 'unknown';
    let commentCount = 0;
    let visitCount = 0;
    let lastComment = '';
    let lastCommentDate: Date | undefined;
    let lastVisitDate: Date | undefined;
    let categories: string[] = [];
    let description = '';
    const allComments: Array<{ text: string; date?: Date; category?: string }> = [];

    try {
      // Extract danger level from table structure: "Niveau de danger : X %"
      const dangerRow = $('td:contains("Niveau de danger")');
      if (dangerRow.length) {
        const dangerText = dangerRow.next('td').text().trim();
        const dangerMatch = dangerText.match(/(\d+)\s*%/);
        if (dangerMatch) {
          dangerLevel = parseInt(dangerMatch[1]);
        }
      }

      // Extract comment count from table structure: "Nombre de commentaires : X×"
      const commentRow = $('td:contains("Nombre de commentaires")');
      if (commentRow.length) {
        const commentText = commentRow.next('td').text().trim();
        const commentMatch = commentText.match(/(\d+)×?/);
        if (commentMatch) {
          commentCount = parseInt(commentMatch[1]);
        }
      }

      // Extract visit count from table structure: "Nombre de visites : X×"
      const visitRow = $('td:contains("Nombre de visites")');
      if (visitRow.length) {
        const visitText = visitRow.next('td').text().trim();
        // Match numbers with spaces (French format): "2 535×" or commas: "2,535×"
        const visitMatch = visitText.match(/(\d+(?:[\s,]\d{3})*)\s*×?/);
        if (visitMatch) {
          // Handle numbers with spaces or commas (e.g., "2 535" or "2,535")
          const cleanedVisitCount = visitMatch[1].replace(/[\s,]/g, '');
          visitCount = parseInt(cleanedVisitCount) || 0;
        }
      }

      // Alternative: try to find visits in different table structure
      if (visitCount === 0) {
        const alternativeVisitText = $('table').text();
        const alternativeMatch = alternativeVisitText.match(/Nombre de visites[:\s]*(\d+(?:[\s,]\d{3})*)\s*×?/i);
        if (alternativeMatch) {
          const cleanedVisitCount = alternativeMatch[1].replace(/[\s,]/g, '');
          visitCount = parseInt(cleanedVisitCount) || 0;
        }
      }

      // Extract last visit date from table structure: "Dernière visite : YYYY-MM-DD"
      const lastVisitRow = $('td:contains("Dernière visite")');
      if (lastVisitRow.length) {
        const lastVisitText = lastVisitRow.next('td').text().trim();
        const lastVisitMatch = lastVisitText.match(/(\d{4}-\d{2}-\d{2})/);
        if (lastVisitMatch) {
          lastVisitDate = new Date(lastVisitMatch[1]);
        }
      }

      // Alternative: try to find last visit in different table structure
      if (!lastVisitDate) {
        const alternativeLastVisitText = $('table').text();
        const alternativeLastVisitMatch = alternativeLastVisitText.match(/Dernière visite[:\s]*(\d{4}-\d{2}-\d{2})/i);
        if (alternativeLastVisitMatch) {
          lastVisitDate = new Date(alternativeLastVisitMatch[1]);
        }
      }

      // Determine status based on danger level
      if (dangerLevel >= 70) {
        status = 'dangerous';
      } else if (dangerLevel >= 40) {
        status = 'annoying';
      } else if (dangerLevel >= 10) {
        status = 'neutral';
      } else if (commentCount > 0) {
        status = 'safe';
      } else {
        status = 'unknown';
      }

      // Extract all comments from the comments container
      const commentsContainer = $('#content > div.comments-container.comment-list.shadow-container.comments-pagination');
      
      if (commentsContainer.length > 0) {
        // Look for comment elements - they might be in different structures
        const commentElements = commentsContainer.find('p, div').filter((i, el) => {
          const text = $(el).text().trim();
          // Look for elements that start with category words
          return /^(Dangereux|Gênant|Utile|Fiable|Neutre)\s/.test(text) && text.length > 20;
        });
        
        commentElements.each((index, element) => {
          const commentEl = $(element);
          let fullText = commentEl.text().trim();
          
          if (fullText) {
            // Extract category from the beginning of the comment
            const categoryMatch = fullText.match(/^(Dangereux|Gênant|Utile|Fiable|Neutre)\s*/);
            let category = '';
            
            if (categoryMatch) {
              category = categoryMatch[1];
              // Remove the category from the text
              fullText = fullText.replace(/^(Dangereux|Gênant|Utile|Fiable|Neutre)\s*/, '').trim();
            }
            
            // Try to extract date from the end of the comment or from sibling elements
            let commentDate: Date | undefined;
            let commentText = fullText;
            
            // Look for date patterns in the text (YYYY-MM-DD format)
            const dateMatch = fullText.match(/(\d{4}-\d{2}-\d{2})/);
            if (dateMatch) {
              commentDate = new Date(dateMatch[1]);
              // Remove date from comment text
              commentText = fullText.replace(/\s*\d{4}-\d{2}-\d{2}.*$/, '').trim();
            }
            
            // Look for date in sibling elements (common pattern on Page Jaune)
            const nextSibling = commentEl.next();
            if (nextSibling.length && !commentDate) {
              const siblingText = nextSibling.text().trim();
              const siblingDateMatch = siblingText.match(/(\d{4}-\d{2}-\d{2})/);
              if (siblingDateMatch) {
                commentDate = new Date(siblingDateMatch[1]);
              }
            }
            
            // Clean up the comment text - remove extra whitespace and voting indicators
            commentText = commentText
              .replace(/\s*_\d+_\s*_\d+_\s*$/, '') // Remove voting indicators like "_0_ _0_"
              .replace(/\s+/g, ' ')
              .trim();
            
            if (commentText && commentText.length > 10) { // Only include substantial comments
              allComments.push({
                text: commentText.substring(0, 1000), // Increased limit to 1000 chars
                date: commentDate,
                category: category || undefined
              });
            }
          }
        });
        
        // Alternative extraction method - look for structured comment blocks
        if (allComments.length === 0) {
          // Try to find comments in a different structure
          const alternativeComments = commentsContainer.find('*').filter((i, el) => {
            const text = $(el).text().trim();
            return Boolean(text.match(/^(Dangereux|Gênant|Utile|Fiable|Neutre)/)) && text.length > 15;
          });
          
          alternativeComments.each((index, element) => {
            const commentEl = $(element);
            const fullText = commentEl.text().trim();
            
            const categoryMatch = fullText.match(/^(Dangereux|Gênant|Utile|Fiable|Neutre)\s*/);
            if (categoryMatch) {
              const category = categoryMatch[1];
              let commentText = fullText.replace(/^(Dangereux|Gênant|Utile|Fiable|Neutre)\s*/, '').trim();
              
              // Look for date in the text
              let commentDate: Date | undefined;
              const dateMatch = commentText.match(/(\d{4}-\d{2}-\d{2})/);
              if (dateMatch) {
                commentDate = new Date(dateMatch[1]);
                commentText = commentText.replace(/\s*\d{4}-\d{2}-\d{2}.*$/, '').trim();
              }
              
              // Clean up voting indicators
              commentText = commentText.replace(/\s*_\d+_\s*_\d+_\s*$/, '').trim();
              
              if (commentText && commentText.length > 10) {
                allComments.push({
                  text: commentText.substring(0, 1000),
                  date: commentDate,
                  category: category
                });
              }
            }
          });
        }
        
        // Set the latest comment for backward compatibility
        if (allComments.length > 0) {
          lastComment = allComments[0].text;
          lastCommentDate = allComments[0].date;
        }
      }

      // Extract categories from comment types with counts (Dangereux 17, Gênant 14, etc.)
      const filterRankOnly = $('#filter-rank-only');
      if (filterRankOnly.length > 0) {
        // Look for text patterns like "Gênant 14 Dangereux 17"
        const filterText = filterRankOnly.text().trim();
        const categoryMatches = filterText.match(/(Dangereux|Gênant|Utile|Fiable|Neutre)\s+(\d+)/g);
        
        if (categoryMatches) {
          categories = categoryMatches.map(match => {
            const [, category, count] = match.match(/(Dangereux|Gênant|Utile|Fiable|Neutre)\s+(\d+)/) || [];
            return `${category} ${count}`;
          });
        }
      }

      // Fallback: Extract categories from comment types without counts
      if (categories.length === 0) {
        const statusTypes = ['Dangereux', 'Gênant', 'Utile', 'Fiable', 'Neutre'];
        statusTypes.forEach(type => {
          const elements = $(`*:contains("${type}")`);
          if (elements.length > 0) {
            categories.push(type.toLowerCase());
          }
        });
      }

      // Remove duplicates from categories
      categories = [...new Set(categories)];

      // Create description
      if (commentCount > 0) {
        description = `${commentCount} comment(s), ${dangerLevel}% danger level`;
        if (visitCount > 0) {
          description += `, ${visitCount} visits`;
        }
      } else {
        description = 'No comments available';
      }

      console.log(`[Reputation] Scraped data: danger=${dangerLevel}%, comments=${commentCount}, visits=${visitCount}, status=${status}`);

    } catch (error) {
      console.error('Error parsing page-jaune.be data:', error);
      // Return unknown status if parsing fails
    }

    return {
      dangerLevel,
      status,
      commentCount,
      visitCount,
      lastComment: lastComment || undefined,
      lastCommentDate,
      lastVisitDate,
      allComments: allComments.length > 0 ? allComments : undefined,
      categories: categories.length > 0 ? categories : undefined,
      description,
      sourceUrl: url
    };
  }
};

// Provider registry
const providers: ReputationProvider[] = [
  pageJauneBelgiumProvider,
  // Add more providers here for other countries
];

// Helper to get appropriate provider for a phone number
function getProviderForNumber(number: string, countryCode: string): ReputationProvider | null {
  // For now, we only support Belgium (+32)
  if (countryCode === '+32' || number.startsWith('+32')) {
    return pageJauneBelgiumProvider;
  }
  
  // TODO: Add more providers for other countries
  return null;
}

// Helper to normalize phone number
function normalizePhoneNumber(number: string): { number: string; countryCode: string } {
  // Remove all non-digit characters except +
  const cleaned = number.replace(/[^\d+]/g, '');
  
  // Extract country code and build full international number
  let countryCode = '';
  let fullInternationalNumber = '';
  
  if (cleaned.startsWith('+32')) {
    countryCode = '+32';
    // Store full number with country code (without +): +3223354400 -> 3223354400
    fullInternationalNumber = cleaned.substring(1); // Remove the +
  } else if (cleaned.startsWith('32') && cleaned.length > 10) {
    countryCode = '+32';
    // Already has country code: 3223354400 -> 3223354400
    fullInternationalNumber = cleaned;
  } else if (cleaned.startsWith('0') && cleaned.length === 10) {
    // Belgian national format: 023354400 -> 3223354400
    countryCode = '+32';
    fullInternationalNumber = '32' + cleaned.substring(1);
  } else {
    // Default case: assume it needs Belgian country code if it looks like a local number
    if (cleaned.length === 8 || cleaned.length === 9) {
      countryCode = '+32';
      fullInternationalNumber = '32' + cleaned;
    } else {
      // Keep as is if we can't determine format
      fullInternationalNumber = cleaned;
    }
  }
  
  return {
    number: fullInternationalNumber,
    countryCode
  };
}

// Main service class
export class PhoneReputationService {
  
  /**
   * Check reputation for a phone number
   */
  static async checkReputation(
    phoneNumber: string, 
    userId: string, 
    forceRefresh: boolean = false
  ): Promise<ReputationData | null> {
    await connectToDatabase();
    
    const { number, countryCode } = normalizePhoneNumber(phoneNumber);
    const provider = getProviderForNumber(phoneNumber, countryCode);
    
    if (!provider) {
      throw new Error(`No reputation provider available for country code: ${countryCode}`);
    }

    // Check if we have recent data and don't need to refresh
    if (!forceRefresh) {
      const existingData = await PhoneNumberReputation.findOne({
        number,
        provider: provider.name,
      }).lean();

      if (existingData) {
        const isStale = Date.now() - existingData.lastChecked.getTime() > (7 * 24 * 60 * 60 * 1000); // 7 days
        if (!isStale) {
          return {
            dangerLevel: existingData.dangerLevel,
            status: existingData.status,
            commentCount: existingData.commentCount,
            visitCount: existingData.visitCount,
            lastComment: existingData.providerData.lastComment,
            lastCommentDate: existingData.providerData.lastCommentDate,
            lastVisitDate: existingData.providerData.lastVisitDate,
            allComments: existingData.providerData.allComments,
            categories: existingData.providerData.categories,
            description: existingData.providerData.description,
            sourceUrl: existingData.providerData.sourceUrl || provider.getReputationUrl(phoneNumber)
          };
        }
      }
    }

    // Fetch fresh data
    try {
      const url = provider.getReputationUrl(phoneNumber);
      console.log(`[Reputation] Fetching from URL: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'fr-BE,fr;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none'
        }
      });

      console.log(`[Reputation] Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        // If it's a 404, the number might not exist in their database
        if (response.status === 404) {
          console.log(`[Reputation] Number not found in Page Jaune Belgium database`);
          
          // Return default "unknown" status for numbers not in their system
          const defaultData: ReputationData = {
            dangerLevel: 0,
            status: 'unknown',
            commentCount: 0,
            visitCount: 0,
            description: 'Number not found in Page Jaune Belgium database',
            sourceUrl: url
          };

          // Save the "not found" result to avoid repeated attempts
          await PhoneNumberReputation.findOneAndUpdate(
            { number, provider: provider.name },
            {
              number,
              countryCode,
              country: countryCode === '+32' ? 'Belgium' : 'Unknown',
              provider: provider.name,
              dangerLevel: defaultData.dangerLevel,
              status: defaultData.status,
              commentCount: defaultData.commentCount,
              visitCount: defaultData.visitCount,
              providerData: {
                description: defaultData.description,
                sourceUrl: defaultData.sourceUrl,
              },
              lastChecked: new Date(),
              checkedBy: new mongoose.Types.ObjectId(userId),
              isStale: false,
            },
            { 
              upsert: true, 
              new: true,
              setDefaultsOnInsert: true 
            }
          );

          return defaultData;
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const reputationData = await provider.scrapeReputation(html, url);

      // Save to database
      await PhoneNumberReputation.findOneAndUpdate(
        { number, provider: provider.name },
        {
          number,
          countryCode,
          country: countryCode === '+32' ? 'Belgium' : 'Unknown',
          provider: provider.name,
          dangerLevel: reputationData.dangerLevel,
          status: reputationData.status,
          commentCount: reputationData.commentCount,
          visitCount: reputationData.visitCount,
          providerData: {
            lastComment: reputationData.lastComment,
            lastCommentDate: reputationData.lastCommentDate,
            lastVisitDate: reputationData.lastVisitDate,
            allComments: reputationData.allComments,
            categories: reputationData.categories,
            description: reputationData.description,
            sourceUrl: reputationData.sourceUrl,
          },
          lastChecked: new Date(),
          checkedBy: new mongoose.Types.ObjectId(userId),
          isStale: false,
        },
        { 
          upsert: true, 
          new: true,
          setDefaultsOnInsert: true 
        }
      );

      return reputationData;

    } catch (error) {
      console.error('Error fetching reputation data:', error);
      throw new Error(`Failed to fetch reputation data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get stored reputation data for a phone number
   */
  static async getStoredReputation(phoneNumber: string): Promise<ReputationData | null> {
    await connectToDatabase();
    
    const { number } = normalizePhoneNumber(phoneNumber);
    
    const reputation = await PhoneNumberReputation.findOne({
      number,
    }).sort({ lastChecked: -1 }).lean();

    if (!reputation) {
      return null;
    }

    return {
      dangerLevel: reputation.dangerLevel,
      status: reputation.status,
      commentCount: reputation.commentCount,
      visitCount: reputation.visitCount,
      lastComment: reputation.providerData.lastComment,
      lastCommentDate: reputation.providerData.lastCommentDate,
      lastVisitDate: reputation.providerData.lastVisitDate,
      allComments: reputation.providerData.allComments,
      categories: reputation.providerData.categories,
      description: reputation.providerData.description,
      sourceUrl: reputation.providerData.sourceUrl || ''
    };
  }

  /**
   * Check if reputation data exists for a phone number
   */
  static async hasReputationData(phoneNumber: string): Promise<boolean> {
    await connectToDatabase();
    
    const { number } = normalizePhoneNumber(phoneNumber);
    
    const count = await PhoneNumberReputation.countDocuments({ number });
    return count > 0;
  }

  /**
   * Get reputation badge info for display
   */
  static getReputationBadge(reputationData: ReputationData | null): {
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    text: string;
    color: string;
  } {
    if (!reputationData) {
      return {
        variant: 'outline',
        text: 'Unknown',
        color: 'text-gray-500'
      };
    }

    switch (reputationData.status) {
      case 'safe':
        return {
          variant: 'default',
          text: `Safe (${reputationData.dangerLevel}%)`,
          color: 'text-green-600'
        };
      case 'neutral':
        return {
          variant: 'secondary',
          text: `Neutral (${reputationData.dangerLevel}%)`,
          color: 'text-blue-600'
        };
      case 'annoying':
        return {
          variant: 'secondary',
          text: `Annoying (${reputationData.dangerLevel}%)`,
          color: 'text-yellow-600'
        };
      case 'dangerous':
        return {
          variant: 'destructive',
          text: `Dangerous (${reputationData.dangerLevel}%)`,
          color: 'text-red-600'
        };
      default:
        return {
          variant: 'outline',
          text: 'Unknown',
          color: 'text-gray-500'
        };
    }
  }
} 