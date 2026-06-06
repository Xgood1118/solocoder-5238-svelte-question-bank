<script lang="ts">
	import { onMount, derived } from 'svelte';
	import { goto } from '$app/navigation';
	import type { Question, KnowledgeNode } from '$lib/types';
	import {
		questions,
		knowledgeRoot,
		allCreators,
		filteredQuestions,
		deleteQuestion,
		unlockQuestion,
		rollbackQuestion,
		isGroupLeader
	} from '$lib/stores';
	import { findNode, getAllDescendantIds } from '$lib/utils/knowledgeTree';
	import QuestionPreview from '$lib/components/QuestionPreview.svelte';
	import RichText from '$lib/components/RichText.svelte';

	let selectedKnowledgeIds: string[] = [];
	let selectedDifficulties: number[] = [];
	let selectedTypes: string[] = [];
	let selectedCreators: string[] = [];
	let keyword: string = '';
	let onlyUnlocked: boolean = false;
	let searchResults: Question[] = [];
	let showDetail: Question | null = null;
	let showDeleteConfirm: boolean = false;
	let questionToDelete: Question | null = null;

	let expandedKnowledge: Set<string> = new Set(['root']);

	const typeNames: Record<string, string> = {
		choice: '选择题',
		fill: '填空题',
		short_answer: '简答题',
		calculation: '计算题',
		proof: '证明题'
	};

	function toggleKnowledge(node: KnowledgeNode) {
		if (selectedKnowledgeIds.includes(node.id)) {
			selectedKnowledgeIds = selectedKnowledgeIds.filter(id => id !== node.id);
		} else {
			selectedKnowledgeIds = [...selectedKnowledgeIds, node.id];
		}
	}

	function toggleExpand(id: string) {
		const newSet = new Set(expandedKnowledge);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		expandedKnowledge = newSet;
	}

	function toggleDifficulty(n: number) {
		if (selectedDifficulties.includes(n)) {
			selectedDifficulties = selectedDifficulties.filter(d => d !== n);
		} else {
			selectedDifficulties = [...selectedDifficulties, n];
		}
	}

	function toggleType(t: string) {
		if (selectedTypes.includes(t)) {
			selectedTypes = selectedTypes.filter(x => x !== t);
		} else {
			selectedTypes = [...selectedTypes, t];
		}
	}

	function toggleCreator(c: string) {
		if (selectedCreators.includes(c)) {
			selectedCreators = selectedCreators.filter(x => x !== c);
		} else {
			selectedCreators = [...selectedCreators, c];
		}
	}

	function doSearch() {
		const filterFn = $filteredQuestions;
		searchResults = filterFn({
			knowledgePointIds: selectedKnowledgeIds,
			difficulties: selectedDifficulties,
			types: selectedTypes,
			creators: selectedCreators,
			keyword,
			onlyUnlocked
		});
	}

	function getKPName(id: string): string {
		const node = findNode($knowledgeRoot, id);
		return node?.name || id;
	}

	function confirmDelete(q: Question) {
		questionToDelete = q;
		showDeleteConfirm = true;
	}

	function doDelete() {
		if (questionToDelete) {
			deleteQuestion(questionToDelete.id);
			showDeleteConfirm = false;
			questionToDelete = null;
			doSearch();
		}
	}

	function doUnlock(id: string) {
		if (confirm('确定要解锁此题目吗？解锁后可被重新组卷使用。')) {
			unlockQuestion(id);
		}
	}

	function handleRollback(versionId: string) {
		if (!showDetail) return;
		if (confirm('确定要回滚到这个版本吗？当前内容将会被覆盖。')) {
			rollbackQuestion(showDetail.id, versionId);
			const updated = $questions.find(q => q.id === showDetail.id);
			if (updated) showDetail = updated;
		}
	}

	function resetFilters() {
		selectedKnowledgeIds = [];
		selectedDifficulties = [];
		selectedTypes = [];
		selectedCreators = [];
		keyword = '';
		onlyUnlocked = false;
		doSearch();
	}

	function getThumbnail(q: Question): string | null {
		if (q.image) return q.image;
		if (q.options?.length > 0) {
			for (const opt of q.options) {
				if (opt.image) return opt.image;
			}
		}
		return null;
	}

	onMount(() => {
		doSearch();
	});

	$: keyword && doSearch();
</script>

