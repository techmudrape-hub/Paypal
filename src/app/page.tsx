// src/app/page.tsx
// Root page that redirects to checkout

import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/checkout');
}