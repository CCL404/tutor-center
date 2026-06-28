-- Add 'pending' status to attendance_status enum
-- Pending: session scheduled, attendance not yet marked (time hasn't come)
alter type attendance_status add value 'pending';
