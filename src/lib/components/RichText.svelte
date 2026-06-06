<script lang="ts">
	import { onMount, afterUpdate } from 'svelte';
	import katex from 'katex';

	export let content: string;
	export let inline: boolean = false;

	let container: HTMLElement;
	let htmlContent: string = '';

	function renderRichText(text: string): string {
		let result = escapeHtml(text);

		result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
		result = result.replace(/\*(.*?)\*/g, '<em>$1</em>');
		result = result.replace(/\n/g, '<br>');

		result = result.replace(/\$\$(.+?)\$\$/g, (match, formula) => {
			try {
				return katex.renderToString(formula, { displayMode: true, throwOnError: false });
			} catch {
				return match;
			}
		});

		result = result.replace(/\$(.+?)\$/g, (match, formula) => {
			try {
				return katex.renderToString(formula, { displayMode: false, throwOnError: false });
			} catch {
				return match;
			}
		});

		result = result.replace(/\[img:([^\]]+)\]/g, '<img src="$1" alt="图片" />');

		return result;
	}

	function escapeHtml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

	$: htmlContent = renderRichText(content || '');

	onMount(() => {
		// 已在 SSR 阶段外渲染
	});
</script>

{#if inline}
	<span class="rich-text-inline">{@html htmlContent}</span>
{:else}
	<div class="rich-text" bind:this={container}>{@html htmlContent}</div>
{/if}

<style>
	.rich-text {
		line-height: 1.8;
		word-break: break-word;
	}

	.rich-text :global(img) {
		max-width: 100%;
		max-height: 200px;
		border-radius: 4px;
		margin: 4px 0;
	}

	.rich-text :global(.katex) {
		font-size: 1.05em;
	}

	.rich-text-inline {
		display: inline;
	}

	.rich-text-inline :global(.katex) {
		font-size: 1em;
	}
</style>
