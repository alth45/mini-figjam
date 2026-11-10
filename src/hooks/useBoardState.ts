// =========================================================================
// src/hooks/useBoardState.ts
// Reducer state board dengan dukungan multi-select.
// =========================================================================

"use client";

import { useCallback, useReducer } from "react";
import type {
  BoardElement,
  BoardElementPatch,
  SavedBoard,
  SelectionMode,
} from "@/lib/types";
import { DEFAULT_TITLE, DEFAULTS, HISTORY } from "@/lib/constants";
import { generateId } from "@/lib/storage";

// -------------------------------------------------------------------------
// STATE & ACTION
// -------------------------------------------------------------------------

type State = {
  elements: BoardElement[];
  title: string;
  selectedIds: string[];
  editingId: string | null;
  history: string[];
  histIndex: number;
  dirty: boolean;
};

type Action =
  | { type: "SELECT"; id: string | null; mode: SelectionMode }
  | { type: "SELECT_MANY"; ids: string[] }
  | { type: "SELECT_ALL" }
  | { type: "DESELECT_ALL" }
  | { type: "ADD"; element: BoardElement }
  | { type: "UPDATE"; id: string; patch: BoardElementPatch }
  | {
      type: "UPDATE_MANY";
      updates: { id: string; patch: BoardElementPatch }[];
    }
  | { type: "DELETE"; id: string }
  | { type: "DELETE_SELECTED" }
  | { type: "DUPLICATE_SELECTED" }
  | { type: "BRING_FRONT" }
  | { type: "SEND_BACK" }
  | { type: "CLEAR" }
  | { type: "START_EDIT"; id: string }
  | { type: "COMMIT_EDIT"; id: string; text: string }
  | { type: "CANCEL_EDIT" }
  | { type: "SNAPSHOT" }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "SET_TITLE"; title: string }
  | { type: "LOAD"; board: SavedBoard }
  | { type: "MARK_SAVED" }
  | { type: "MARK_DIRTY" };

// -------------------------------------------------------------------------
// INIT
// -------------------------------------------------------------------------

function init(): State {
  return {
    elements: [],
    title: DEFAULT_TITLE,
    selectedIds: [],
    editingId: null,
    history: ["[]"],
    histIndex: 0,
    dirty: false,
  };
}

// -------------------------------------------------------------------------
// HELPERS
// -------------------------------------------------------------------------

function withoutHistory(state: State, elements: BoardElement[]): State {
  return { ...state, elements, dirty: true };
}

function withHistory(state: State, elements: BoardElement[]): State {
  const snap = JSON.stringify(elements);
  if (state.history[state.histIndex] === snap) {
    return { ...state, elements, dirty: true };
  }
  const hist = [...state.history.slice(0, state.histIndex + 1), snap];
  while (hist.length > HISTORY.limit) hist.shift();
  return {
    ...state,
    elements,
    history: hist,
    histIndex: hist.length - 1,
    dirty: true,
  };
}

function duplicateElement(el: BoardElement): BoardElement {
  const d = DEFAULTS.duplicateOffset;
  switch (el.type) {
    case "arrow":
      return {
        ...el,
        id: generateId(),
        x1: el.x1 + d,
        y1: el.y1 + d,
        x2: el.x2 + d,
        y2: el.y2 + d,
      };
    case "draw":
      return {
        ...el,
        id: generateId(),
        points: el.points.map((p) => ({ x: p.x + d, y: p.y + d })),
      };
    case "sticky":
    case "text":
    case "rect":
    case "ellipse":
    case "mindnode":
      return { ...el, id: generateId(), x: el.x + d, y: el.y + d };
    default: {
      const _exhaustive: never = el;
      return _exhaustive;
    }
  }
}

/**
 * Kumpulkan semua descendant mindnode (BFS) dari set root.
 * Digabung ke set yang sama (mutate).
 */
function expandMindnodeCascade(
  elements: BoardElement[],
  ids: Set<string>,
): void {
  let changed = true;
  while (changed) {
    changed = false;
    for (const el of elements) {
      if (
        el.type === "mindnode" &&
        el.parentId &&
        ids.has(el.parentId) &&
        !ids.has(el.id)
      ) {
        ids.add(el.id);
        changed = true;
      }
    }
  }
}

// -------------------------------------------------------------------------
// REDUCER
// -------------------------------------------------------------------------

