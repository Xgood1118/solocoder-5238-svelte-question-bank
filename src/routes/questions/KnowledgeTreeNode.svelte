<script lang="ts">
	import type { KnowledgeNode } from '$lib/types';

	export let node: KnowledgeNode;
	export let selected: string[];
	export let expanded: Set<string>;
	export let getKPName: (id: string) => string;

	let isExpanded: boolean;
	$: isExpanded = expanded.has(node.id);

	let isSelected: boolean;
	$: isSelected = selected.includes(node.id);

	function handleToggle(e: Event) {
		e.stopPropagation();
		dispatch('toggle', node);
	}

	function handleExpand(e: Event) {
		e.stopPropagation();
		dispatch('expand', node.id);
	}

	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();
</script>

<div class="tree-node">
	<div class="tree-node-row" class:selected={isSelected}>
		{#if node.children.length > 0}
			<button class="expand-btn" on:click={handleExpand}>
				<iconify-icon icon={isExpanded ? 'mdi:chevron-down' : 'mdi:chevron-right'}></iconify-icon>
			</button>
		{:else}
			<span class="leaf-spacer"></span>
		{/if}
		<label class="node-label" on:click={handleToggle}>
			<input type="checkbox" checked={isSelected} on:click|stopPropagation={handleToggle} />
			<span class="node-name">{node.name}</span>
		</label>
	</div>
	{#if isExpanded && node.children.length > 0}
		<div class="tree-children">
			{#each node.children as child}
				<svelte:self
					node={child}
					{selected}
					{expanded}
					{getKPName}
					on:toggle
					on:expand
				/>
			{/each}
		</div>
	{/if}
</div>

<style>
	.tree-node {
		user-select: none;
	}

	.tree-node-row {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 3px 4px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 13px;
	}

	.tree-node-row:hover {
		background: var(--color-gray-50);
	}

	.tree-node-row.selected {
		background: rgba(59, 130, 246, 0.1);
	}

	.expand-btn {
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		cursor: pointer;
		color: var(--color-gray-400);
		padding: 0;
		flex-shrink: 0;
	}

	.expand-btn:hover {
		color: var(--color-gray-700);
	}

	.leaf-spacer {
		width: 20px;
		flex-shrink: 0;
	}

	.node-label {
		display: flex;
		align-items: center;
		gap: 6px;
		flex: 1;
		cursor: pointer;
	}

	.node-label input {
		cursor: pointer;
	}

	.node-name {
		color: var(--color-gray-700);
	}

	.tree-children {
		margin-left: 16px;
	}
</style>
