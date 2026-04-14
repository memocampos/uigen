import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { getLabel, ToolInvocationBadge } from "../ToolInvocationBadge";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

// --- getLabel unit tests ---

test("getLabel: str_replace_editor create", () => {
  expect(getLabel("str_replace_editor", { command: "create", path: "/App.jsx" })).toBe("Creating App.jsx");
});

test("getLabel: str_replace_editor str_replace", () => {
  expect(getLabel("str_replace_editor", { command: "str_replace", path: "/App.jsx" })).toBe("Editing App.jsx");
});

test("getLabel: str_replace_editor insert", () => {
  expect(getLabel("str_replace_editor", { command: "insert", path: "/App.jsx" })).toBe("Editing App.jsx");
});

test("getLabel: str_replace_editor view", () => {
  expect(getLabel("str_replace_editor", { command: "view", path: "/App.jsx" })).toBe("Reading App.jsx");
});

test("getLabel: file_manager rename", () => {
  expect(getLabel("file_manager", { command: "rename", path: "/old.jsx" })).toBe("Renaming old.jsx");
});

test("getLabel: file_manager delete", () => {
  expect(getLabel("file_manager", { command: "delete", path: "/old.jsx" })).toBe("Deleting old.jsx");
});

test("getLabel: unknown tool returns tool name", () => {
  expect(getLabel("some_other_tool", { command: "run", path: "/foo.js" })).toBe("some_other_tool");
});

test("getLabel: extracts filename from nested path", () => {
  expect(getLabel("str_replace_editor", { command: "create", path: "/src/components/Card.tsx" })).toBe("Creating Card.tsx");
});

// --- ToolInvocationBadge render tests ---

test("ToolInvocationBadge shows spinner and label when in progress", () => {
  const tool: ToolInvocation = {
    state: "call",
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "/App.jsx" },
  };

  const { container } = render(<ToolInvocationBadge tool={tool} />);

  expect(screen.getByText("Creating App.jsx")).toBeDefined();
  // Green dot should not be present
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
  // Spinner should be present
  expect(container.querySelector(".animate-spin")).toBeDefined();
});

test("ToolInvocationBadge shows green dot and label when completed", () => {
  const tool: ToolInvocation = {
    state: "result",
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "str_replace", path: "/App.jsx" },
    result: { success: true },
  };

  const { container } = render(<ToolInvocationBadge tool={tool} />);

  expect(screen.getByText("Editing App.jsx")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
});
