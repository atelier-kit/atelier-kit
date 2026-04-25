export class DependencyGraph {
  private nodes = new Map<string, Set<string>>();

  addNode(id: string, deps: string[]): void {
    this.nodes.set(id, new Set(deps));
  }

  hasCycle(): boolean {
    const visited = new Set<string>();
    const inStack = new Set<string>();

    const dfs = (id: string): boolean => {
      visited.add(id);
      inStack.add(id);
      for (const dep of this.nodes.get(id) ?? []) {
        if (!visited.has(dep)) {
          if (dfs(dep)) return true;
        } else if (inStack.has(dep)) {
          return true;
        }
      }
      inStack.delete(id);
      return false;
    };

    for (const id of this.nodes.keys()) {
      if (!visited.has(id) && dfs(id)) return true;
    }
    return false;
  }

  topologicalOrder(): string[] {
    const visited = new Set<string>();
    const order: string[] = [];

    const dfs = (id: string): void => {
      visited.add(id);
      for (const dep of this.nodes.get(id) ?? []) {
        if (!visited.has(dep) && this.nodes.has(dep)) dfs(dep);
      }
      order.push(id);
    };

    for (const id of this.nodes.keys()) {
      if (!visited.has(id)) dfs(id);
    }
    return order;
  }

  readyNodes(doneIds: Set<string>): string[] {
    const ready: string[] = [];
    for (const [id, deps] of this.nodes) {
      if (doneIds.has(id)) continue;
      if ([...deps].every((dep) => doneIds.has(dep))) {
        ready.push(id);
      }
    }
    return ready;
  }

  static fromEntries(
    entries: { id: string; depends_on: string[] }[],
  ): DependencyGraph {
    const graph = new DependencyGraph();
    for (const entry of entries) {
      graph.addNode(entry.id, entry.depends_on);
    }
    return graph;
  }
}
