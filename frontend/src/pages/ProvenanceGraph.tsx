import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import type { Node, Edge, NodeProps } from 'reactflow';
import 'reactflow/dist/style.css';
import { GitBranch, RefreshCw, Info } from 'lucide-react';
import { getProvenanceGraph } from '../api/client';
import { useAppStore } from '../store/appStore';
import type { ProvenanceGraph } from '../types';
import { ProvenanceNode, GraphStats, GraphLegend } from '../components/Graph';

/* ---- ReactFlow node wrapper ---- */
function ProvenanceNodeWrapper(props: NodeProps) {
  return <ProvenanceNode {...props} />;
}
const nodeTypes = { provenance: ProvenanceNodeWrapper };

/* ---- BFS layout helper ---- */
function graphToFlow(graph: ProvenanceGraph): { nodes: Node[]; edges: Edge[] } {
  const levelMap: Record<string, number> = {};
  const queue = [graph.root_node_id];
  levelMap[graph.root_node_id] = 0;
  const adj: Record<string, string[]> = {};
  graph.edges.forEach(e => {
    if (!adj[e.source]) adj[e.source] = [];
    adj[e.source].push(e.target);
  });
  while (queue.length) {
    const cur = queue.shift()!;
    for (const child of (adj[cur] ?? [])) {
      if (!(child in levelMap)) { levelMap[child] = levelMap[cur] + 1; queue.push(child); }
    }
  }
  const levelCounts: Record<number, number> = {};
  const levelIdx: Record<string, number> = {};
  graph.nodes.forEach(n => {
    const lv = levelMap[n.id] ?? 0;
    levelIdx[n.id] = levelCounts[lv] ?? 0;
    levelCounts[lv] = (levelCounts[lv] ?? 0) + 1;
  });
  const W = 210, H = 165;
  const nodes: Node[] = graph.nodes.map(n => {
    const lv = levelMap[n.id] ?? 0;
    const cnt = levelCounts[lv] ?? 1;
    const idx = levelIdx[n.id] ?? 0;
    return {
      id: n.id, type: 'provenance',
      position: { x: (idx - (cnt - 1) / 2) * W, y: lv * H },
      data: { label: n.filename, platform: n.platform, deepfake_score: n.deepfake_score,
              manipulation_type: n.manipulation_type, is_root: n.is_root, timestamp: n.timestamp },
    };
  });
  const edges: Edge[] = graph.edges.map((e, i) => {
    return {
      id: `e${i}`, source: e.source, target: e.target,
      label: e.relationship.replace(/_/g, ' '),
      style: { stroke: 'rgba(99,179,237,0.3)', strokeWidth: 1.5 },
      labelStyle: { fill: '#475569', fontSize: 10 },
      animated: e.relationship === 'derived_from',
    };
  });
  return { nodes, edges };
}

export default function ProvenanceGraphPage() {
  const [graph, setGraph] = useState<ProvenanceGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const { currentImageId, provenanceGraph, setProvenanceGraph } = useAppStore();

  const loadGraph = async () => {
    if (!currentImageId) { setError('Upload and analyze an image first.'); return; }
    setLoading(true); setError(null);
    try {
      const g = await getProvenanceGraph(currentImageId);
      setGraph(g); setProvenanceGraph(g);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to build provenance graph');
    } finally { setLoading(false); }
  };

  const displayGraph = graph ?? provenanceGraph;
  const { nodes: flowNodes, edges: flowEdges } = displayGraph
    ? graphToFlow(displayGraph)
    : { nodes: [], edges: [] };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <GitBranch size={28} className="text-purple-400" /> Provenance Graph
          </h1>
          <p className="text-slate-400 text-sm mt-1">Interactive image lineage & derivative chain visualization</p>
        </div>
        <button onClick={loadGraph} disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:scale-105 transition-all disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #a855f7, #06b6d4)' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Building…' : 'Build Graph'}
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm text-amber-400"
             style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          ⚠ {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        {/* Canvas */}
        <div className="xl:col-span-3 glass-card overflow-hidden" style={{ height: 560 }}>
          {displayGraph ? (
            <ReactFlow nodes={flowNodes} edges={flowEdges} nodeTypes={nodeTypes} fitView
              onNodeClick={(_, n) => setSelectedNode(n.data)}
              style={{ background: 'transparent' }}>
              <Background color="rgba(99,179,237,0.05)" gap={30} />
              <Controls style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(99,179,237,0.1)', borderRadius: 8 }} />
              <MiniMap nodeColor={n => n.data?.deepfake_score > 0.5 ? '#ef4444' : n.data?.is_root ? '#a855f7' : '#10b981'}
                style={{ background: 'rgba(8,12,20,0.9)', border: '1px solid rgba(99,179,237,0.1)' }} />
            </ReactFlow>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 text-center">
              <GitBranch size={56} className="mb-4 opacity-20" />
              <p className="text-sm">Click "Build Graph" after analyzing an image</p>
            </div>
          )}
        </div>

        {/* Sidebar stats */}
        <div className="space-y-4">
          {displayGraph && (
            <GraphStats
              totalVersions={displayGraph.total_versions}
              spreadDepth={displayGraph.spread_depth}
              integrityScore={displayGraph.integrity_score}
              chainBroken={displayGraph.chain_broken}
            />
          )}
          <GraphLegend />
          <AnimatePresence>
            {selectedNode && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="glass-card p-4">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-xs font-semibold text-slate-300 flex items-center gap-1"><Info size={12}/> Inspector</p>
                  <button onClick={() => setSelectedNode(null)} className="text-slate-500 hover:text-white text-xs">✕</button>
                </div>
                {Object.entries(selectedNode).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs py-1 border-b border-white/5">
                    <span className="text-slate-500">{k}</span>
                    <span className="text-slate-200 mono truncate max-w-[100px]">{String(v)}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
