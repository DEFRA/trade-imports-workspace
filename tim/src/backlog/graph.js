const WHITE = 0
const GREY = 1
const BLACK = 2

/**
 * The first cycle in a directed graph, as the path that closes it.
 *
 * An iterative depth-first search with white/grey/black colouring: white
 * nodes are unvisited, grey nodes are on the current path, black nodes are
 * fully explored. Reaching a grey node again closes a cycle. Iterative, not
 * recursive — a backlog is authored by agents, and the graph's depth is not
 * bounded by anything this tool controls, so an exceeded call stack would
 * not be a refusal a person could act on.
 *
 * @param {Map<string, string[]>} edges - Every node's outgoing ids. A
 *   target that is not itself a key in `edges` is ignored.
 * @returns {string[]|null} The cycle's ids in path order, the first id
 *   repeated last — or `null` when the graph is acyclic
 */
export const findCycle = (edges) => {
  const color = new Map()
  for (const node of edges.keys()) color.set(node, WHITE)

  for (const start of edges.keys()) {
    if (color.get(start) !== WHITE) continue

    const path = [start]
    const stack = [{ node: start, targets: edges.get(start) ?? [], index: 0 }]
    color.set(start, GREY)

    while (stack.length) {
      const frame = stack[stack.length - 1]
      if (frame.index >= frame.targets.length) {
        color.set(frame.node, BLACK)
        stack.pop()
        path.pop()
        continue
      }
      const target = frame.targets[frame.index]
      frame.index += 1
      if (!edges.has(target)) continue

      const targetColor = color.get(target)
      if (targetColor === GREY) {
        const cycleStart = path.indexOf(target)
        return [...path.slice(cycleStart), target]
      }
      if (targetColor === BLACK) continue

      color.set(target, GREY)
      path.push(target)
      stack.push({ node: target, targets: edges.get(target) ?? [], index: 0 })
    }
  }

  return null
}
