import type { Agent } from '../types';
import { PixelCharacter } from './PixelCharacter';

interface Props {
  agents: Agent[];
  onSelect: (agent: Agent) => void;
  selectedId?: string;
}

interface TreeNode {
  agent: Agent;
  children: TreeNode[];
}

function buildTree(agents: Agent[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  agents.forEach(a => map.set(a.id, { agent: a, children: [] }));

  const roots: TreeNode[] = [];
  agents.forEach(a => {
    const node = map.get(a.id)!;
    if (a.parentId && map.has(a.parentId)) {
      map.get(a.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

function getFrameClass(level: number): string {
  if (level >= 6) return 'ring-2 ring-purple-400 animate-pulse shadow-[0_0_20px_rgba(168,85,247,0.6)]';
  if (level >= 5) return 'ring-2 ring-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]';
  if (level >= 4) return 'ring-2 ring-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.3)]';
  if (level >= 3) return 'ring-2 ring-yellow-400 shadow-[0_0_8px_rgba(251,191,36,0.2)]';
  return 'ring-1 ring-gray-500';
}

function NodeComponent({ node, onSelect, selectedId, depth = 0 }: {
  node: TreeNode; onSelect: (a: Agent) => void; selectedId?: string; depth?: number;
}) {
  const a = node.agent;
  const isSelected = a.id === selectedId;

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={() => onSelect(a)}
        className={`
          relative flex flex-col items-center p-3 rounded-xl cursor-pointer
          transition-all duration-300 hover:scale-105
          ${isSelected ? 'bg-indigo-500/20 scale-105' : 'bg-white/5 hover:bg-white/10'}
          ${getFrameClass(a.level)}
        `}
      >
        <PixelCharacter visual={a.visual} size="sm" active={a.active} />
        <span className="text-xs font-bold whitespace-nowrap mt-1">{a.name}</span>
        <span className="text-[10px] opacity-60 whitespace-nowrap">{a.title}</span>
        <span className="text-[10px] text-indigo-400">Lv.{a.level}</span>
      </button>

      {node.children.length > 0 && (
        <>
          <div className="w-px h-6 bg-current opacity-20" />
          <div className="flex gap-4 relative">
            {node.children.length > 1 && (
              <div className="absolute top-0 left-[50%] -translate-x-[50%] h-px bg-current opacity-20"
                style={{ width: `calc(100% - 60px)` }} />
            )}
            {node.children.map(child => (
              <div key={child.agent.id} className="flex flex-col items-center">
                {node.children.length > 1 && (
                  <div className="w-px h-4 bg-current opacity-20" />
                )}
                <NodeComponent node={child} onSelect={onSelect} selectedId={selectedId} depth={depth + 1} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function OrgTree({ agents, onSelect, selectedId }: Props) {
  const roots = buildTree(agents);
  return (
    <div className="flex justify-center overflow-x-auto p-4">
      <div className="flex flex-col items-center gap-2">
        {roots.map(root => (
          <NodeComponent key={root.agent.id} node={root} onSelect={onSelect} selectedId={selectedId} />
        ))}
      </div>
    </div>
  );
}
