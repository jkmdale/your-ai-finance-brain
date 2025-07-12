import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Brain, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { FileUploadZone } from '@/components/csv/FileUploadZone';
import { supabase, validateAuthState } from '@/integrations/supabase/client';
import Papa from 'papaparse';

// Phase 1: Define proper TypeScript interfaces
interface Transaction {
  date: string;
  description: string;
  amount: number;
  category: string | null;
}

interface ProcessingResult {
  success: boolean;
  transactions: Transaction[];
  totalProcessed: number;
  errors: string[];
  warnings: string[];
}

interface BudgetSummary {
  categories: { [key: string]: { budgeted: number; actual: number } };
  totalIncome: number;
  totalExpenses: number;
  savings: number;
}

interface SmartGoal {
  name: string;
  target_amount: number;
  deadline: string;
  rationale: string;
}

interface SchemaTemplate {
  name: string;
  fields: string[];
  map: {
    date: string;
    amount: string;
    description: string;
    debit?: string;
    credit?: string;
  };
}

// Phase 2: File validation constants
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_EXTENSIONS = ['.csv'];
const ALLOWED_MIME_TYPES = ['text/csv', 'application/csv', 'text/plain'];

// Schema detection for NZ banks and common formats
const schemaTemplates: SchemaTemplate[] = [
  {
    name: 'ANZ Bank',
    fields: ['date', 'amount', 'particulars'],
    map: {
      date: 'Date',
      amount: 'Amount',
      description: 'Particulars'
    }
  },
  {
    name: 'ASB Bank',
    fields: ['date', 'amount', 'description'],
    map: {
      date: 'Date',
      amount: 'Amount',
      description: 'Description'
    }
  },
  {
    name: 'Westpac Bank',
    fields: ['date', 'amount', 'transaction'],
    map: {
      date: 'Date',
      amount: 'Amount',
      description: 'Transaction Details'
    }
  },
  {
    name: 'Kiwibank',
    fields: ['date', 'amount', 'payee'],
    map: {
      date: 'Date',
      amount: 'Amount',
      description: 'Payee'
    }
  },
  {
    name: 'BNZ Bank',
    fields: ['date', 'amount', 'reference'],
    map: {
      date: 'Date',
      amount: 'Amount',
      description: 'Reference'
    }
  },
  {
    name: 'Generic Format',
    fields: ['date', 'amount'],
    map: {
      date: 'Date',
      amount: 'Amount',
      description: 'Description'
    }
  }
];