function reducer(state: State, action: Action): State {
  switch (action.type) {
    // ----- Selection -----
    case "SELECT": {
      if (action.id === null) return { ...state, selectedIds: [] };
      if (action.mode === "replace")
        return { ...state, selectedIds: [action.id] };
      if (action.mode === "toggle") {
        const exists = state.selectedIds.includes(action.id);
        return {
          ...state,
          selectedIds: exists
            ? state.selectedIds.filter((id) => id !== action.id)
            : [...state.selectedIds, action.id],
        };
      }
      // add
      if (state.selectedIds.includes(action.id)) return state;
      return { ...state, selectedIds: [...state.selectedIds, action.id] };
    }

    case "SELECT_MANY": {
      const unique = Array.from(new Set(action.ids));
      return { ...state, selectedIds: unique };
    }

    case "SELECT_ALL":
      return { ...state, selectedIds: state.elements.map((e) => e.id) };

    case "DESELECT_ALL":
      return { ...state, selectedIds: [] };

    // ----- CRUD -----
    case "ADD":
      return withoutHistory(state, [...state.elements, action.element]);

    case "UPDATE": {
      const elements = state.elements.map((el) =>
        el.id === action.id ? ({ ...el, ...action.patch } as BoardElement) : el,
      );
      return withoutHistory(state, elements);
    }

    case "UPDATE_MANY": {
      const map = new Map(action.updates.map((u) => [u.id, u.patch]));
      const elements = state.elements.map((el) => {
        const patch = map.get(el.id);
        return patch ? ({ ...el, ...patch } as BoardElement) : el;
      });
      return withoutHistory(state, elements);
    }

    case "DELETE": {
      const toDelete = new Set<string>([action.id]);
      expandMindnodeCascade(state.elements, toDelete);
      const elements = state.elements.filter((el) => !toDelete.has(el.id));
      return withHistory(
        {
          ...state,
          selectedIds: state.selectedIds.filter((id) => !toDelete.has(id)),
          editingId:
            state.editingId && toDelete.has(state.editingId)
              ? null
              : state.editingId,
        },
        elements,
      );
    }

    case "DELETE_SELECTED": {
      if (state.selectedIds.length === 0) return state;
      const toDelete = new Set(state.selectedIds);
      expandMindnodeCascade(state.elements, toDelete);
      const elements = state.elements.filter((el) => !toDelete.has(el.id));
      return withHistory(
        {
          ...state,
          selectedIds: state.selectedIds.filter((id) => !toDelete.has(id)),
          editingId:
            state.editingId && toDelete.has(state.editingId)
              ? null
              : state.editingId,
        },
        elements,
      );
    }

    case "DUPLICATE_SELECTED": {
      if (state.selectedIds.length === 0) return state;
      const selected = state.elements.filter((e) =>
        state.selectedIds.includes(e.id),
      );
      const copies = selected.map(duplicateElement);
      return withHistory({ ...state, selectedIds: copies.map((c) => c.id) }, [
        ...state.elements,
        ...copies,
      ]);
    }

    case "BRING_FRONT": {
      if (state.selectedIds.length === 0) return state;
      const selected = state.elements.filter((e) =>
        state.selectedIds.includes(e.id),
      );
      const rest = state.elements.filter(
        (e) => !state.selectedIds.includes(e.id),
      );
      return withHistory(state, [...rest, ...selected]);
    }

    case "SEND_BACK": {
      if (state.selectedIds.length === 0) return state;
      const selected = state.elements.filter((e) =>
        state.selectedIds.includes(e.id),
      );
      const rest = state.elements.filter(
        (e) => !state.selectedIds.includes(e.id),
      );
      return withHistory(state, [...selected, ...rest]);
    }

    case "CLEAR":
      return withHistory({ ...state, selectedIds: [], editingId: null }, []);

    // ----- Text editing -----
    case "START_EDIT":
      return { ...state, editingId: action.id, selectedIds: [action.id] };

    case "COMMIT_EDIT": {
      const el = state.elements.find((e) => e.id === action.id);
      if (!el) return { ...state, editingId: null };

      const text = action.text.replace(/\n$/, "");
      let elements: BoardElement[];
      let selectedIds = state.selectedIds;

      const isEditable = el.type === "text" || el.type === "mindnode";
      const hasChildren =
        el.type === "mindnode" &&
        state.elements.some(
          (e) => e.type === "mindnode" && e.parentId === el.id,
        );

      if (isEditable && text.trim() === "" && !hasChildren) {
        elements = state.elements.filter((e) => e.id !== action.id);
        selectedIds = selectedIds.filter((id) => id !== action.id);
      } else {
        elements = state.elements.map((e) =>
          e.id === action.id ? ({ ...e, text } as BoardElement) : e,
        );
      }

      return withHistory({ ...state, editingId: null, selectedIds }, elements);
    }

    case "CANCEL_EDIT":
      return { ...state, editingId: null };

    // ----- History -----
    case "SNAPSHOT":
      return withHistory(state, state.elements);

    case "UNDO": {
      if (state.histIndex <= 0) return state;
      const idx = state.histIndex - 1;
      const elements = JSON.parse(state.history[idx]) as BoardElement[];
      return {
        ...state,
        elements,
        histIndex: idx,
        selectedIds: [],
        editingId: null,
        dirty: true,
      };
    }

    case "REDO": {
      if (state.histIndex >= state.history.length - 1) return state;
      const idx = state.histIndex + 1;
      const elements = JSON.parse(state.history[idx]) as BoardElement[];
      return {
        ...state,
        elements,
        histIndex: idx,
        selectedIds: [],
        editingId: null,
        dirty: true,
      };
    }

    case "SET_TITLE":
      return { ...state, title: action.title, dirty: true };

    case "LOAD": {
      const historyStr = JSON.stringify(action.board.elements);
      return {
        elements: action.board.elements,
        title: action.board.title || DEFAULT_TITLE,
        selectedIds: [],
        editingId: null,
        history: [historyStr],
        histIndex: 0,
        dirty: false,
      };
    }

    case "MARK_SAVED":
      return { ...state, dirty: false };

    case "MARK_DIRTY":
      return { ...state, dirty: true };
  }
}

