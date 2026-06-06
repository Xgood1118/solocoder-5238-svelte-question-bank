<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { KnowledgeNode } from '$lib/types';

	export let node: KnowledgeNode;
	export let selectedId: string | null;
	export let editingId: string | null;
	export let editingName: string;
	export let draggingId: string | null;
	export let dragOverId: string | null;
	export let dragPosition: 'before' | 'after' | 'inside' | null;
	export let getQuestionCount: (id: string) => number;

	const dispatch = createEventDispatcher();

	let expanded: boolean = true;
	let inputEl: HTMLInputElement;

	$: isSelected = selectedId === node.id;
	$: isEditing = editingId === node.id;
	$: isDragging = draggingId === node.id;
	$: isDragOver = dragOverId === node.id;

	function handleClick() {
		if (!isEditing) {
			dispatch('select', node);
			toggleExpand();
		}
	}

	function toggleExpand() {
		expanded = !expanded;
	}

	function handleExpandClick(e: Event) {
		e.stopPropagation();
		toggleExpand();
	}

	function handleStartEdit(e: Event) {
		e.stopPropagation();
		dispatch('start-edit', { node, event: e });
		setTimeout(() => {
			inputEl?.focus();
			inputEl?.select();
		}, 0);
	}

	function handleFinishEdit() {
		dispatch('finish-edit');
	}

	function handleKeydown(e: KeyboardEvent) {
		dispatch('keydown', e);
	}

	function handleAddChild(e: Event) {
		e.stopPropagation();
		dispatch('add-child', node.id);
	}

	function handleDelete(e: Event) {
		e.stopPropagation();
		dispatch('delete', node);
	}

	function handleDragStart(e: DragEvent) {
		e.stopPropagation();
		dispatch('drag-start', { node, event: e });
	}

	function handleDragEnd(e: DragEvent) {
		e.stopPropagation();
		dispatch('drag-end');
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		dispatch('drag-over', { node, event: e });
	}

	function handleDragLeave(e: DragEvent) {
		e.stopPropagation();
		dispatch('drag-leave');
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		dispatch('drop', { node, event: e });
	}
</script>

<div class="tree-node-wrapper" class:dragging={isDragging}>
	<div
		class="tree-node-content"
		class:selected={isSelected}
		class:drag-over={isDragOver}
		class:drag-before={isDragOver && dragPosition === 'before'}
		class:drag-after={isDragOver && dragPosition === 'after'}
		class:drag-inside={isDragOver && dragPosition === 'inside'}
		draggable={node.id !== 'root'}
		on:click={handleClick}
		on:dragstart={handleDragStart}
		on:dragend={handleDragEnd}
		on:dragover={handleDragOver}
		on:dragleave={handleDragLeave}
		on:drop={handleDrop}
	>
		<span class="expand-btn" on:click={handleExpandClick}>
			{#if node.children.length > 0}
				<iconify-icon icon={expanded ? 'mdi:chevron-down' : 'mdi:chevron-right'}></iconify-icon>
			{:else}
				<iconify-icon icon="mdi:folder-outline" style="opacity: 0.5;"></iconify-icon>
			{/if}
		</span>

		{#if isEditing}
			<input
				bind:this={inputEl}
				bind:value={editingName}
				on:blur={handleFinishEdit}
				on:keydown={handleKeydown}
				on:click|stopPropagation
				class="edit-input"
			/>
		{:else}
			<span class="node-name">
				<iconify-icon icon={node.id === 'root' ? 'mdi:database' : 'mdi:folder'} class="node-icon"></iconify-icon>
				{node.name}
			</span>
		{/if}

		<span class="node-count">{getQuestionCount(node.id)}</span>

		<span class="node-actions">
			<button class="action-btn" title="添加子节点" on:click={handleAddChild}>
				<iconify-icon icon="mdi:plus"></iconify-icon>
			</button>
			{#if node.id !== 'root'}
				<button class="action-btn" title="重命名" on:click={handleStartEdit}>
					<iconify-icon icon="mdi:pencil"></iconify-icon>
				</button>
				<button class="action-btn delete-btn" title="删除" on:click={handleDelete}>
					<iconify-icon icon="mdi:delete"></iconify-icon>
				</button>
			{/if}
		</span>
	</div>

	{#if expanded && node.children.length > 0}
		<div class="tree-children">
			{#each node.children as child (child.id)}
				<svelte:self
					node={child}
					{selectedId}
					{editingId}
					{editingName}
					{draggingId}
					{dragOverId}
					{dragPosition}
					{getQuestionCount}
					on:select
					on:start-edit
					on:finish-edit
					on:keydown
					on:add-child
					on:delete
					on:drag-start
					on:drag-end
					on:drag-over
					on:drag-leave
					on:drop
				/>
			{/each}
		</div>
	{/if}
</div>

<style>
	.tree-node-wrapper {
		user-select: none;
	}

	.tree-node-wrapper.dragging {
		opacity: 0.4;
	}

	.tree-node-content {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 10px;
		border-radius: 6px;
		cursor: pointer;
		transition: background-color 0.15s;
		position: relative;
		border: 2px solid transparent;
	}

	.tree-node-content:hover {
		background: var(--color-gray-50);
	}

	.tree-node-content.selected {
		background: rgba(59, 130, 246, 0.1);
		color: var(--color-primary);
	}

	.tree-node-content.drag-before {
		border-top-color: var(--color-primary);
	}

	.tree-node-content.drag-after {
		border-bottom-color: var(--color-primary);
	}

	.tree-node-content.drag-inside {
		background: rgba(59, 130, 246, 0.15);
		border-color: var(--color-primary);
	}

	.expand-btn {
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-gray-400);
		flex-shrink: 0;
	}

	.node-name {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 14px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.node-icon {
		color: var(--color-warning);
		font-size: 16px;
		flex-shrink: 0;
	}

	.tree-node-content.selected .node-icon {
		color: var(--color-primary);
	}

	.edit-input {
		flex: 1;
		padding: 2px 6px;
		border: 1px solid var(--color-primary);
		border-radius: 4px;
		outline: none;
		font-size: 14px;
		min-width: 0;
	}

	.node-count {
		font-size: 12px;
		color: var(--color-gray-400);
		background: var(--color-gray-100);
		padding: 1px 8px;
		border-radius: 10px;
		flex-shrink: 0;
	}

	.tree-node-content.selected .node-count {
		background: rgba(59, 130, 246, 0.2);
		color: var(--color-primary);
	}

	.node-actions {
		display: flex;
		gap: 2px;
		opacity: 0;
		transition: opacity 0.15s;
		flex-shrink: 0;
	}

	.tree-node-content:hover .node-actions {
		opacity: 1;
	}

	.action-btn {
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		color: var(--color-gray-400);
		padding: 0;
	}

	.action-btn:hover {
		background: var(--color-gray-200);
		color: var(--color-gray-700);
	}

	.delete-btn:hover {
		background: rgba(239, 68, 68, 0.1);
		color: var(--color-danger);
	}

	.tree-children {
		margin-left: 24px;
		border-left: 1px dashed var(--color-gray-200);
		padding-left: 4px;
	}
</style>
