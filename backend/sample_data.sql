-- Sample data for PA Task Tracker
-- Run this AFTER the database has been initialized by running app.py once

USE task_tracker;

-- Insert sample tasks
INSERT INTO tasks (title, description, category, client, task_date, task_time, duration, status, notes) VALUES
('Reviewed insurance claim #12345', 'Checked claim documentation and contacted insurance company', 'insurance', 'Cohen Family', '2024-12-20', '09:30:00', 1.5, 'completed', 'Claim approved, notified client'),
('Processed mortgage documents', 'Reviewed and submitted mortgage application paperwork', 'banking', 'Levy Business', '2024-12-20', '11:00:00', 2.0, 'completed', ''),
('Responded to 15 emails', 'Handled client inquiries and scheduled appointments', 'emails', NULL, '2024-12-20', '14:30:00', 1.0, 'completed', 'Priority emails completed'),
('Customer support call - policy question', 'Assisted client with understanding policy terms', 'customer-support', 'Goldstein Ltd', '2024-12-21', '10:15:00', 0.75, 'completed', 'Client satisfied with explanation'),
('Scheduled Q1 appointments', 'Organized calendar for next quarter meetings', 'scheduling', NULL, '2024-12-21', '15:00:00', 0.5, 'completed', ''),
('Bank account reconciliation', 'Reviewed monthly statements for 3 accounts', 'banking', 'Mizrachi Holdings', '2024-12-22', '09:00:00', 2.5, 'completed', 'Found and resolved discrepancy'),
('Follow-up on pending insurance claim', 'Called insurance company for status update', 'insurance', 'Cohen Family', '2024-12-23', '13:00:00', 0.5, 'uncompleted', 'Waiting for callback'),
('Document scanning and filing', 'Digitized 50 pages of client documents', 'documentation', 'Levy Business', '2024-12-23', '10:30:00', 1.25, 'completed', 'Filed in cloud storage'),
('Research tax deduction options', 'Investigated potential deductions for client business', 'research', 'Goldstein Ltd', '2024-12-24', NULL, 1.5, 'uncompleted', 'Need to consult with accountant'),
('Phone call with bank representative', 'Resolved overdraft fee issue', 'phone-calls', 'Mizrachi Holdings', '2024-12-25', '14:00:00', 0.5, 'completed', 'Fee waived successfully'),
('Email correspondence - contract review', 'Exchanged emails regarding service contract', 'emails', 'Goldstein Ltd', '2024-12-26', NULL, NULL, 'uncompleted', 'Waiting for client response');

-- Verify insertion
SELECT COUNT(*) as total_tasks FROM tasks;
SELECT category, COUNT(*) as count FROM tasks GROUP BY category;
