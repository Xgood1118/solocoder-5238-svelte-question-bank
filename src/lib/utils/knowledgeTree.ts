import type { KnowledgeNode } from '$lib/types';

export function getAllDescendantIds(node: KnowledgeNode): string[] {
	const ids: string[] = [node.id];
	for (const child of node.children) {
		ids.push(...getAllDescendantIds(child));
	}
	return ids;
}

export function findNode(root: KnowledgeNode, id: string): KnowledgeNode | null {
	if (root.id === id) return root;
	for (const child of root.children) {
		const found = findNode(child, id);
		if (found) return found;
	}
	return null;
}

export function findParentNode(root: KnowledgeNode, id: string): KnowledgeNode | null {
	for (const child of root.children) {
		if (child.id === id) return root;
		const found = findParentNode(child, id);
		if (found) return found;
	}
	return null;
}

export function isDescendant(root: KnowledgeNode, ancestorId: string, descendantId: string): boolean {
	const ancestor = findNode(root, ancestorId);
	if (!ancestor) return false;
	const descendants = getAllDescendantIds(ancestor);
	return descendants.includes(descendantId) && ancestorId !== descendantId;
}

export function moveNode(root: KnowledgeNode, sourceId: string, targetId: string | null, position?: number): KnowledgeNode {
	const newRoot = JSON.parse(JSON.stringify(root)) as KnowledgeNode;
	const source = findNode(newRoot, sourceId);
	if (!source) return newRoot;

	if (targetId && isDescendant(newRoot, sourceId, targetId)) {
		return newRoot;
	}

	const sourceParent = findParentNode(newRoot, sourceId);
	if (sourceParent) {
		const idx = sourceParent.children.findIndex(c => c.id === sourceId);
		if (idx >= 0) sourceParent.children.splice(idx, 1);
	}

	source.parentId = targetId;

	if (targetId === null) {
		newRoot.children.push(source);
	} else {
		const target = findNode(newRoot, targetId);
		if (target) {
			if (typeof position === 'number') {
				target.children.splice(position, 0, source);
			} else {
				target.children.push(source);
			}
		}
	}

	return newRoot;
}

export function addNode(root: KnowledgeNode, parentId: string | null, name: string, id: string): KnowledgeNode {
	const newRoot = JSON.parse(JSON.stringify(root)) as KnowledgeNode;
	const newNode: KnowledgeNode = { id, name, children: [], parentId };

	if (parentId === null) {
		newRoot.children.push(newNode);
	} else {
		const parent = findNode(newRoot, parentId);
		if (parent) {
			parent.children.push(newNode);
		}
	}
	return newRoot;
}

export function deleteNode(root: KnowledgeNode, id: string): KnowledgeNode {
	const newRoot = JSON.parse(JSON.stringify(root)) as KnowledgeNode;
	const parent = findParentNode(newRoot, id);
	if (parent) {
		const idx = parent.children.findIndex(c => c.id === id);
		if (idx >= 0) parent.children.splice(idx, 1);
	}
	return newRoot;
}

export function renameNode(root: KnowledgeNode, id: string, name: string): KnowledgeNode {
	const newRoot = JSON.parse(JSON.stringify(root)) as KnowledgeNode;
	const node = findNode(newRoot, id);
	if (node) node.name = name;
	return newRoot;
}

export function flattenNodes(root: KnowledgeNode): KnowledgeNode[] {
	const nodes: KnowledgeNode[] = [root];
	for (const child of root.children) {
		nodes.push(...flattenNodes(child));
	}
	return nodes;
}

export function getNodeDepth(root: KnowledgeNode, id: string): number {
	let depth = 0;
	let current = findNode(root, id);
	while (current && current.parentId) {
		depth++;
		current = findNode(root, current.parentId);
	}
	return depth;
}
