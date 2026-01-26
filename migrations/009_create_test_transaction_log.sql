-- Create test transaction log entry for customer 5
INSERT INTO transaction_logs (registered_customer_id, total_amount, paid_amount, created_at, updated_at)
VALUES (5, 1950000.00, 10000.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
