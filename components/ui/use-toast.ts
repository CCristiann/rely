"use client";

import * as React from "react";

const TOAST_LIMIT = 3;
const TOAST_REMOVE_DELAY = 4000;

type ToastVariant = "default" | "destructive" | "success";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

type ToastAction =
  | { type: "ADD_TOAST"; toast: Toast }
  | { type: "REMOVE_TOAST"; id: string };

interface ToastState {
  toasts: Toast[];
}

const reducer = (state: ToastState, action: ToastAction): ToastState => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };
    case "REMOVE_TOAST":
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.id),
      };
  }
};

const listeners: Array<(state: ToastState) => void> = [];
let memoryState: ToastState = { toasts: [] };

function dispatch(action: ToastAction) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((l) => l(memoryState));
}

let counter = 0;
function genId() {
  counter = (counter + 1) % Number.MAX_SAFE_INTEGER;
  return counter.toString();
}

function toast(props: Omit<Toast, "id">) {
  const id = genId();
  dispatch({ type: "ADD_TOAST", toast: { ...props, id } });

  setTimeout(() => {
    dispatch({ type: "REMOVE_TOAST", id });
  }, props.duration ?? TOAST_REMOVE_DELAY);

  return { id };
}

function useToast() {
  const [state, setState] = React.useState<ToastState>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  return {
    toasts: state.toasts,
    toast,
    dismiss: (id: string) => dispatch({ type: "REMOVE_TOAST", id }),
  };
}

export { useToast, toast };
