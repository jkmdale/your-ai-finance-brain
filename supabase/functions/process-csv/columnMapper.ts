
import { ColumnMapping } from './types.ts';

// Enhanced flexible column finder with much better scoring and fallbacks
export const findColumnIndex = (headers: string[], possibleNames: string[]): ColumnMapping => {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
  
  let bestMatch = { index: -1, confidence: 0, matchedName: '' };
  
  headers.forEach((header, index) => {
    const normalizedHeader = normalizedHeaders[index];
    
    for (const name of possibleNames) {
      const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      let confidence = 0;
      
      // Exact match gets highest score
      if (normalizedHeader === normalizedName) {
        confidence = 1.0;
      }
      // Partial matches with good scoring
      else if (normalizedHeader.includes(normalizedName)) {
        confidence = normalizedName.length / normalizedHeader.length * 0.9;
      }
      else if (normalizedName.includes(normalizedHeader) && normalizedHeader.length > 2) {
        confidence = normalizedHeader.length / normalizedName.length * 0.8;
      }
      // Word-based matching for compound terms
      else {
        const headerWords = normalizedHeader.split(/\W+/).filter(w => w.length > 1);
        const nameWords = normalizedName.split(/\W+/).filter(w => w.length > 1);
        const commonWords = headerWords.filter(w => nameWords.some(nw => nw.includes(w) || w.includes(nw)));
        
        if (commonWords.length > 0) {
          confidence = (commonWords.length / Math.max(headerWords.length, nameWords.length)) * 0.7;
        }
      }
      
      if (confidence > bestMatch.confidence) {
        bestMatch = { index, confidence, matchedName: header };
      }
    }
  });
  
  // If we didn't find a good match, try position-based fallbacks for common CSV formats
  if (bestMatch.confidence < 0.5) {
    // For date columns, try first few columns if they contain numbers or dates
    if (possibleNames.includes('date')) {
      for (let i = 0; i < Math.min(3, headers.length); i++) {
        const header = headers[i].toLowerCase();
        if (/\d|date|time|when/.test(header)) {
          bestMatch = { index: i, confidence: 0.4, matchedName: headers[i] };
          break;
        }
      }
    }
    
    // For description, try middle columns with text-like names
    if (possibleNames.includes('description') && bestMatch.confidence < 0.3) {
      for (let i = 1; i < headers.length - 1; i++) {
        const header = headers[i].toLowerCase();
        if (/text|desc|detail|memo|ref|narr/.test(header) || header.length > 8) {
          bestMatch = { index: i, confidence: 0.3, matchedName: headers[i] };
          break;
        }
      }
    }
    
    // For amount, try last few columns or columns with currency-like names
    if (possibleNames.includes('amount') && bestMatch.confidence < 0.3) {
      for (let i = headers.length - 1; i >= Math.max(0, headers.length - 3); i--) {
        const header = headers[i].toLowerCase();
        if (/amount|money|value|sum|total|\$|balance/.test(header)) {
          bestMatch = { index: i, confidence: 0.4, matchedName: headers[i] };
          break;
        }
      }
    }
  }
  
  return bestMatch;
};