// Phase 2: File validation function
function validateFiles(files: FileList): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (files.length === 0) {
    errors.push('No files selected');
    return { isValid: false, errors };
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`File "${file.name}" is too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }
    
    // Check file extension
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      errors.push(`File "${file.name}" has invalid extension. Only CSV files are allowed`);
    }
    
    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type) && !file.name.toLowerCase().endsWith('.csv')) {
      errors.push(`File "${file.name}" is not a valid CSV file`);
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

function detectSchema(headers: string[], setDebugInfo?: (info: string) => void): SchemaTemplate['map'] | null {
  const debug = (message: string) => {
    console.log(message);
    if (setDebugInfo) {
      setDebugInfo(message);
    }
  };
  
  debug('🔍 CSV Headers found: ' + JSON.stringify(headers));
  
  // Handle edge cases
  if (!headers || headers.length === 0) {
    debug('❌ No headers found in CSV');
    return null;
  }
  
  // Clean and normalize headers
  const cleanHeaders = headers
    .map(h => String(h || '').trim())
    .filter(h => h.length > 0);
    
  if (cleanHeaders.length === 0) {
    debug('❌ All headers are empty after cleaning');
    return null;
  }
  
  const lowerHeaders = cleanHeaders.map(h => h.toLowerCase().trim());
  debug('🔍 Normalized headers: ' + JSON.stringify(lowerHeaders));
  
  // Try exact template matching first
  for (const template of schemaTemplates) {
    debug(`🔍 Testing template: ${template.name} (requires: ${template.fields.join(', ')})`);
    const match = template.fields.every((field) => {
      const found = lowerHeaders.some((h) => h.includes(field.toLowerCase()));
      debug(`  - Looking for "${field}": ${found ? '✅' : '❌'}`);
      return found;
    });
    if (match) {
      debug(`✅ Matched template: ${template.name}`);
      return template.map;
    }
  }
  
  // If no template matches, try intelligent fallback detection
  debug('⚠️ No template matched, trying intelligent detection...');
  return createFlexibleSchema(cleanHeaders, setDebugInfo);
}

function createFlexibleSchema(headers: string[], setDebugInfo?: (info: string) => void): SchemaTemplate['map'] | null {
  const debug = (message: string) => {
    console.log(message);
    if (setDebugInfo) {
      setDebugInfo(message);
    }
  };
  
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  
  // Find date column
  const datePatterns = ['date', 'transaction_date', 'posting_date', 'value_date', 'processed_date'];
  const dateHeader = findBestMatch(lowerHeaders, datePatterns);
  
  // Find separate debit/credit columns first
  const debitPatterns = ['debit', 'debit_amount', 'withdrawal', 'out'];
  const creditPatterns = ['credit', 'credit_amount', 'deposit', 'in'];
  const debitHeader = findBestMatch(lowerHeaders, debitPatterns);
  const creditHeader = findBestMatch(lowerHeaders, creditPatterns);
  
  // Find single amount column if no debit/credit
  const amountPatterns = ['amount', 'value', 'transaction_amount', 'net_amount'];
  const amountHeader = findBestMatch(lowerHeaders, amountPatterns);
  
  // Find description column
  const descriptionPatterns = ['description', 'particulars', 'payee', 'reference', 'details', 'memo', 'narrative', 'transaction_details'];
  const descriptionHeader = findBestMatch(lowerHeaders, descriptionPatterns);
  
  debug('🔍 Detected columns: ' + JSON.stringify({ dateHeader, amountHeader, debitHeader, creditHeader, descriptionHeader }));
  
  const originalHeaders = headers; // Keep original case
  
  // Check if we have separate debit/credit columns
  if (dateHeader && debitHeader && creditHeader) {
    return {
      date: originalHeaders[lowerHeaders.indexOf(dateHeader)],
      amount: originalHeaders[lowerHeaders.indexOf(debitHeader)], // Use debit as amount for compatibility
      debit: originalHeaders[lowerHeaders.indexOf(debitHeader)],
      credit: originalHeaders[lowerHeaders.indexOf(creditHeader)],
      description: descriptionHeader ? originalHeaders[lowerHeaders.indexOf(descriptionHeader)] : debitHeader
    };
  }
  
  // Otherwise we need at least date and amount columns
  if (dateHeader && amountHeader) {
    return {
      date: originalHeaders[lowerHeaders.indexOf(dateHeader)],
      amount: originalHeaders[lowerHeaders.indexOf(amountHeader)],
      description: descriptionHeader ? originalHeaders[lowerHeaders.indexOf(descriptionHeader)] : amountHeader
    };
  }
  
  return null;
}

function findBestMatch(headers: string[], patterns: string[]): string | null {
  // First try exact matches
  for (const pattern of patterns) {
    const match = headers.find(h => h === pattern);
    if (match) return match;
  }
  
  // Then try contains matches
  for (const pattern of patterns) {
    const match = headers.find(h => h.includes(pattern));
    if (match) return match;
  }
  
  // Finally try partial matches where header is contained in pattern
  for (const pattern of patterns) {
    const match = headers.find(h => pattern.includes(h) && h.length > 2);
    if (match) return match;
  }
  
  return null;
}

function normalizeDate(dateStr: string): string | null {
  if (!dateStr) {
    console.log('❌ Date is empty or null:', dateStr);
    return null;
  }
  
  const cleanDateStr = String(dateStr).trim();
  if (!cleanDateStr) {
    console.log('❌ Date is empty after cleaning:', dateStr);
    return null;
  }
  
  console.log('🔍 Parsing date:', cleanDateStr);
  
  // Try DD/MM/YYYY format (NZ standard)
  const ddmmyyyy = cleanDateStr.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1]);
    const month = parseInt(ddmmyyyy[2]);
    const year = parseInt(ddmmyyyy[3]);
    
    console.log(`✅ DD/MM/YYYY matched: ${day}/${month}/${year}`);
    
    // Very permissive validation - just check basic ranges
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2000 && year <= 2030) {
      const isoDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      console.log(`✅ Date converted: ${cleanDateStr} → ${isoDate}`);
      return isoDate;
    } else {
      console.log(`❌ Date out of range: day=${day}, month=${month}, year=${year}`);
    }
  } else {
    console.log('❌ DD/MM/YYYY regex did not match');
  }
  
  // Try simple pattern - just numbers and slashes
  const simplePattern = cleanDateStr.match(/(\d+)\/(\d+)\/(\d+)/);
  if (simplePattern) {
    const day = parseInt(simplePattern[1]);
    const month = parseInt(simplePattern[2]);
    const year = parseInt(simplePattern[3]);
    
    console.log(`🔍 Simple pattern matched: ${day}/${month}/${year}`);
    
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2000 && year <= 2030) {
      const isoDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      console.log(`✅ Date converted via simple pattern: ${cleanDateStr} → ${isoDate}`);
      return isoDate;
    }
  }
  
  console.log(`❌ All patterns failed for: "${cleanDateStr}"`);
  return null;
}

async function fetchClaudeResponse(transactions: Transaction[]): Promise<Transaction[]> {
  const CLAUDE_PROXY_URL = 'https://gzznuwtxyyaqlbbrxsuz.supabase.co/functions/v1/ai-coach';
  
  const categorizedTransactions: Transaction[] = [];
  
  for (const transaction of transactions) {
    try {
      const prompt = `Categorize the following transaction description into a personal finance category such as groceries, dining, rent, transport, shopping, utilities, salary, or other. Just return the category.

Transaction: "${transaction.description}"`;

      const response = await fetch(CLAUDE_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt })
      });

      if (response.ok) {
        const data = await response.json();
        const category = (data.completion || '').trim().toLowerCase();
        categorizedTransactions.push({
          ...transaction,
          category: category || 'other'
        });
      } else {
        categorizedTransactions.push({
          ...transaction,
          category: 'other'
        });
      }
    } catch (error) {
      console.warn('Claude categorization failed for:', transaction.description);
      categorizedTransactions.push({
        ...transaction,
        category: 'other'
      });
    }
  }
  
  return categorizedTransactions;
}

function generateZeroBasedBudget(transactions: Transaction[]): BudgetSummary {
  const categories: { [key: string]: { budgeted: number; actual: number } } = {};
  let totalIncome = 0;
  let totalExpenses = 0;

  // Calculate actual spending by category
  transactions.forEach(transaction => {
    const amount = Math.abs(transaction.amount);
    const category = transaction.category || 'other';
    
    if (transaction.amount > 0) {
      totalIncome += amount;
    } else {
      totalExpenses += amount;
      if (!categories[category]) {
        categories[category] = { budgeted: 0, actual: 0 };
      }
      categories[category].actual += amount;
    }
  });

  // Generate budget recommendations (simple 50/30/20 rule)
  const disposableIncome = Math.max(0, totalIncome - totalExpenses);
  
  Object.keys(categories).forEach(category => {
    // Set budget as 110% of actual spending (allowing for some growth)
    categories[category].budgeted = Math.round(categories[category].actual * 1.1);
  });

  return {
    categories,
    totalIncome,
    totalExpenses,
    savings: disposableIncome
  };
}

function generateSmartGoals(transactions: Transaction[]): SmartGoal[] {
  const totalIncome = transactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpenses = transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  const disposableIncome = Math.max(0, totalIncome - totalExpenses);
  
  const goals: SmartGoal[] = [];
  
  if (disposableIncome > 0) {
    goals.push({
      name: `Emergency Fund Goal`,
      target_amount: Math.round(totalExpenses * 3), // 3 months expenses
      deadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year
      rationale: `Build emergency fund equal to 3 months of expenses ($${Math.round(totalExpenses * 3)}) for financial security`
    });
    
    if (disposableIncome > 200) {
      goals.push({
        name: `Monthly Savings Goal`,
        target_amount: Math.round(disposableIncome * 0.2), // 20% of disposable income
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 month
        rationale: `Save 20% of disposable income ($${Math.round(disposableIncome * 0.2)}) each month for long-term financial health`
      });
    }
  }
  
  return goals;
}

// Phase 5: Processing stages for progress indicator
enum ProcessingStage {
  IDLE = 'idle',
  VALIDATING = 'validating',
  PARSING = 'parsing',
  CATEGORIZING = 'categorizing',
  GENERATING_BUDGET = 'generating_budget',
  GENERATING_GOALS = 'generating_goals',
  COMPLETED = 'completed',
  ERROR = 'error'
}

export const CSVUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error' | 'processing'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [processingStage, setProcessingStage] = useState<ProcessingStage>(ProcessingStage.IDLE);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  // ✅ FIXED: Direct auth state management with Supabase subscription
  const [authState, setAuthState] = useState<{
    user: any;
    session: any;
    loading: boolean;
    isAuthenticated: boolean;
    error: string | null;
  }>({
    user: null,
    session: null,
    loading: true,
    isAuthenticated: false,
    error: null
  });
  
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ FIXED: Direct Supabase auth subscription for real-time updates
  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        if (import.meta.env.DEV) {
          console.log('🔐 CSV Upload: Initializing auth state...');
        }
        
        const authResult = await validateAuthState();
        
        if (isMounted) {
          setAuthState({
            user: authResult.user,
            session: authResult.session,
            loading: false,
            isAuthenticated: authResult.valid,
            error: authResult.error?.message || null
          });
          
          if (import.meta.env.DEV) {
            console.log('🔐 CSV Upload: Auth state initialized:', {
              hasUser: !!authResult.user,
              hasSession: !!authResult.session,
              isValid: authResult.valid,
              userId: authResult.user?.id,
              email: authResult.user?.email
            });
          }
        }
      } catch (error) {
        if (isMounted) {
          setAuthState({
            user: null,
            session: null,
            loading: false,
            isAuthenticated: false,
            error: error instanceof Error ? error.message : 'Auth initialization failed'
          });
        }
      }
    };

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        if (import.meta.env.DEV) {
          console.log('🔐 CSV Upload: Auth state changed:', {
            event,
            hasSession: !!session,
            hasUser: !!session?.user,
            userId: session?.user?.id,
            email: session?.user?.email
          });
        }
        
        // Handle session expiry by redirecting to login
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.log('🔐 Session expired, redirecting to login');
          window.location.reload(); // Force reload to trigger login
          return;
        }
        
        const isAuthenticated = !!(session && session.user && session.user.id);
        
        setAuthState({
          user: session?.user || null,
          session: session,
          loading: false,
          isAuthenticated,
          error: null
        });
      }
    );

    // Initialize auth state
    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ✅ FIXED: Clear, simple authentication check
  const { user, session, loading, isAuthenticated, error } = authState;

  // Phase 2: Clear UI state function
  const clearUIState = () => {
    setUploadStatus('idle');
    setUploadMessage('');
    setProcessingStage(ProcessingStage.IDLE);
    setProcessingProgress(0);
    setDebugInfo('');
  };

  const handleOpenFilePicker = () => {
    if (uploading || !isAuthenticated) return; // Phase 2: Prevent interaction during processing or if not authenticated
    
    setIsPickerOpen(true);
    fileInputRef.current?.click();
    setTimeout(() => setIsPickerOpen(false), 100);
  };

  const handleFileUpload = async (files: FileList) => {
    if (import.meta.env.DEV) {
      console.log('🚀 handleFileUpload called with files:', files);
      console.log('🔐 Auth check - isAuthenticated:', isAuthenticated, 'user:', !!user, 'session:', !!session);
    }
    
    // ✅ FIXED: Strict authentication requirement with clear error messages
    if (!isAuthenticated) {
      if (import.meta.env.DEV) {
        console.log('❌ User not authenticated');
        console.log('🔧 Debug info:', {
          user: user?.id,
          session: session?.user?.id,
          loading,
          isAuthenticated,
          error
        });
      }
      
      toast({
        title: "Authentication Required",
        description: "Please log in to upload CSV files",
        variant: "destructive",
      });
      
      return; // Block upload completely
    }

    // Phase 2: Clear previous state
    clearUIState();

    // Phase 2: File validation
    setProcessingStage(ProcessingStage.VALIDATING);
    setProcessingProgress(5);
    
    const validation = validateFiles(files);
    if (!validation.isValid) {
      console.log('❌ File validation failed:', validation.errors);
      setUploadStatus('error');
      setUploadMessage(validation.errors.join('. '));
      setProcessingStage(ProcessingStage.ERROR);
      
      toast({
        title: "Invalid Files",
        description: validation.errors.join('. '),
        variant: "destructive",
      });
      return;
    }

    // Phase 2: Disable upload during processing
    setUploading(true);
    setUploadStatus('processing');
    setUploadMessage('Starting CSV processing...');

    try {
      const allTransactions: Transaction[] = [];
      
      // Phase 2 & 3: Wrap in try/catch with proper error handling
      setProcessingStage(ProcessingStage.PARSING);
      setProcessingProgress(20);
      
      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadMessage(`Processing file ${i + 1}/${files.length}: ${file.name}`);
        
        const transactions = await new Promise<Transaction[]>((resolve, reject) => {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
              try {
                console.log('📄 CSV parse results:', results);
                
                if (!results.data || results.data.length === 0) {
                  reject(new Error(`CSV file "${file.name}" appears to be empty`));
                  return;
                }

                const detectedSchema = detectSchema(results.meta.fields || [], (info) => {
                  setDebugInfo(prev => prev + info + '\n');
                });
                console.log('🔍 Detected schema:', detectedSchema);
                
                if (!detectedSchema) {
                  reject(new Error(`CSV format not recognized in "${file.name}". Please ensure your CSV has Date, Amount, and Description columns.`));
                  return;
                }

                console.log(`📊 Processing ${results.data.length} rows from ${file.name}`);
                
                let validTransactions = 0;
                let skippedRows = 0;
                
                const cleanedData = (results.data as any[])
                  .map((row, index) => {
                    const rawDate = row[detectedSchema.date];
                    const normalizedDate = normalizeDate(rawDate);
                    
                    if (!normalizedDate) {
                      console.log(`⚠️ Skipping row ${index + 1} with invalid date: ${rawDate}`);
                      skippedRows++;
                      return null;
                    }

                    // Handle different amount column scenarios
                    let amount = 0;
                    if ('debit' in detectedSchema && 'credit' in detectedSchema) {
                      // Separate debit/credit columns
                      const debit = parseFloat(row[detectedSchema.debit!] || '0');
                      const credit = parseFloat(row[detectedSchema.credit!] || '0');
                      amount = credit - debit; // Credit is positive, debit is negative
                    } else if ('amount' in detectedSchema) {
                      // Single amount column
                      const rawAmount = row[detectedSchema.amount];
                      amount = parseFloat(rawAmount || '0');
                      if (isNaN(amount)) {
                        console.warn(`Skipping row ${index + 1} with invalid amount: ${rawAmount}`);
                        skippedRows++;
                        return null;
                      }
                    }
                    
                    validTransactions++;
                    return {
                      date: normalizedDate,
                      description: row[detectedSchema.description] || '',
                      amount: amount,
                      category: null // to be filled later
                    };
                  })
                  .filter((tx): tx is Transaction => tx !== null);

                console.log(`📊 Processing results: ${validTransactions} successful, ${skippedRows} skipped`);
                console.log(`✅ Cleaned ${cleanedData.length} transactions from ${file.name}`);
                
                if (cleanedData.length === 0) {
                  reject(new Error(`No valid transactions found in ${file.name}. ${skippedRows} rows had invalid data. Please check your CSV format.`));
                  return;
                }
                
                resolve(cleanedData);
              } catch (error: any) {
                reject(new Error(`Error processing ${file.name}: ${error.message}`));
              }
            },
            error: function(err) {
              reject(new Error(`CSV parsing error in ${file.name}: ${err.message}`));
            }
          });
        });
        
        allTransactions.push(...transactions);
        setProcessingProgress(20 + (i + 1) / files.length * 30);
      }
      
      if (allTransactions.length === 0) {
        throw new Error('No transactions found in any of the uploaded files');
      }
      
      // Phase 3: Validate transaction data
      const validTransactions = allTransactions.filter(tx => 
        tx.date && tx.description && !isNaN(tx.amount)
      );
      
      if (validTransactions.length === 0) {
        throw new Error('No valid transactions found after validation');
      }
      
      if (validTransactions.length < allTransactions.length) {
        const skipped = allTransactions.length - validTransactions.length;
        console.warn(`Filtered out ${skipped} invalid transactions`);
      }
      
      setProcessingStage(ProcessingStage.CATEGORIZING);
      setProcessingProgress(60);
      setUploadMessage(`Categorizing ${validTransactions.length} transactions with Claude AI...`);
      
      // Claude categorization with error handling
      let categorizedTransactions: Transaction[];
      try {
        categorizedTransactions = await fetchClaudeResponse(validTransactions);
      } catch (error: any) {
        console.warn('Claude categorization failed, using uncategorized transactions:', error);
        categorizedTransactions = validTransactions.map(tx => ({ ...tx, category: 'other' }));
        
        toast({
          title: "AI Categorization Warning",
          description: "Transaction categorization failed, but processing will continue",
          variant: "default",
        });
      }
      
      setProcessingStage(ProcessingStage.GENERATING_BUDGET);
      setProcessingProgress(80);
      setUploadMessage('Generating budget and goals...');
      
      // Generate budget and goals with error handling
      let budget: BudgetSummary;
      let goals: SmartGoal[];
      
      try {
        budget = generateZeroBasedBudget(categorizedTransactions);
        goals = generateSmartGoals(categorizedTransactions);
      } catch (error: any) {
        console.error('Budget/goals generation failed:', error);
        throw new Error(`Failed to generate budget and goals: ${error.message}`);
      }
      
      setProcessingStage(ProcessingStage.COMPLETED);
      setProcessingProgress(100);
      setUploadStatus('success');
      setUploadMessage(`✅ Complete! Processed ${categorizedTransactions.length} transactions with AI categorization`);
      
      console.log('💰 Generated budget:', budget);
      console.log('🎯 Generated goals:', goals);
      
      toast({
        title: "CSV Processing Complete! 🎉",
        description: `${categorizedTransactions.length} transactions processed successfully`,
        duration: 8000,
      });

      // Trigger dashboard refresh
      window.dispatchEvent(new CustomEvent('csv-data-ready', { 
        detail: {
          transactions: categorizedTransactions,
          budget,
          goals,
          success: true,
          userId: user?.id || session?.user?.id // Include user ID for dashboard
        }
      }));
      
    } catch (error: any) {
      console.error('❌ CSV processing error:', error);
      setUploadStatus('error');
      setProcessingStage(ProcessingStage.ERROR);
      setUploadMessage(`Processing failed: ${error.message}`);
      
      toast({
        title: "Processing Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      // Phase 2: Re-enable upload after processing
      setUploading(false);
    }
  };

  // Phase 5: Progress indicator component
  const renderProgressIndicator = () => {
    if (processingStage === ProcessingStage.IDLE) return null;
    
    const stageMessages = {
      [ProcessingStage.VALIDATING]: 'Validating files...',
      [ProcessingStage.PARSING]: 'Parsing CSV data...',
      [ProcessingStage.CATEGORIZING]: 'AI categorization in progress...',
      [ProcessingStage.GENERATING_BUDGET]: 'Generating budget and goals...',
      [ProcessingStage.COMPLETED]: 'Processing complete!',
      [ProcessingStage.ERROR]: 'Processing failed',
      [ProcessingStage.IDLE]: ''
    };
    
    return (
      <div className="mt-4 p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
        <div className="flex items-center space-x-3 mb-2">
          {processingStage === ProcessingStage.ERROR ? (
            <AlertCircle className="w-5 h-5 text-red-400" />
          ) : processingStage === ProcessingStage.COMPLETED ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : (
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
          )}
          <span className="text-white font-medium">
            {stageMessages[processingStage]}
          </span>
        </div>
        
        {processingStage !== ProcessingStage.COMPLETED && processingStage !== ProcessingStage.ERROR && (
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${processingProgress}%` }}
            />
          </div>
        )}
        
        {uploadMessage && (
          <p className="text-white/70 text-sm mt-2">{uploadMessage}</p>
        )}
      </div>
    );
  };

  return (
    <div id="upload" className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
          <Upload className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-white">Smart CSV Processing</h3>
          <p className="text-white/70 text-sm">Upload → Claude Categorization → Budget → Goals → Dashboard Update</p>
        </div>
      </div>

      {/* ✅ FIXED: Clear authentication states without debug bypass */}
      {loading && (
        <div className="mb-4 p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
          <p className="text-blue-300 text-sm font-medium flex items-center">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Checking authentication...
          </p>
        </div>
      )}
      
      {!isAuthenticated && !loading && (
        <div className="mb-4 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-300 text-sm font-medium">⚠️ Please log in to upload CSV files</p>
          {import.meta.env.DEV && (
            <div className="mt-2 text-xs text-yellow-400">
              Debug: user={user?.id ? 'exists' : 'null'}, session={session?.user?.id ? 'exists' : 'null'}, loading={loading.toString()}
            </div>
          )}
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
          <p className="text-red-300 text-sm font-medium">❌ Authentication Error: {error}</p>
        </div>
      )}
      
      {isAuthenticated && (
        <div className="mb-4 p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
          <p className="text-green-300 text-sm font-medium">✅ Ready to upload CSV files</p>
          {import.meta.env.DEV && (
            <div className="mt-2 text-xs text-green-400">
              User: {user?.email} | Session: {session?.access_token ? 'Valid' : 'Invalid'}
            </div>
          )}
        </div>
      )}

              <div className="space-y-6">
          {/* File Upload Zone */}
          <FileUploadZone
            user={user}
            uploading={uploading}
            processing={uploadStatus === 'processing'}
            isPickerOpen={isPickerOpen}
            onFilesSelected={handleFileUpload}
            onOpenFilePicker={handleOpenFilePicker}
          />
          
          {/* Hidden file input for click-to-upload */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".csv,text/csv"
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            disabled={uploading || !isAuthenticated}
            className="hidden"
          />

        {/* Phase 5: Progress Indicator */}
        {renderProgressIndicator()}

        {/* Phase 2: File validation info */}
        <div className="p-4 bg-gray-800/50 border border-gray-700/50 rounded-lg">
          <h4 className="text-white font-medium mb-2">📋 File Requirements</h4>
          <ul className="text-white/70 text-sm space-y-1">
            <li>• File format: CSV only (.csv extension)</li>
            <li>• Maximum size: {MAX_FILE_SIZE / (1024 * 1024)}MB per file</li>
            <li>• Required columns: Date, Amount, Description</li>
            <li>• Date format: DD/MM/YYYY (New Zealand standard)</li>
            <li>• Supported banks: ANZ, ASB, Westpac, Kiwibank, BNZ</li>
          </ul>
        </div>

        {/* Debug info display */}
        {debugInfo && (
          <div className="p-4 bg-gray-900/50 border border-gray-600/50 rounded-lg">
            <h4 className="text-white font-medium mb-2">🔧 Processing Details</h4>
            <pre className="text-xs text-white/70 whitespace-pre-wrap max-h-40 overflow-y-auto">
              {debugInfo}
            </pre>
          </div>
        )}

        {/* Features list with updated content */}
        <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg">
          <h4 className="text-white font-medium mb-3">✨ What happens after upload:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>🔄 Automatic date normalization (DD/MM/YYYY, YYYY-MM-DD, etc.)</div>
            <div>🧠 Claude AI transaction categorization</div>
            <div>💰 Zero-based budget generation</div>
            <div>🎯 SMART financial goals creation</div>
            <div>📊 Real-time dashboard updates</div>
            <div>🔒 Secure processing with validation</div>
          </div>
        </div>
      </div>
    </div>
  );
};