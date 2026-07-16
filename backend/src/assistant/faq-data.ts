export type FaqEntry = {
  id: string;
  category: string;
  question: string;
  keywords: string[];
  answer: string;
};

export const faqEntries: FaqEntry[] = [
  {
    id: 'faq-book-service',
    category: 'Booking',
    question: 'How do I book a service?',
    keywords: ['book', 'booking', 'reserve', 'service', 'time', 'slot'],
    answer:
      'Go to the Services page, choose a service, pick an available time slot, and click Book this time. You need to be logged in before the booking can be created.',
  },
  {
    id: 'faq-cancel-booking',
    category: 'Bookings',
    question: 'How do I cancel a booking?',
    keywords: ['cancel', 'cancellation', 'booking', 'my bookings'],
    answer:
      'Log in, open My Bookings, find the booking you want to cancel, and click Cancel Booking. Cancelled bookings stay in your history.',
  },
  {
    id: 'faq-slot-disappeared',
    category: 'Availability',
    question: 'Why did a time slot disappear?',
    keywords: ['disappear', 'missing', 'slot', 'available', 'booked', 'blocked'],
    answer:
      'A time slot disappears from the public service page when it is booked by a customer or blocked by an admin. Only AVAILABLE slots are shown publicly.',
  },
  {
    id: 'faq-pending-status',
    category: 'Booking Status',
    question: 'What does PENDING mean?',
    keywords: ['pending', 'status', 'waiting', 'booking'],
    answer:
      'PENDING means your booking was created successfully and is waiting for an admin to confirm or cancel it.',
  },
  {
    id: 'faq-confirmed-status',
    category: 'Booking Status',
    question: 'What does CONFIRMED mean?',
    keywords: ['confirmed', 'status', 'approved', 'accepted'],
    answer:
      'CONFIRMED means an admin has reviewed and approved the booking. You should treat that appointment as scheduled.',
  },
  {
    id: 'faq-cancelled-status',
    category: 'Booking Status',
    question: 'What does CANCELLED mean?',
    keywords: ['cancelled', 'canceled', 'status', 'cancel'],
    answer:
      'CANCELLED means the booking is no longer active. The booking remains visible in history, and its time slot can become available again.',
  },
  {
    id: 'faq-login-required',
    category: 'Accounts',
    question: 'Can customers book without logging in?',
    keywords: ['login', 'log in', 'account', 'without', 'customer', 'book'],
    answer:
      'Customers can browse services and available times without logging in, but they must log in or register before creating a booking.',
  },
  {
    id: 'faq-admin-actions',
    category: 'Admin',
    question: 'What can admins do?',
    keywords: [
      'admin',
      'admins',
      'administrator',
      'manage',
      'bookings',
      'services',
      'time slots',
      'confirm',
      'cancel',
      'block',
      'unblock',
    ],
    answer:
      'Admins can manage services, create or block time slots, unblock blocked slots, view all bookings, confirm bookings, and cancel bookings.',
  },
  {
    id: 'faq-no-slots',
    category: 'Availability',
    question: 'What should I do if no time slots are available?',
    keywords: ['no slots', 'none', 'available', 'time slots', 'availability'],
    answer:
      'If no time slots are available, check another service or come back later. The business may need to add more availability.',
  },
  {
    id: 'faq-pricing-duration',
    category: 'Services',
    question: 'How do pricing and duration work?',
    keywords: ['price', 'pricing', 'cost', 'duration', 'minutes', 'service'],
    answer:
      'Each service has its own duration and optional price. The service card shows how long the appointment lasts and the price if one has been set.',
  },
];
