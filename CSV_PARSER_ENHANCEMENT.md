# Enhanced CSV Parser for NZ Banks

## Overview

The CSV importer has been enhanced to support all major NZ banks and can automatically handle unknown or future bank formats. The system uses a three-tier approach:

1. **Configuration-based parsing** - For known banks with predefined column mappings
2. **Intelligent parsing** - Pattern matching for unknown formats
3. **Fallback parsing** - Basic parsing when other methods fail

## Features

### Supported Banks

The system now supports all major NZ banks:

- **Original 5 banks**: ANZ, ASB, Westpac, Kiwibank, BNZ
- **Additional banks**: TSB, Rabobank, Co-operative Bank, SBS Bank, Heartland Bank
- **Unknown banks**: Automatically handled by intelligent parser

### Key Enhancements

1. **Flexible Column Detection**
   - Automatically detects column names using pattern matching
   - Handles variations like "Transaction Date", "Trans Date", "Date", etc.
   - Supports both single amount columns and separate debit/credit columns

2. **Robust Date Parsing**
   - Handles multiple date formats: DD/MM/YYYY, YYYY-MM-DD, DD.MM.YY, etc.
   - Supports both 2-digit and 4-digit years
   - Validates dates for correctness

3. **Smart Amount Parsing**
   - Removes currency symbols ($, NZD)
   - Handles thousands separators (commas)
   - Detects negative amounts from separate debit/credit columns

4. **Confidence Levels**
   - **High**: Known bank with successful parsing
   - **Medium**: Unknown bank but successful intelligent parsing
   - **Low**: Had to use fallback parser

## Architecture

### File Structure

```
src/modules/import/parsers/
├── bankCsvParser.ts          # Main entry point
├── unifiedBankParser.ts      # Unified parsing logic
├── intelligentParser.ts      # Pattern-based parser for unknown formats
├── bankConfigs.ts           # Bank configurations
├── anz.ts, asb.ts, etc.    # Legacy individual bank parsers
└── tests/
    └── unifiedParser.test.ts # Test cases
```

### How It Works

1. **Bank Detection**
   ```typescript
   // The parser tries multiple detection methods:
   - Filename patterns (e.g., "anz-statement.csv")
   - Header patterns (e.g., columns containing bank names)
   - Content patterns (e.g., bank name in transactions)
   ```

2. **Column Mapping**
   ```typescript
   // For known banks, uses predefined mappings:
   {
     date: ['Date', 'Transaction Date', 'Trans Date'],
     description: ['Details', 'Transaction Details'],
     amount: ['Amount', 'Transaction Amount']
   }
   ```

3. **Intelligent Parsing**
   ```typescript
   // For unknown formats, searches for patterns:
   - Date columns: 'date', 'transaction date', 'posting date'
   - Description: 'description', 'details', 'narrative', 'merchant'
   - Amount: 'amount', 'value', 'debit', 'credit'
   ```

## Usage Examples

### Basic Usage

```typescript
import { parseBankCSV } from '@/modules/import/parsers/bankCsvParser';

// Parse any bank CSV file
const transactions = parseBankCSV('statement.csv', csvData, headers);

// Each transaction contains:
{
  date: '2024-12-01',
  description: 'Coffee Shop',
  amount: 5.50,
  type: 'debit',
  account: 'ANZ',  // or 'Unknown' for unrecognized banks
  source: 'bank-config'  // or 'intelligent-parser', 'fallback'
}
```

### Adding New Bank Support

You can add support for new banks without modifying the core code:

```typescript
import { addBankConfig } from '@/modules/import/parsers/bankConfigs';

addBankConfig({
  name: 'New Bank NZ',
  identifiers: {
    filePatterns: ['newbank', 'nbnz'],
    headerPatterns: ['new bank', 'transaction ref'],
    contentPatterns: ['new bank limited']
  },
  columns: {
    date: ['Transaction Date', 'Posted Date'],
    description: ['Transaction Details', 'Merchant Name'],
    amount: ['Amount'],
    reference: ['Reference Number', 'Transaction ID']
  }
});
```

## Handling Edge Cases

### Unknown Column Names

The intelligent parser will:
1. Look for date-like patterns (DD/MM/YYYY)
2. Find text fields for descriptions
3. Identify numeric fields for amounts
4. Use positional fallback if pattern matching fails

### Complex Formats

For banks with unusual formats:

```typescript
// Separate debit/credit columns
{ Date: '01/12/2024', Description: 'Purchase', Debit: '50.00', Credit: '' }

// Multiple description fields
{ Date: '01/12/2024', Code: 'POS', Reference: '12345', Details: 'Store' }

// Non-standard date formats
{ TransDate: '1-Dec-24', Narrative: 'Payment', Value: '-100.00' }
```

All these formats are automatically handled.

## Testing

The parser includes comprehensive tests for:
- All major NZ banks
- Unknown formats
- Edge cases (empty data, malformed amounts, various date formats)
- Custom bank configurations

Run tests with:
```bash
npm test src/modules/import/parsers/tests/unifiedParser.test.ts
```

## Future Enhancements

Potential improvements:
1. Machine learning for better column detection
2. Support for multi-currency transactions
3. Automatic category detection from descriptions
4. Bank statement PDF parsing
5. Real-time format learning from user corrections

## Troubleshooting

If the parser fails:
1. Check console for warnings about parsing confidence
2. Verify CSV file has headers
3. Ensure amounts are numeric (not text like "fifty dollars")
4. Check date formats are recognizable
5. Add custom bank configuration if needed