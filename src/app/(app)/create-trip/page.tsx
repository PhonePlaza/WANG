// src/app/(app)/create-trip/page.tsx  (Server Component)
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import CreateTripPage from './CreateTripClient';

export default function Page() {
  return <CreateTripPage />;
}
