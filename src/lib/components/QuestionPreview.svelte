<script lang="ts">
	import type { Question } from '$lib/types';
	import RichText from './RichText.svelte';

	export let question: Question;
	export let showAnswer: boolean = true;
	export let compact: boolean = false;

	const typeNames: Record<string, string> = {
		choice: '选择题',
		fill: '填空题',
		short_answer: '简答题',
		calculation: '计算题',
		proof: '证明题'
	};
</script>

<div class="question-preview" class:compact>
	<div class="q-header">
		<span class="badge badge-gray">{typeNames[question.type] || question.type}</span>
		<span class="difficulty">
			{#each Array(5) as _, i}
				<iconify-icon
					icon={i < question.difficulty ? 'mdi:star' : 'mdi:star-outline'}
					style="color: var(--color-warning); font-size: 14px;"
				></iconify-icon>
			{/each}
		</span>
		{#if !compact}
			<span class="creator">{question.creator}</span>
		{/if}
		{#if question.isLocked}
			<span class="badge badge-danger">已锁定</span>
		{/if}
	</div>

	<div class="q-stem">
		<RichText content={question.stem} />
		{#if question.image}
			<div class="q-image">
				<img src={question.image} alt="题目图片" />
			</div>
		{/if}
	</div>

	{#if question.options && question.options.length > 0}
		<div class="q-options">
			{#each question.options as opt}
				<div class="option">
					<span class="option-label">{opt.label}.</span>
					<span class="option-content">
						<RichText content={opt.content} inline={true} />
						{#if opt.image}
							<img src={opt.image} alt="选项图片" class="option-image" />
						{/if}
					</span>
				</div>
			{/each}
		</div>
	{/if}

	{#if showAnswer}
		<div class="q-answer-section">
			<div class="section-label">【答案】</div>
			<div class="section-content">
				<RichText content={question.answer} />
			</div>
		</div>

		{#if question.analysis}
			<div class="q-analysis-section">
				<div class="section-label">【解析】</div>
				<div class="section-content">
					<RichText content={question.analysis} />
				</div>
			</div>
		{/if}
	{/if}

	{#if !compact && question.knowledgePoints && question.knowledgePoints.length > 0}
		<div class="q-tags">
			{#each question.knowledgePoints as kp}
				<span class="tag tag-blue">{kp}</span>
			{/each}
		</div>
	{/if}
</div>

<style>
	.question-preview {
		background: white;
		border-radius: var(--border-radius);
		padding: 20px;
		border: 1px solid var(--color-gray-200);
	}

	.question-preview.compact {
		padding: 12px;
		font-size: 13px;
	}

	.q-header {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 12px;
		flex-wrap: wrap;
	}

	.difficulty {
		display: inline-flex;
		align-items: center;
		gap: 1px;
	}

	.creator {
		margin-left: auto;
		font-size: 12px;
		color: var(--color-gray-500);
	}

	.q-stem {
		margin-bottom: 16px;
		line-height: 1.8;
		font-size: 15px;
	}

	.compact .q-stem {
		font-size: 13px;
		margin-bottom: 10px;
	}

	.q-image {
		margin-top: 10px;
		text-align: center;
	}

	.q-image img {
		max-width: 100%;
		max-height: 200px;
		border-radius: 4px;
	}

	.q-options {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-bottom: 16px;
	}

	.compact .q-options {
		gap: 6px;
		margin-bottom: 10px;
	}

	.option {
		display: flex;
		gap: 8px;
		line-height: 1.7;
	}

	.option-label {
		font-weight: 500;
		color: var(--color-gray-600);
		flex-shrink: 0;
	}

	.option-content {
		flex: 1;
	}

	.option-image {
		display: block;
		max-width: 120px;
		max-height: 80px;
		margin-top: 4px;
		border-radius: 4px;
	}

	.q-answer-section,
	.q-analysis-section {
		margin-top: 14px;
		padding-top: 14px;
		border-top: 1px dashed var(--color-gray-200);
	}

	.section-label {
		font-weight: 600;
		color: var(--color-primary);
		margin-bottom: 6px;
		font-size: 13px;
	}

	.section-content {
		line-height: 1.8;
		color: var(--color-gray-700);
	}

	.q-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 14px;
		padding-top: 14px;
		border-top: 1px dashed var(--color-gray-200);
	}
</style>
