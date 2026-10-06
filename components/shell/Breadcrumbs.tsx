"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";

export type Crumb = { label: string; href?: string };

type Store = { get: () => Crumb[] | null; set: (c: Crumb[] | null) => void; subscribe: (fn: () => void) => () => void };

function createStore(): Store {
  let value: Crumb[] | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (c) => {
      value = c;
      listeners.forEach((l) => l());
    },
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

const CrumbContext = createContext<Store | null>(null);

/** Lets pages inside the panel shell set the top-bar breadcrumb trail. */
export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createStore);
  return <CrumbContext.Provider value={store}>{children}</CrumbContext.Provider>;
}

export function useBreadcrumbs(): Crumb[] | null {
  const store = useContext(CrumbContext);
  return useSyncExternalStore(
    store?.subscribe ?? (() => () => {}),
    store?.get ?? (() => null),
    () => null,
  );
}

/** Render in a page (server or client) to set its breadcrumb, e.g. Dashboard / Brands / Sony. */
export function SetBreadcrumbs({ items }: { items: Crumb[] }) {
  const store = useContext(CrumbContext);
  const key = JSON.stringify(items);
  useEffect(() => {
    store?.set(JSON.parse(key) as Crumb[]);
    return () => store?.set(null);
  }, [store, key]);
  return null;
}
