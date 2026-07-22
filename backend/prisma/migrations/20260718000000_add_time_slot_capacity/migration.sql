-- Capacity defaults existing private-lesson slots to one place.
ALTER TABLE "TimeSlot" ADD COLUMN "capacity" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "TimeSlot"
ADD CONSTRAINT "TimeSlot_capacity_check" CHECK ("capacity" >= 1);

-- BOOKED was previously used as a single-booking availability flag. Capacity
-- is now derived from active bookings, so keep those slots AVAILABLE while
-- their existing active booking count still makes them full.
UPDATE "TimeSlot" SET "status" = 'AVAILABLE' WHERE "status" = 'BOOKED';

CREATE INDEX "Booking_timeSlotId_status_idx" ON "Booking"("timeSlotId", "status");
