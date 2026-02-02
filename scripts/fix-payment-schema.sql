-- Fix payment_transactions table to allow NULL order_id for temporary payments
-- This enables payment-first flow where payment is created before order

USE payment_db;

-- Allow NULL for order_id (needed for temporary payment intents)
ALTER TABLE payment_transactions MODIFY order_id INT NULL;

-- Verify the change
DESCRIBE payment_transactions;

-- Show current schema
SHOW CREATE TABLE payment_transactions;
