<script lang="ts">
	import { onMount } from 'svelte';
	import type { KnowledgeNode } from '$lib/types';
	import {
		knowledgeRoot,
		questionCountByKp,
		addKnowledgeNode,
		moveKnowledgeNode,
		deleteKnowledgeNode,
		renameKnowledgeNode
	} from '$lib/stores';
	import { isDescendant, findNode, findParentNode } from '$lib/utils/knowledgeTree';

	let selectedId: string | null = null;
	let editingId: string | null = null;
	let editingName: string = '';
	let draggingId: string | null = null;
	let dragOverId: string | null = null;
	let dragPosition: 'before' | 'after' | 'inside' | null = null;
	let showAddModal: boolean = false;
	let addParentId: string | null = null;
	let newNodeName: string = '';
	let showDeleteConfirm: boolean = false;
	let nodeToDelete: KnowledgeNode | null = null;

	function getQuestionCount(id: string): number {
		return $questionCountByKp.get(id) || 0;
	}

	function handleSelect(node: KnowledgeNode) {
		selectedId = node.id;
	}

	function startRename(node: KnowledgeNode, e: Event) {
		e.stopPropagation();
		editingId = node.id;
		editingName = node.name;
	}

	function finishRename() {
		if (editingId && editingName.trim()) {
			renameKnowledgeNode(editingId, editingName.trim());
		}
		editingId = null;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') finishRename();
		else if (e.key === 'Escape') editingId = null;
	}

	function openAddModal(parentId: string | null) {
		addParentId = parentId;
		newNodeName = '';
		showAddModal = true;
	}

	function addNode() {
		if (!newNodeName.trim()) return;
		addKnowledgeNode(addParentId, newNodeName.trim());
		showAddModal = false;
		newNodeName = '';
	}

	function confirmDelete(node: KnowledgeNode) {
		nodeToDelete = node;
		showDeleteConfirm = true;
	}

	function doDelete() {
		if (nodeToDelete) {
			deleteKnowledgeNode(nodeToDelete.id);
			showDeleteConfirm = false;
			nodeToDelete = null;
			selectedId = null;
		}
	}

	function handleDragStart(node: KnowledgeNode, e: DragEvent) {
		if (node.id === 'root') {
			e.preventDefault();
			return;
		}
		draggingId = node.id;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', node.id);
		}
	}

	function handleDragEnd() {
		draggingId = null;
		dragOverId = null;
		dragPosition = null;
	}

	function handleDragOver(node: KnowledgeNode, e: DragEvent) {
		e.preventDefault();
		if (!draggingId || draggingId === node.id) return;

		if (isDescendant($knowledgeRoot, draggingId, node.id)) {
			return;
		}

		e.dataTransfer!.dropEffect = 'move';
		dragOverId = node.id;

		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const y = e.clientY - rect.top;
		const height = rect.height;

		if (y < height * 0.25) {
			dragPosition = 'before';
		} else if (y > height * 0.75) {
			dragPosition = 'after';
		} else {
			dragPosition = 'inside';
		}
	}

	function handleDragLeave() {
		dragOverId = null;
		dragPosition = null;
	}

	function handleDrop(node: KnowledgeNode, e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();

		if (!draggingId || !dragPosition) {
			draggingId = null;
			dragOverId = null;
			dragPosition = null;
			return;
		}

		if (isDescendant($knowledgeRoot, draggingId, node.id)) {
			draggingId = null;
			dragOverId = null;
			dragPosition = null;
			return;
		}

		if (dragPosition === 'inside') {
			moveKnowledgeNode(draggingId, node.id);
		} else {
			const parent = findParentNode($knowledgeRoot, node.id);
			const parentId = parent ? parent.id : null;

			const siblings = parent ? parent.children : $knowledgeRoot.children;
			const targetIndex = siblings.findIndex(s => s.id === node.id);
			const insertIndex = dragPosition === 'before' ? targetIndex : targetIndex + 1;

			let actualInsertIndex = insertIndex;

			const sourceParent = findParentNode($knowledgeRoot, draggingId);
			if (sourceParent && sourceParent.id === (parent?.id || 'root')) {
				const sourceIndex = siblings.findIndex(s => s.id === draggingId);
				if (sourceIndex < insertIndex) {
					actualInsertIndex--;
				}
			}

			moveKnowledgeNode(draggingId, parentId, actualInsertIndex);
		}

		draggingId = null;
		dragOverId = null;
		dragPosition = null;
	}

	function handleRootDrop(e: DragEvent) {
		e.preventDefault();
		if (!draggingId) return;

		const parent = findParentNode($knowledgeRoot, draggingId);
		if (!parent || parent.id === 'root') {
			draggingId = null;
			return;
		}

		moveKnowledgeNode(draggingId, null);
		draggingId = null;
		dragOverId = null;
		dragPosition = null;
	}
