import React, { useState, useEffect, Suspense } from 'react';

// ** Router Import
import Router from './router/Router';

// ** Routes & Default Routes
import { getRoutes } from './router/routes';

// ** Hooks Imports
import { useLayout } from '@hooks/useLayout';

// ** Subscription Guard
import SubscriptionGuard from '@components/subscription/SubscriptionGuard';

const App = () => {
  // **States
  const [allRoutes, setAllRoutes] = useState([]);

  // ** Hooks
  const { layout } = useLayout();

  useEffect(() => {
    setAllRoutes(getRoutes(layout));

    if (process.env.NODE_ENV === "production") {
      console.log = () => {};
      console.warn = () => {};
      console.error = () => {};
    }
  }, [layout])

  return (
    <Suspense fallback={null}>
      <SubscriptionGuard>
        <Router allRoutes={allRoutes} />
      </SubscriptionGuard>
    </Suspense>
  )
}

export default App
