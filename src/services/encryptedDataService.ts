
import { supabase } from '@/integrations/supabase/client';
import { keyManagerService } from './keyManagerService';

interface EncryptedRecord {
  [key: string]: any;
  encrypted_data?: string;
  encryption_metadata?: any;
}

class EncryptedDataService {
  // Encrypt and store transaction
  async createTransaction(userId: string, transactionData: any): Promise<any> {
    try {
      const { encryptedData, metadata } = await keyManagerService.encryptForStorage({
        description: transactionData.description,
        amount: transactionData.amount,
        merchant: transactionData.merchant,
        notes: transactionData.notes,
        tags: transactionData.tags
      });

      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          account_id: transactionData.account_id,
          transaction_date: transactionData.transaction_date,
          is_income: transactionData.is_income,
          category_id: transactionData.category_id,
          is_recurring: transactionData.is_recurring,
          imported_from: transactionData.imported_from,
          external_id: transactionData.external_id,
          encrypted_data: encryptedData,
          encryption_metadata: metadata,
          // Store non-sensitive fields in plain text for querying
          description: '[ENCRYPTED]',
          amount: 0, // We might want to store encrypted amounts separately
          merchant: '[ENCRYPTED]',
          notes: '[ENCRYPTED]'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating encrypted transaction:', error);
      throw error;
    }
  }

  // Retrieve and decrypt transactions
  async getTransactions(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      if (!data) return [];

      // Decrypt each transaction
      const decryptedTransactions = await Promise.all(
        data.map(async (transaction) => {
          if (transaction.encrypted_data) {
            try {
              const decryptedData = await keyManagerService.decryptFromStorage(transaction.encrypted_data);
              return {
                ...transaction,
                description: decryptedData.description,
                amount: decryptedData.amount,
                merchant: decryptedData.merchant,
                notes: decryptedData.notes,
                tags: decryptedData.tags
              };
            } catch (decryptError) {
              console.error('Error decrypting transaction:', decryptError);
              return transaction; // Return as-is if decryption fails
            }
          }
          return transaction;
        })
      );

      return decryptedTransactions;
    } catch (error) {
      console.error('Error getting transactions:', error);
      throw error;
    }
  }

  // Encrypt and store bank account
  async createBankAccount(userId: string, accountData: any): Promise<any> {
    try {
      const { encryptedData, metadata } = await keyManagerService.encryptForStorage({
        account_name: accountData.account_name,
        bank_name: accountData.bank_name,
        account_number_last4: accountData.account_number_last4,
        balance: accountData.balance
      });

      const { data, error } = await supabase
        .from('bank_accounts')
        .insert({
          user_id: userId,
          account_type: accountData.account_type,
          currency: accountData.currency,
          is_active: accountData.is_active,
          encrypted_data: encryptedData,
          encryption_metadata: metadata,
          // Store placeholders for non-encrypted fields
          account_name: '[ENCRYPTED]',
          bank_name: '[ENCRYPTED]',
          account_number_last4: '[ENCRYPTED]',
          balance: 0
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating encrypted bank account:', error);
      throw error;
    }
  }

  // Retrieve and decrypt bank accounts
  async getBankAccounts(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      if (!data) return [];

      const decryptedAccounts = await Promise.all(
        data.map(async (account) => {
          if (account.encrypted_data) {
            try {
              const decryptedData = await keyManagerService.decryptFromStorage(account.encrypted_data);
              return {
                ...account,
                account_name: decryptedData.account_name,
                bank_name: decryptedData.bank_name,
                account_number_last4: decryptedData.account_number_last4,
                balance: decryptedData.balance
              };
            } catch (decryptError) {
              console.error('Error decrypting bank account:', decryptError);
              return account;
            }
          }
          return account;
        })
      );

      return decryptedAccounts;
    } catch (error) {
      console.error('Error getting bank accounts:', error);
      throw error;
    }
  }

  // Generic method to encrypt and update any record
  async updateEncryptedRecord(
    table: string,
    recordId: string,
    userId: string,
    sensitiveData: any,
    otherData: any = {}
  ): Promise<any> {
    try {
      const { encryptedData, metadata } = await keyManagerService.encryptForStorage(sensitiveData);

      const { data, error } = await supabase
        .from(table)
        .update({
          ...otherData,
          encrypted_data: encryptedData,
          encryption_metadata: metadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', recordId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error updating encrypted ${table} record:`, error);
      throw error;
    }
  }

  // Generic method to decrypt records
  async decryptRecord(record: EncryptedRecord, sensitiveFields: string[]): Promise<any> {
    if (!record.encrypted_data) return record;

    try {
      const decryptedData = await keyManagerService.decryptFromStorage(record.encrypted_data);
      
      const result = { ...record };
      sensitiveFields.forEach(field => {
        if (decryptedData[field] !== undefined) {
          result[field] = decryptedData[field];
        }
      });

      return result;
    } catch (error) {
      console.error('Error decrypting record:', error);
      return record;
    }
  }
}

export const encryptedDataService = new EncryptedDataService();
