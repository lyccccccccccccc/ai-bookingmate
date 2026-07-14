-- Allow a time slot to keep multiple historical bookings over time.
-- Live double-booking prevention is handled by TimeSlot.status in the booking transaction.
DROP INDEX "Booking_timeSlotId_key";