</script>

<div class="knowledge-page">
	<div class="page-header">
		<h1>知识点管理</h1>
		<div class="header-actions">
			<button class="btn btn-primary" on:click={() => openAddModal(null)}>
				<iconify-icon icon="mdi:plus"></iconify-icon>
				添加一级知识点
			</button>
		</div>
	</div>

	<div class="main-content">
		<div class="tree-container" on:dragover|preventDefault on:drop={handleRootDrop}>
			<div class="tree-scroll">
				<TreeNode
					node={$knowledgeRoot}
					{selectedId}
					{editingId}
					{editingName}
					{draggingId}
					{dragOverId}
					{dragPosition}
					{getQuestionCount}
					on:select={(e) => handleSelect(e.detail)}
					on:start-edit={(e) => startRename(e.detail.node, e.detail.event)}
					on:finish-edit={finishRename}
					on:keydown={handleKeydown}
					on:add-child={(e) => openAddModal(e.detail)}
					on:delete={(e) => confirmDelete(e.detail)}
					on:drag-start={(e) => handleDragStart(e.detail.node, e.detail.event)}
					on:drag-end={handleDragEnd}
					on:drag-over={(e) => handleDragOver(e.detail.node, e.detail.event)}
					on:drag-leave={handleDragLeave}
					on:drop={(e) => handleDrop(e.detail.node, e.detail.event)}
				/>
			</div>
		</div>

		<div class="detail-panel">
			{#if selectedId}
				{@const selectedNode = findNode($knowledgeRoot, selectedId)}
				{#if selectedNode}
					<div class="detail-card">
						<h3>{selectedNode.name}</h3>
						<div class="detail-stats">
							<div class="stat-item">
								<span class="stat-label">节点 ID</span>
								<span class="stat-value">{selectedNode.id}</span>
							</div>
							<div class="stat-item">
								<span class="stat-label">子节点数</span>
								<span class="stat-value">{selectedNode.children.length}</span>
							</div>
							<div class="stat-item">
								<span class="stat-label">关联题目数</span>
								<span class="stat-value highlight">{getQuestionCount(selectedNode.id)} 道</span>
							</div>
						</div>

						{#if selectedNode.children.length > 0}
							<div class="children-section">
								<h4>子知识点</h4>
								<div class="children-list">
									{#each selectedNode.children as child}
										<div class="child-item" on:click={() => selectedId = child.id}>
											<span>{child.name}</span>
											<span class="child-count">{getQuestionCount(child.id)} 题</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<div class="detail-actions">
							<button class="btn" on:click={() => startRename(selectedNode, new Event('click'))}>
								<iconify-icon icon="mdi:pencil"></iconify-icon>
								重命名
							</button>
							<button class="btn" on:click={() => openAddModal(selectedNode.id)}>
								<iconify-icon icon="mdi:folder-plus"></iconify-icon>
								添加子节点
							</button>
							{#if selectedNode.id !== 'root'}
								<button class="btn btn-danger" on:click={() => confirmDelete(selectedNode)}>
									<iconify-icon icon="mdi:delete"></iconify-icon>
									删除
								</button>
							{/if}
						</div>
					</div>
				{/if}
			{:else}
				<div class="empty-detail">
					<iconify-icon icon="mdi:cursor-pointer" style="font-size: 40px; color: var(--color-gray-300);"></iconify-icon>
					<p>选择一个知识点查看详情</p>
				</div>
			{/if}
		</div>
	</div>

	{#if showAddModal}
		<div class="modal-overlay" on:click={() => showAddModal = false}>
			<div class="modal" style="max-width: 420px;" on:click|stopPropagation>
				<div class="modal-header">
					<span>添加知识点</span>
				</div>
				<div class="modal-body">
					<div class="form-group">
						<label class="form-label">知识点名称</label>
						<input
							class="form-input"
							bind:value={newNodeName}
							placeholder="请输入知识点名称"
							on:keydown={(e) => e.key === 'Enter' && addNode()}
							autofocus
						/>
					</div>
					<p style="font-size: 12px; color: var(--color-gray-500);">
						父节点：{addParentId ? findNode($knowledgeRoot, addParentId)?.name : '根目录'}
					</p>
				</div>
				<div class="modal-footer">
					<button class="btn" on:click={() => showAddModal = false}>取消</button>
					<button class="btn btn-primary" on:click={addNode} disabled={!newNodeName.trim()}>
						添加
					</button>
				</div>
			</div>
		</div>
	{/if}

	{#if showDeleteConfirm && nodeToDelete}
		<div class="modal-overlay" on:click={() => showDeleteConfirm = false}>
			<div class="modal" style="max-width: 420px;" on:click|stopPropagation>
				<div class="modal-header">
					<span>确认删除</span>
				</div>
				<div class="modal-body">
					<p>确定要删除知识点「{nodeToDelete.name}」吗？</p>
					{#if nodeToDelete.children.length > 0}
						<p style="color: var(--color-warning);">
							⚠️ 该节点下还有 {nodeToDelete.children.length} 个子节点，也将一并删除。
						</p>
					{/if}
					{#if getQuestionCount(nodeToDelete.id) > 0}
						<p style="color: var(--color-danger);">
							⚠️ 该节点及其子节点共关联 {getQuestionCount(nodeToDelete.id)} 道题目。
							删除后题目上的知识点标签将被移除。
						</p>
					{/if}
				</div>
				<div class="modal-footer">
					<button class="btn" on:click={() => showDeleteConfirm = false}>取消</button>
					<button class="btn btn-danger" on:click={doDelete}>确认删除</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<script lang="ts" context="module">
	import TreeNode from './TreeNode.svelte';
</script>

<style>
	.knowledge-page {
		padding: 24px;
		height: 100%;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
		flex-shrink: 0;
	}

	.page-header h1 {
		margin: 0;
		font-size: 22px;
	}

	.header-actions {
		display: flex;
		gap: 8px;
	}

	.main-content {
		display: flex;
		gap: 20px;
		flex: 1;
		overflow: hidden;
	}

	.tree-container {
		flex: 1;
		background: white;
		border-radius: var(--border-radius);
		border: 1px solid var(--color-gray-200);
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.tree-scroll {
		flex: 1;
		overflow-y: auto;
		padding: 16px;
	}

	.detail-panel {
		width: 320px;
		flex-shrink: 0;
	}

	.detail-card {
		background: white;
		border-radius: var(--border-radius);
		padding: 20px;
		border: 1px solid var(--color-gray-200);
	}

	.detail-card h3 {
		margin: 0 0 16px 0;
		font-size: 18px;
		color: var(--color-gray-800);
	}

	.detail-stats {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-bottom: 20px;
	}

	.stat-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.stat-label {
		font-size: 13px;
		color: var(--color-gray-500);
	}

	.stat-value {
		font-size: 13px;
		color: var(--color-gray-700);
	}

	.stat-value.highlight {
		color: var(--color-primary);
		font-weight: 500;
	}

	.children-section {
		margin-top: 20px;
		padding-top: 16px;
		border-top: 1px dashed var(--color-gray-200);
	}

	.children-section h4 {
		margin: 0 0 10px 0;
		font-size: 14px;
		color: var(--color-gray-700);
	}

	.children-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.child-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 6px 10px;
		background: var(--color-gray-50);
		border-radius: 4px;
		cursor: pointer;
		font-size: 13px;
		transition: all 0.15s;
	}

	.child-item:hover {
		background: rgba(59, 130, 246, 0.1);
		color: var(--color-primary);
	}

	.child-count {
		font-size: 11px;
		color: var(--color-gray-500);
	}

	.detail-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 20px;
		padding-top: 16px;
		border-top: 1px dashed var(--color-gray-200);
	}

	.detail-actions .btn {
		flex: 1;
		justify-content: center;
		min-width: calc(50% - 4px);
	}

	.empty-detail {
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: var(--color-gray-400);
		font-size: 14px;
	}

	.empty-detail p {
		margin: 12px 0 0 0;
	}

	@media (max-width: 900px) {
		.main-content {
			flex-direction: column;
		}
		.detail-panel {
			width: 100%;
		}
	}
</style>
