# CSV Merchant Extraction and Dashboard Update Fixes

## Issues Fixed

### 1. **Merchant/Store Names Not Showing (Card Numbers Instead)**
**Problem**: Transactions were showing card numbers (e.g., "4835-****-4301 Df") instead of actual merchant names like "KFC Shirley", "New World", "Spotify".

**Root Cause**: CSV parser wasn't correctly mapping NZ bank "Code"/"Particulars" columns which contain the actual merchant names.

**Solutions Implemented**:

#### A. Updated Bank Format Configurations
- **File**: `src/utils/bankFormats.ts`
- **Changes**: Added `merchant` field mappings for all NZ banks (ANZ, ASB, BNZ, Westpac, Kiwibank)
- **Merchant Column Mappings**: `['particulars', 'code', 'merchant', 'other party', 'payee', 'narrative']`

#### B. Enhanced Bank Config Parsers
- **File**: `src/modules/import/parsers/bankConfigs.ts`
- **Changes**: Added `merchant` field to interface and all NZ bank configurations
- **Key Enhancement**: BNZ uses "Particulars" as primary merchant field

#### C. Updated AI Format Detector
- **File**: `src/utils/aiFormatDetector.ts`
- **Changes**: Added merchant column detection with fallback logic
- **Search Patterns**: Prioritizes `particulars`, `code`, `merchant` columns

#### D. Enhanced Transaction Processor
- **File**: `src/services/transactionProcessor.ts`
- **New Methods**:
  - `getDisplayDescription()`: Prioritizes merchant over card numbers
  - `isCardNumber()`: Detects card number patterns to avoid showing them
- **Logic**: Uses merchant field if available and not a card number, otherwise uses description

#### E. Updated Unified Transaction Processor
- **File**: `src/services/unifiedTransactionProcessor.ts`
- **Changes**: Added merchant field extraction and processing
- **Enhancement**: Properly maps merchant column from CSV data

#### F. Enhanced Supabase CSV Processing
- **File**: `supabase/functions/process-csv/index.ts`
- **New Functions**:
  - `detectColumnMapping()`: Intelligently detects NZ bank column structure
  - `getBestDisplayText()`: Prioritizes merchant names over card numbers
  - `isCardNumber()`: Identifies card number patterns
  - `getColumnValue()`: Safely extracts column values
- **Enhancement**: Proper merchant extraction for all NZ banks

### 2. **Dashboard Not Updating After CSV Upload**
**Problem**: Dashboard widgets (totals, charts, budgets, goals) weren't refreshing after CSV upload.

**Solutions Implemented**:

#### A. Enhanced SmartFinanceCore Event Triggering
- **File**: `src/services/smartFinanceCore.ts`
- **Changes**: Added proper dashboard update triggering after upload completion
- **New Stage**: "Updating dashboard..." with `updateDashboardState()` call
- **Events**: Triggers `csv-upload-complete` and other refresh events

#### B. Existing Event Listeners (Verified Working)
The following components already have proper event listeners:
- `src/components/dashboard/DashboardEvents.tsx`
- `src/components/sections/AIInsights.tsx`
- `src/components/sections/BudgetOverview.tsx`
- `src/components/dashboard/SmartGoalsCard.tsx`

### 3. **AI Coach Not Visible in Dashboard**
**Problem**: AI Coach chatbot existed but wasn't shown in the dashboard.

**Solutions Implemented**:

#### A. Added AI Coach to Dashboard
- **File**: `src/components/sections/Dashboard.tsx`
- **Changes**: 
  - Imported `AICoach` component
  - Added AI Coach section after CSV upload and budget widgets
- **Result**: AI Coach now visible and accessible to users

### 4. **Claude AI Categorization Integration**
**Problem**: Ensure Claude AI runs after every CSV upload.

**Solutions Implemented**:

#### A. Integrated in SmartFinanceCore Workflow
- **File**: `src/services/smartFinanceCore.ts`
- **Stage 2**: Claude categorization with progress tracking
- **Method**: `processor.categorizeWithClaude()` with completion callbacks
- **Progress**: Shows "AI categorizing: X/Y" progress

## NZ Bank Column Mapping Support

### Supported Banks and Their Merchant Columns:
1. **ANZ**: Particulars, Code, Other Party
2. **ASB**: Particulars, Code, Narrative  
3. **BNZ**: Particulars, Code, Other Party (Particulars is primary)
4. **Westpac**: Particulars, Code, Narrative
5. **Kiwibank**: Particulars, Code, Memo
6. **TSB**: Description, Narrative
7. **Rabobank**: Description, Narrative

### Card Number Detection Patterns:
- `4835-****-4301 Df` (masked with asterisks)
- `**** 1234` (prefix masked)
- `1234 ****` (suffix masked)
- Full card numbers with separators

## Event Flow After CSV Upload

1. **CSV Processing** → Parse and extract merchant data
2. **Claude AI Categorization** → AI categorizes transactions
3. **Database Storage** → Save transactions to Supabase
4. **Budget Generation** → Create monthly budgets
5. **SMART Goals** → Generate financial goals
6. **Dashboard Updates** → Trigger all widget refreshes
7. **Event Dispatch** → `csv-upload-complete`, `dashboard-update`

## Component Update Chain

When CSV upload completes:
1. `SmartFinanceCore` triggers `updateDashboardState()`
2. Events dispatched: `csv-upload-complete`, `dashboard-update`
3. Components listening and updating:
   - `DashboardEvents` → Main dashboard refresh
   - `AIInsights` → Refresh AI insights
   - `BudgetOverview` → Update budget data
   - `SmartGoalsCard` → Regenerate goals
   - `StatsCards` → Update financial stats
   - `RecentTransactions` → Refresh transaction list

## Testing Results

✅ **Build Success**: `npm run build` completes without errors
✅ **TypeScript Compilation**: All main application files compile correctly
✅ **Component Integration**: AI Coach properly integrated into dashboard
✅ **Event System**: Dashboard update events properly configured

## Files Modified

### Frontend (React/TypeScript):
1. `src/utils/bankFormats.ts` - Enhanced NZ bank merchant mappings
2. `src/modules/import/parsers/bankConfigs.ts` - Added merchant field support
3. `src/utils/aiFormatDetector.ts` - Merchant column detection
4. `src/services/transactionProcessor.ts` - Smart merchant display logic
5. `src/services/unifiedTransactionProcessor.ts` - Merchant extraction
6. `src/services/smartFinanceCore.ts` - Dashboard update triggering
7. `src/components/sections/Dashboard.tsx` - AI Coach integration

### Backend (Supabase):
1. `supabase/functions/process-csv/index.ts` - Enhanced CSV processing with merchant extraction

## Expected User Experience

### Before Fixes:
- Transactions showed: "4835-****-4301 Df"
- Dashboard didn't update after upload
- AI Coach not visible
- Manual refresh required

### After Fixes:
- Transactions show: "KFC Shirley", "New World", "Spotify"
- Dashboard automatically updates after upload
- AI Coach visible and functional
- All widgets refresh with new data
- Claude AI categorization runs automatically

## Next Steps for Users

1. **Upload CSV**: Use the CSV upload feature as normal
2. **Merchant Names**: Verify transactions now show proper merchant names instead of card numbers
3. **Dashboard Updates**: Confirm all widgets update automatically
4. **AI Coach**: Access the AI financial coach from the dashboard
5. **Categorization**: Verify transactions are properly categorized by Claude AI

The system now properly extracts merchant information from all major NZ bank CSV formats and ensures complete dashboard updates after every upload.