// -------------------------------------------------------------------------
// HOOK
// -------------------------------------------------------------------------

export interface UseBoardStateReturn {
  elements: BoardElement[];
  title: string;
  selectedIds: string[];
  /** ID terakhir dipilih — untuk backward compat & operasi "primary". */
  selectedId: string | null;
  selectedElements: BoardElement[];
  selectedElement: BoardElement | null;
  editingId: string | null;
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;

  selectElement: (id: string | null, mode?: SelectionMode) => void;
  selectMany: (ids: string[]) => void;
  selectAll: () => void;
  deselect: () => void;

  addElement: (el: BoardElement) => void;
  updateElement: (id: string, patch: BoardElementPatch) => void;
  updateMany: (updates: { id: string; patch: BoardElementPatch }[]) => void;
  deleteElement: (id: string) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  bringFront: () => void;
  sendBack: () => void;
  clearAll: () => void;

  startEdit: (id: string) => void;
  commitEdit: (id: string, text: string) => void;
  cancelEdit: () => void;

  snapshot: () => void;
  undo: () => void;
  redo: () => void;

  setTitle: (title: string) => void;
  loadBoard: (board: SavedBoard) => void;
  markSaved: () => void;
  markDirty: () => void;

  getElement: (id: string) => BoardElement | undefined;
}

export function useBoardState(): UseBoardStateReturn {
  const [state, dispatch] = useReducer(reducer, undefined, init);

  const selectedElements = state.elements.filter((e) =>
    state.selectedIds.includes(e.id),
  );
  const selectedId =
    state.selectedIds.length > 0
      ? state.selectedIds[state.selectedIds.length - 1]
      : null;
  const selectedElement =
    selectedElements.find((e) => e.id === selectedId) ?? null;

  return {
    elements: state.elements,
    title: state.title,
    selectedIds: state.selectedIds,
    selectedId,
    selectedElements,
    selectedElement,
    editingId: state.editingId,
    dirty: state.dirty,
    canUndo: state.histIndex > 0,
    canRedo: state.histIndex < state.history.length - 1,

    selectElement: useCallback(
      (id, mode) => dispatch({ type: "SELECT", id, mode: mode ?? "replace" }),
      [],
    ),
    selectMany: useCallback(
      (ids) => dispatch({ type: "SELECT_MANY", ids }),
      [],
    ),
    selectAll: useCallback(() => dispatch({ type: "SELECT_ALL" }), []),
    deselect: useCallback(() => dispatch({ type: "DESELECT_ALL" }), []),

    addElement: useCallback(
      (element) => dispatch({ type: "ADD", element }),
      [],
    ),
    updateElement: useCallback(
      (id, patch) => dispatch({ type: "UPDATE", id, patch }),
      [],
    ),
    updateMany: useCallback(
      (updates) => dispatch({ type: "UPDATE_MANY", updates }),
      [],
    ),
    deleteElement: useCallback((id) => dispatch({ type: "DELETE", id }), []),
    deleteSelected: useCallback(
      () => dispatch({ type: "DELETE_SELECTED" }),
      [],
    ),
    duplicateSelected: useCallback(
      () => dispatch({ type: "DUPLICATE_SELECTED" }),
      [],
    ),
    bringFront: useCallback(() => dispatch({ type: "BRING_FRONT" }), []),
    sendBack: useCallback(() => dispatch({ type: "SEND_BACK" }), []),
    clearAll: useCallback(() => dispatch({ type: "CLEAR" }), []),

    startEdit: useCallback((id) => dispatch({ type: "START_EDIT", id }), []),
    commitEdit: useCallback(
      (id, text) => dispatch({ type: "COMMIT_EDIT", id, text }),
      [],
    ),
    cancelEdit: useCallback(() => dispatch({ type: "CANCEL_EDIT" }), []),

    snapshot: useCallback(() => dispatch({ type: "SNAPSHOT" }), []),
    undo: useCallback(() => dispatch({ type: "UNDO" }), []),
    redo: useCallback(() => dispatch({ type: "REDO" }), []),

    setTitle: useCallback(
      (title) => dispatch({ type: "SET_TITLE", title }),
      [],
    ),
    loadBoard: useCallback((board) => dispatch({ type: "LOAD", board }), []),
    markSaved: useCallback(() => dispatch({ type: "MARK_SAVED" }), []),
    markDirty: useCallback(() => dispatch({ type: "MARK_DIRTY" }), []),

    getElement: useCallback(
      (id: string) => state.elements.find((e) => e.id === id),
      [state.elements],
    ),
  };
}
