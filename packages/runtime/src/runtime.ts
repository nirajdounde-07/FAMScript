import type { FamRuntime } from './types.js'

export function createFamRuntime(): FamRuntime {
  return {
    highlightPath(_fromId, _toId) {},
    expandBranch(_nodeId) {},
    collapseBranch(_nodeId) {},
    search(_query) { return [] },
    zoomTo(_nodeId) {},
  }
}
