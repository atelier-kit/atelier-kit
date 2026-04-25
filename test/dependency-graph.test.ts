import { describe, expect, test } from "vitest";
import { DependencyGraph } from "../src/domain/dependency-graph.js";

describe("DependencyGraph", () => {
  test("readyNodes returns nodes with all deps done", () => {
    const graph = DependencyGraph.fromEntries([
      { id: "a", depends_on: [] },
      { id: "b", depends_on: ["a"] },
      { id: "c", depends_on: ["a", "b"] },
    ]);

    expect(graph.readyNodes(new Set())).toEqual(["a"]);
    expect(graph.readyNodes(new Set(["a"]))).toEqual(["b"]);
    expect(graph.readyNodes(new Set(["a", "b"]))).toEqual(["c"]);
    expect(graph.readyNodes(new Set(["a", "b", "c"]))).toEqual([]);
  });

  test("readyNodes handles independent parallel nodes", () => {
    const graph = DependencyGraph.fromEntries([
      { id: "a", depends_on: [] },
      { id: "b", depends_on: [] },
      { id: "c", depends_on: ["a", "b"] },
    ]);

    const ready = graph.readyNodes(new Set());
    expect(ready).toContain("a");
    expect(ready).toContain("b");
    expect(ready).not.toContain("c");
  });

  test("hasCycle detects direct cycle", () => {
    const graph = DependencyGraph.fromEntries([
      { id: "a", depends_on: ["b"] },
      { id: "b", depends_on: ["a"] },
    ]);
    expect(graph.hasCycle()).toBe(true);
  });

  test("hasCycle detects transitive cycle", () => {
    const graph = DependencyGraph.fromEntries([
      { id: "a", depends_on: ["c"] },
      { id: "b", depends_on: ["a"] },
      { id: "c", depends_on: ["b"] },
    ]);
    expect(graph.hasCycle()).toBe(true);
  });

  test("hasCycle returns false for acyclic graph", () => {
    const graph = DependencyGraph.fromEntries([
      { id: "a", depends_on: [] },
      { id: "b", depends_on: ["a"] },
      { id: "c", depends_on: ["a", "b"] },
    ]);
    expect(graph.hasCycle()).toBe(false);
  });

  test("topologicalOrder respects dependencies", () => {
    const graph = DependencyGraph.fromEntries([
      { id: "a", depends_on: [] },
      { id: "b", depends_on: ["a"] },
      { id: "c", depends_on: ["b"] },
    ]);
    const order = graph.topologicalOrder();
    expect(order.indexOf("a")).toBeLessThan(order.indexOf("b"));
    expect(order.indexOf("b")).toBeLessThan(order.indexOf("c"));
  });

  test("empty graph has no cycle and empty order", () => {
    const graph = new DependencyGraph();
    expect(graph.hasCycle()).toBe(false);
    expect(graph.topologicalOrder()).toEqual([]);
    expect(graph.readyNodes(new Set())).toEqual([]);
  });
});