<div class="list-page">
	<div class="page-header">
		<h1>题目列表</h1>
		<div class="header-actions">
			<button class="btn btn-primary" on:click={() => goto('/questions/new')}>
				<iconify-icon icon="mdi:plus"></iconify-icon>
				录入题目
			</button>
			<button class="btn" on:click={() => goto('/import')}>
				<iconify-icon icon="mdi:upload"></iconify-icon>
				批量导入
			</button>
		</div>
	</div>

	<div class="main-content">
		<aside class="filter-sidebar">
			<div class="filter-section">
				<div class="filter-header">
					<span>知识点</span>
					<button class="clear-btn" on:click={() => selectedKnowledgeIds = []}>清空</button>
				</div>
				<div class="knowledge-tree">
					{#each $knowledgeRoot.children as node}
						<KnowledgeTreeNode
							node={node}
							selected={selectedKnowledgeIds}
							expanded={expandedKnowledge}
							on:toggle={(e) => toggleKnowledge(e.detail)}
							on:expand={(e) => toggleExpand(e.detail)}
							{getKPName}
						/>
					{/each}
				</div>
				{#if selectedKnowledgeIds.length > 0}
					<div class="selected-chips">
						<span class="filter-hint">已选 {selectedKnowledgeIds.length} 个</span>
					</div>
				{/if}
			</div>

			<div class="filter-section">
				<div class="filter-header">
					<span>难度</span>
					<button class="clear-btn" on:click={() => selectedDifficulties = []}>清空</button>
				</div>
				<div class="difficulty-filter">
					{#each [1, 2, 3, 4, 5] as n}
						<button
							class="diff-btn"
							class:active={selectedDifficulties.includes(n)}
							on:click={() => toggleDifficulty(n)}
						>
							{#each Array(n) as _, i}
								<iconify-icon icon="mdi:star" style="font-size: 14px;"></iconify-icon>
							{/each}
							<span class="diff-num">{n}星</span>
						</button>
					{/each}
				</div>
			</div>

			<div class="filter-section">
				<div class="filter-header">
					<span>题型</span>
					<button class="clear-btn" on:click={() => selectedTypes = []}>清空</button>
				</div>
				<div class="type-filter">
					{#each Object.entries(typeNames) as [value, label]}
						<label class="checkbox-item">
							<input type="checkbox" checked={selectedTypes.includes(value)} on:change={() => toggleType(value)} />
							<span>{label}</span>
						</label>
					{/each}
				</div>
			</div>

			<div class="filter-section">
				<div class="filter-header">
					<span>命题人</span>
					<button class="clear-btn" on:click={() => selectedCreators = []}>清空</button>
				</div>
				<div class="creator-filter">
					{#each $allCreators as creator}
						<label class="checkbox-item">
							<input type="checkbox" checked={selectedCreators.includes(creator)} on:change={() => toggleCreator(creator)} />
							<span>{creator}</span>
						</label>
					{/each}
				</div>
			</div>

			<div class="filter-section">
				<label class="checkbox-item">
					<input type="checkbox" bind:checked={onlyUnlocked} />
					<span>只看未锁定题目</span>
				</label>
			</div>

			<div class="filter-actions">
				<button class="btn btn-primary" on:click={doSearch} style="flex: 1;">
					<iconify-icon icon="mdi:magnify"></iconify-icon>
					搜索
				</button>
				<button class="btn" on:click={resetFilters}>
					重置
				</button>
			</div>
		</aside>

		<div class="results-section">
			<div class="search-bar">
				<div class="search-input-wrapper">
					<iconify-icon icon="mdi:magnify" class="search-icon"></iconify-icon>
					<input
						class="form-input search-input"
						bind:value={keyword}
						placeholder="搜索题干和解析内容..."
						on:keydown={(e) => e.key === 'Enter' && doSearch()}
					/>
				</div>
				<span class="result-count">共 {searchResults.length} 道题</span>
			</div>

			{#if searchResults.length === 0}
				<div class="empty-state">
					<iconify-icon icon="mdi:file-search-outline"></iconify-icon>
					<p>没有找到匹配的题目</p>
					<button class="btn btn-primary" on:click={() => goto('/questions/new')}>录入新题目</button>
				</div>
			{:else}
				<div class="question-grid">
					{#each searchResults as q (q.id)}
						<div class="question-card" on:click={() => showDetail = q}>
							<div class="card-header">
								<span class="badge" class:badge-primary={q.type === 'choice'}
									class:badge-success={q.type === 'fill'}
									class:badge-warning={q.type === 'calculation'}
									class:badge-gray={q.type === 'short_answer' || q.type === 'proof'}
								>
									{typeNames[q.type]}
								</span>
								<span class="stars">
									{#each Array(5) as _, i}
										<iconify-icon
											icon={i < q.difficulty ? 'mdi:star' : 'mdi:star-outline'}
											style="font-size: 13px;"
										></iconify-icon>
									{/each}
								</span>
								{#if q.isLocked}
									<iconify-icon icon="mdi:lock" style="color: var(--color-danger); font-size: 14px;" title="已锁定"></iconify-icon>
								{/if}
							</div>

							{@const thumb = getThumbnail(q)}
							{#if thumb}
								<div class="card-thumb">
									<img src={thumb} alt="缩略图" />
								</div>
							{/if}

							<div class="card-stem">
								<RichText content={q.stem.substring(0, 80) + (q.stem.length > 80 ? '...' : '')} inline={false} />
							</div>

							<div class="card-footer">
								<span class="creator">{q.creator}</span>
								<span class="kp-count">{q.knowledgePoints.length} 个知识点</span>
							</div>

							<div class="card-actions">
								<button class="btn btn-sm" on:click|stopPropagation={() => goto(`/questions/${q.id}/edit`)}>
									<iconify-icon icon="mdi:pencil"></iconify-icon>
									编辑
								</button>
								<button class="btn btn-sm" on:click|stopPropagation={() => showDetail = q}>
									<iconify-icon icon="mdi:eye"></iconify-icon>
									查看
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	{#if showDetail}
		<div class="modal-overlay" on:click={() => showDetail = null}>
			<div class="modal detail-modal" on:click|stopPropagation>
				<div class="modal-header">
					<span>题目详情</span>
					<button class="close-btn" on:click={() => showDetail = null}>
						<iconify-icon icon="mdi:close"></iconify-icon>
					</button>
				</div>
				<div class="modal-body">
					<QuestionPreview question={showDetail} showAnswer={true} />

					{#if showDetail.usageHistory.length > 0}
						<div class="usage-history">
							<h4>使用历史</h4>
							{#each showDetail.usageHistory as record}
								<div class="usage-item">
									<span class="usage-exam">{record.examName}</span>
									<span class="usage-date">{new Date(record.examDate).toLocaleDateString()}</span>
									<span class={`badge ${record.published ? 'badge-danger' : 'badge-gray'}`}>
										{record.published ? '已发布' : '草稿'}
									</span>
								</div>
							{/each}
						</div>
					{/if}

					{#if showDetail.relatedQuestions.length > 0}
						<div class="related-section">
							<h4>关联题（变式题）</h4>
							<div class="related-list">
								{#each showDetail.relatedQuestions as rqId}
									{@const rq = $questions.find(x => x.id === rqId)}
									{#if rq}
										<div class="related-item" on:click={() => showDetail = rq}>
											<RichText content={rq.stem.substring(0, 40) + '...'} inline={true} />
										</div>
									{/if}
								{/each}
							</div>
						</div>
					{/if}

					{#if showDetail.versions.length > 0}
					<div class="versions-section">
						<h4>历史版本</h4>
						<div class="versions-list">
							{#each [...showDetail.versions].reverse() as ver}
								<div class="version-item">
									<div class="version-info">
										<span class="version-time">{new Date(ver.timestamp).toLocaleString()}</span>
										<span class="version-editor">{ver.editor} 修改</span>
									</div>
									<button class="btn btn-sm" on:click={() => handleRollback(ver.id)}>
										<iconify-icon icon="mdi:history"></iconify-icon>
										回滚
									</button>
								</div>
							{/each}
						</div>
					</div>
				{/if}
				</div>
				<div class="modal-footer">
					{#if showDetail.isLocked && $isGroupLeader}
						<button class="btn btn-warning" on:click={() => doUnlock(showDetail.id)}>
							<iconify-icon icon="mdi:lock-open"></iconify-icon>
							解锁
						</button>
					{/if}
					<button class="btn btn-danger" on:click={() => confirmDelete(showDetail)}>
						<iconify-icon icon="mdi:delete"></iconify-icon>
						删除
					</button>
					<button class="btn btn-primary" on:click={() => goto(`/questions/${showDetail.id}/edit`)}>
						<iconify-icon icon="mdi:pencil"></iconify-icon>
						编辑
					</button>
				</div>
			</div>
		</div>
	{/if}

	{#if showDeleteConfirm}
		<div class="modal-overlay" on:click={() => showDeleteConfirm = false}>
			<div class="modal" style="max-width: 420px;" on:click|stopPropagation>
				<div class="modal-header">
					<span>确认删除</span>
				</div>
				<div class="modal-body">
					<p>确定要删除这道题目吗？此操作不可撤销。</p>
					{#if questionToDelete?.usageHistory?.length}
						<p style="color: var(--color-danger);">
							⚠️ 该题目已被 {questionToDelete.usageHistory.length} 场考试使用，删除后可能影响历史记录。
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
	import KnowledgeTreeNode from './KnowledgeTreeNode.svelte';
</script>

<style>
	.list-page {
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

	.filter-sidebar {
		width: 260px;
		flex-shrink: 0;
		overflow-y: auto;
		padding-right: 4px;
	}

	.filter-section {
		background: white;
		border-radius: var(--border-radius);
		padding: 14px;
		margin-bottom: 12px;
		border: 1px solid var(--color-gray-200);
	}

	.filter-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 10px;
		font-weight: 500;
		font-size: 13px;
	}

	.clear-btn {
		background: none;
		border: none;
		color: var(--color-primary);
		cursor: pointer;
		font-size: 12px;
		padding: 0;
	}

	.knowledge-tree {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.selected-chips {
		margin-top: 8px;
		padding-top: 8px;
		border-top: 1px dashed var(--color-gray-200);
	}

	.filter-hint {
		font-size: 12px;
		color: var(--color-gray-500);
	}

	.difficulty-filter {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.diff-btn {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 10px;
		background: var(--color-gray-50);
		border: 1px solid var(--color-gray-200);
		border-radius: 4px;
		cursor: pointer;
		color: var(--color-warning);
		transition: all 0.15s;
	}

	.diff-btn.active {
		background: rgba(245, 158, 11, 0.1);
		border-color: var(--color-warning);
	}

	.diff-num {
		color: var(--color-gray-600);
		font-size: 12px;
		margin-left: auto;
	}

	.type-filter,
	.creator-filter {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.checkbox-item {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		cursor: pointer;
	}

	.checkbox-item input {
		cursor: pointer;
	}

	.filter-actions {
		display: flex;
		gap: 8px;
		margin-top: 12px;
	}

	.results-section {
		flex: 1;
		overflow-y: auto;
		padding-right: 4px;
		display: flex;
		flex-direction: column;
	}

	.search-bar {
		display: flex;
		align-items: center;
		gap: 16px;
		margin-bottom: 16px;
		flex-shrink: 0;
	}

	.search-input-wrapper {
		flex: 1;
		position: relative;
	}

	.search-icon {
		position: absolute;
		left: 12px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--color-gray-400);
	}

	.search-input {
		padding-left: 36px;
	}

	.result-count {
		font-size: 13px;
		color: var(--color-gray-500);
		flex-shrink: 0;
	}

	.question-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 16px;
	}

	.question-card {
		background: white;
		border-radius: var(--border-radius);
		border: 1px solid var(--color-gray-200);
		padding: 14px;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.question-card:hover {
		border-color: var(--color-primary);
		box-shadow: var(--shadow-md);
		transform: translateY(-2px);
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.card-header .badge {
		flex-shrink: 0;
	}

	.stars {
		color: var(--color-warning);
	}

	.card-thumb {
		height: 100px;
		overflow: hidden;
		border-radius: 6px;
		background: var(--color-gray-50);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.card-thumb img {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
	}

	.card-stem {
		flex: 1;
		font-size: 13px;
		line-height: 1.7;
		color: var(--color-gray-700);
		overflow: hidden;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
	}

	.card-footer {
		display: flex;
		justify-content: space-between;
		font-size: 12px;
		color: var(--color-gray-500);
		padding-top: 8px;
		border-top: 1px solid var(--color-gray-100);
	}

	.card-actions {
		display: flex;
		gap: 6px;
	}

	.card-actions .btn {
		flex: 1;
		justify-content: center;
	}

	.detail-modal {
		width: 680px;
	}

	.close-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 4px;
		color: var(--color-gray-500);
		border-radius: 4px;
	}

	.close-btn:hover {
		background: var(--color-gray-100);
		color: var(--color-gray-700);
	}

	.usage-history,
	.related-section,
	.versions-section {
		margin-top: 20px;
		padding-top: 16px;
		border-top: 1px dashed var(--color-gray-200);
	}

	.usage-history h4,
	.related-section h4,
	.versions-section h4 {
		margin: 0 0 10px 0;
		font-size: 14px;
		color: var(--color-gray-700);
	}

	.usage-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 6px 0;
		font-size: 13px;
	}

	.usage-exam {
		flex: 1;
	}

	.usage-date {
		color: var(--color-gray-500);
		font-size: 12px;
	}

	.related-list {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.related-item {
		padding: 6px 12px;
		background: var(--color-gray-50);
		border-radius: 4px;
		font-size: 12px;
		cursor: pointer;
		color: var(--color-gray-700);
	}

	.related-item:hover {
		background: rgba(59, 130, 246, 0.1);
		color: var(--color-primary);
	}

	.versions-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.version-item {
		padding: 8px 12px;
		background: var(--color-gray-50);
		border-radius: 4px;
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.version-info {
		flex: 1;
		display: flex;
		justify-content: space-between;
		font-size: 12px;
	}

	.version-time {
		color: var(--color-gray-700);
	}

	.version-editor {
		color: var(--color-gray-500);
	}

	.empty-state {
		text-align: center;
		padding: 80px 20px;
		color: var(--color-gray-400);
	}

	.empty-state iconify-icon {
		font-size: 56px;
		margin-bottom: 16px;
	}

	.empty-state p {
		margin: 0 0 16px 0;
	}
</style>
