<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { derived } from 'svelte/store';
	import type { Question, QuestionOption, QuestionType, DuplicateCandidate } from '$lib/types';
	import { questions, knowledgeRoot, currentUser, addQuestion, updateQuestion, findDuplicates } from '$lib/stores';
	import { generateId } from '$lib/utils/text';
	import { findNode, getAllDescendantIds, flattenNodes } from '$lib/utils/knowledgeTree';
	import QuestionPreview from '$lib/components/QuestionPreview.svelte';
	import RichText from '$lib/components/RichText.svelte';

	export let questionId: string | null = null;

	let editingId: string | null = null;
	let type: QuestionType = 'choice';
	let stem: string = '';
	let options: QuestionOption[] = [];
	let answer: string = '';
	let analysis: string = '';
	let knowledgePoints: string[] = [];
	let difficulty: number = 3;
	let showAnswer: boolean = true;
	let questionImage: string = '';
	let relatedInput: string = '';
	let relatedQuestions: string[] = [];
	let duplicateCandidates: DuplicateCandidate[] = [];
	let showDuplicateWarning: boolean = false;
	let duplicateDebounce: number | null = null;
	let knowledgeSearch: string = '';
	let showKPDropdown: boolean = false;
	let activeTab: 'basic' | 'advanced' = 'basic';

	let stemTextarea: HTMLTextAreaElement;

	const allKpNodes = derived(knowledgeRoot, $root => {
		return flattenNodes($root).filter(n => n.id !== 'root');
	});

	$: filteredKpNodes = $allKpNodes.filter(n =>
		n.name.toLowerCase().includes(knowledgeSearch.toLowerCase())
	);

	$: previewQuestion = {
		id: editingId || 'preview',
		type,
		stem,
		options: type === 'choice' ? options.filter(o => o.content.trim()) : [],
		answer,
		analysis,
		knowledgePoints,
		difficulty,
		creator: $currentUser,
		createdAt: Date.now(),
		updatedAt: Date.now(),
		image: questionImage || undefined,
		relatedQuestions,
		versions: [],
		usageHistory: [],
		isLocked: false
	} as Question;

	function initOptions() {
		options = [
			{ id: generateId(), label: 'A', content: '' },
			{ id: generateId(), label: 'B', content: '' },
			{ id: generateId(), label: 'C', content: '' },
			{ id: generateId(), label: 'D', content: '' }
		];
	}

	function checkDuplicates() {
		if (!stem.trim() || stem.length < 5) {
			duplicateCandidates = [];
			showDuplicateWarning = false;
			return;
		}
		if (duplicateDebounce) clearTimeout(duplicateDebounce);
		duplicateDebounce = setTimeout(() => {
			duplicateCandidates = findDuplicates(stem, editingId || undefined);
			showDuplicateWarning = duplicateCandidates.length > 0;
		}, 500) as unknown as number;
	}

	$: stem && checkDuplicates();

	function insertFormat(format: string) {
		const textarea = stemTextarea;
		if (!textarea) return;
		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const selected = stem.substring(start, end);

		let insertText = '';
		let cursorOffset = 0;

		switch (format) {
			case 'bold':
				insertText = `**${selected || '粗体文字'}**`;
				cursorOffset = selected ? insertText.length : 2;
				break;
			case 'italic':
				insertText = `*${selected || '斜体文字'}*`;
				cursorOffset = selected ? insertText.length : 1;
				break;
			case 'inline-formula':
				insertText = `$${selected || '公式'}$`;
				cursorOffset = selected ? insertText.length : 1;
				break;
			case 'block-formula':
				insertText = `\n$$${selected || '公式'}$$\n`;
				cursorOffset = selected ? insertText.length : 3;
				break;
		}

		stem = stem.substring(0, start) + insertText + stem.substring(end);

		setTimeout(() => {
			textarea.focus();
			const pos = start + cursorOffset;
			textarea.setSelectionRange(pos, pos);
		}, 0);
	}

	function handlePaste(e: ClipboardEvent) {
		const items = e.clipboardData?.items;
		if (!items) return;

		for (let i = 0; i < items.length; i++) {
			if (items[i].type.indexOf('image') !== -1) {
				e.preventDefault();
				const file = items[i].getAsFile();
				if (file) {
					const reader = new FileReader();
					reader.onload = (ev) => {
						const result = ev.target?.result as string;
						questionImage = result;
					};
					reader.readAsDataURL(file);
				}
				break;
			}
		}
	}

	function handleImageUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (ev) => {
				const result = ev.target?.result as string;
				questionImage = result;
			};
			reader.readAsDataURL(file);
		}
	}

	function removeImage() {
		questionImage = '';
	}

	function handleOptionInput(id: string, e: Event) {
		const target = e.target as HTMLInputElement;
		updateOptionContent(id, target.value);
	}

	function updateOptionContent(id: string, content: string) {
		options = options.map(o => o.id === id ? { ...o, content } : o);
	}

	function updateOptionImage(id: string, e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (ev) => {
				const result = ev.target?.result as string;
				options = options.map(o => o.id === id ? { ...o, image: result } : o);
			};
			reader.readAsDataURL(file);
		}
	}

	function removeOptionImage(id: string) {
		options = options.map(o => o.id === id ? { ...o, image: undefined } : o);
	}

	function toggleKP(id: string) {
		if (knowledgePoints.includes(id)) {
			knowledgePoints = knowledgePoints.filter(k => k !== id);
		} else {
			knowledgePoints = [...knowledgePoints, id];
		}
	}

	function getKPName(id: string): string {
		const node = findNode($knowledgeRoot, id);
		return node?.name || id;
	}

	function addRelatedQuestion() {
		if (!relatedInput.trim()) return;
		const q = $questions.find(q => q.id === relatedInput || q.stem.includes(relatedInput));
		if (q && !relatedQuestions.includes(q.id) && q.id !== editingId) {
			relatedQuestions = [...relatedQuestions, q.id];
		}
		relatedInput = '';
	}

	function removeRelated(id: string) {
		relatedQuestions = relatedQuestions.filter(r => r !== id);
	}

	function saveQuestion() {
		if (!stem.trim()) {
			alert('题干不能为空');
			return;
		}

		const now = Date.now();
		const validOptions = type === 'choice' ? options.filter(o => o.content.trim()) : [];

		if (editingId) {
			updateQuestion(editingId, {
				type,
				stem: stem.trim(),
				options: validOptions,
				answer: answer.trim(),
				analysis: analysis.trim(),
				knowledgePoints,
				difficulty,
				image: questionImage || undefined,
				relatedQuestions
			}, $currentUser);
			alert('更新成功');
			goto('/questions');
		} else {
			const q: Question = {
				id: generateId(),
				type,
				stem: stem.trim(),
				options: validOptions,
				answer: answer.trim(),
				analysis: analysis.trim(),
				knowledgePoints,
				difficulty,
				creator: $currentUser,
				createdAt: now,
				updatedAt: now,
				image: questionImage || undefined,
				relatedQuestions,
				versions: [],
				usageHistory: [],
				isLocked: false
			};
			addQuestion(q);
			alert('保存成功');
			resetForm();
		}
	}

	function resetForm() {
		type = 'choice';
		stem = '';
		initOptions();
		answer = '';
		analysis = '';
		knowledgePoints = [];
		difficulty = 3;
		questionImage = '';
		relatedQuestions = [];
		editingId = null;
		activeTab = 'basic';
	}

	function openOriginal(id: string) {
		goto(`/questions/${id}/edit`);
	}

	function loadQuestion(id: string) {
		const q = $questions.find(q => q.id === id);
		if (q) {
			editingId = q.id;
			type = q.type;
			stem = q.stem;
			answer = q.answer;
			analysis = q.analysis;
			knowledgePoints = [...q.knowledgePoints];
			difficulty = q.difficulty;
			questionImage = q.image || '';
			relatedQuestions = [...q.relatedQuestions];

			if (q.options && q.options.length > 0) {
				options = [...q.options];
			}
			while (options.length < 4) {
				const label = String.fromCharCode(65 + options.length);
				options.push({ id: generateId(), label, content: '' });
			}
		}
	}

	onMount(() => {
		document.addEventListener('paste', handlePaste);
		initOptions();

		if (questionId) {
			loadQuestion(questionId);
		}

		return () => {
			document.removeEventListener('paste', handlePaste);
			if (duplicateDebounce) clearTimeout(duplicateDebounce);
		};
	});

	$: if (questionId && $questions.length > 0) {
		// 当 questionId 变化时重新加载
	}
</script>

<div class="edit-page">
	<div class="page-header">
		<h1>{editingId ? '编辑题目' : '录入题目'}</h1>
		<div class="header-actions">
			<button class="btn" on:click={() => goto('/questions')}>
				<iconify-icon icon="mdi:arrow-left"></iconify-icon>
				返回列表
			</button>
			<button class="btn btn-primary" on:click={saveQuestion}>
				<iconify-icon icon="mdi:content-save"></iconify-icon>
				{editingId ? '保存修改' : '保存题目'}
			</button>
		</div>
	</div>

	{#if showDuplicateWarning}
		<div class="duplicate-warning">
			<div class="warning-header">
				<iconify-icon icon="mdi:alert" style="color: var(--color-warning);"></iconify-icon>
				<span>检测到 {duplicateCandidates.length} 道相似题目（相似度 ≥ 80%）</span>
				<button class="btn btn-sm" on:click={() => showDuplicateWarning = false}>
					忽略
				</button>
			</div>
			<div class="duplicate-list">
				{#each duplicateCandidates as cand}
					<div class="duplicate-item">
						<div class="dup-similarity">{Math.round(cand.similarity * 100)}%</div>
						<div class="dup-stem">
							<RichText content={cand.question.stem.substring(0, 100) + (cand.question.stem.length > 100 ? '...' : '')} inline={true} />
						</div>
						<button class="btn btn-sm" on:click={() => openOriginal(cand.question.id)}>
							查看原题
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<div class="edit-container">
		<div class="form-section">
			<div class="tabs">
				<button class:active={activeTab === 'basic'} on:click={() => activeTab = 'basic'}>基本信息</button>
				<button class:active={activeTab === 'advanced'} on:click={() => activeTab = 'advanced'}>高级设置</button>
			</div>

			{#if activeTab === 'basic'}
				<div class="form-group">
					<label class="form-label">题型</label>
					<select class="form-select" bind:value={type}>
						<option value="choice">选择题</option>
						<option value="fill">填空题</option>
						<option value="short_answer">简答题</option>
						<option value="calculation">计算题</option>
						<option value="proof">证明题</option>
					</select>
				</div>

				<div class="form-group">
					<label class="form-label">
						题干
						<span class="hint">支持 **粗体**、*斜体*、$行内公式$、$$块级公式$$</span>
					</label>
					<div class="toolbar">
						<button class="tool-btn" on:click={() => insertFormat('bold')} title="粗体">
							<iconify-icon icon="mdi:format-bold"></iconify-icon>
						</button>
						<button class="tool-btn" on:click={() => insertFormat('italic')} title="斜体">
							<iconify-icon icon="mdi:format-italic"></iconify-icon>
						</button>
						<span class="divider"></span>
						<button class="tool-btn" on:click={() => insertFormat('inline-formula')} title="行内公式">
							<iconify-icon icon="mdi:sigma"></iconify-icon>
						</button>
						<button class="tool-btn" on:click={() => insertFormat('block-formula')} title="块级公式">
							<iconify-icon icon="mdi:math-integral"></iconify-icon>
						</button>
					</div>
					<textarea
						bind:this={stemTextarea}
						bind:value={stem}
						class="form-textarea stem-textarea"
						placeholder="请输入题干内容..."
						rows={6}
					></textarea>
				</div>

				<div class="form-group">
					<label class="form-label">题目图片（可直接粘贴图片）</label>
					{#if questionImage}
						<div class="image-preview">
							<img src={questionImage} alt="题目图片" />
							<button class="remove-img" on:click={removeImage}>
								<iconify-icon icon="mdi:close"></iconify-icon>
							</button>
						</div>
					{/if}
					<label class="upload-btn">
						<iconify-icon icon="mdi:image-plus"></iconify-icon>
						上传图片
						<input type="file" accept="image/*" on:change={handleImageUpload} hidden />
					</label>
				</div>

				{#if type === 'choice'}
					<div class="form-group">
						<label class="form-label">选项</label>
						<div class="options-list">
							{#each options as opt (opt.id)}
								<div class="option-row">
									<span class="option-letter">{opt.label}</span>
									<input
										class="form-input"
										value={opt.content}
										on:input={(e) => handleOptionInput(opt.id, e)}
										placeholder={`选项 ${opt.label} 内容`}
									/>
									<label class="option-img-btn" title="上传选项图片">
										<iconify-icon icon="mdi:image"></iconify-icon>
										<input type="file" accept="image/*" on:change={(e) => updateOptionImage(opt.id, e)} hidden />
									</label>
									{#if opt.image}
										<button class="remove-img-sm" on:click={() => removeOptionImage(opt.id)} title="移除图片">
											<iconify-icon icon="mdi:close"></iconify-icon>
										</button>
									{/if}
								</div>
								{#if opt.image}
									<div class="option-image-preview">
										<img src={opt.image} alt={`选项${opt.label}图片`} />
									</div>
								{/if}
							{/each}
						</div>
					</div>
				{/if}

				<div class="form-group">
					<label class="form-label">答案</label>
					<textarea
						bind:value={answer}
						class="form-textarea"
						placeholder="请输入答案..."
						rows={3}
					></textarea>
				</div>

				<div class="form-group">
					<label class="form-label">解析</label>
					<textarea
						bind:value={analysis}
						class="form-textarea"
						placeholder="请输入解析..."
						rows={5}
					></textarea>
				</div>
			{/if}

			{#if activeTab === 'advanced'}
				<div class="form-group">
					<label class="form-label">难度</label>
					<div class="difficulty-selector">
						{#each [1, 2, 3, 4, 5] as n}
							<button
								class="star-btn"
								on:click={() => difficulty = n}
								class:active={difficulty >= n}
							>
								<iconify-icon icon={difficulty >= n ? 'mdi:star' : 'mdi:star-outline'}></iconify-icon>
								<span class="star-label">{n}星</span>
							</button>
						{/each}
					</div>
				</div>

				<div class="form-group">
					<label class="form-label">知识点标签</label>
					<div class="kp-selector" on:click={() => showKPDropdown = !showKPDropdown}>
						{#if knowledgePoints.length === 0}
							<span class="kp-placeholder">点击选择知识点（支持级联）</span>
						{:else}
							<div class="selected-kps">
								{#each knowledgePoints as kpId}
									<span class="tag tag-blue">
										{getKPName(kpId)}
										<button on:click|stopPropagation={() => toggleKP(kpId)} class="remove-tag">
											<iconify-icon icon="mdi:close" style="font-size: 12px;"></iconify-icon>
										</button>
									</span>
								{/each}
							</div>
						{/if}
						<iconify-icon icon="mdi:chevron-down" class="dropdown-icon"></iconify-icon>
					</div>
					{#if showKPDropdown}
						<div class="kp-dropdown" on:click|stopPropagation>
							<input
								class="form-input kp-search"
								bind:value={knowledgeSearch}
								placeholder="搜索知识点..."
							/>
							<div class="kp-tree">
								{#each filteredKpNodes as node}
									<div
										class="kp-item"
										class:selected={knowledgePoints.includes(node.id)}
										on:click={() => toggleKP(node.id)}
									>
										<input type="checkbox" checked={knowledgePoints.includes(node.id)} on:click|stopPropagation />
										<span>{node.name}</span>
										<span class="kp-hint">
											{node.parentId ? getKPName(node.parentId) : ''}
										</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<div class="form-group">
					<label class="form-label">关联题（变式题）</label>
					<div class="related-input-row">
						<input
							class="form-input"
							bind:value={relatedInput}
							placeholder="输入题目 ID 或关键词搜索..."
							on:keydown={(e) => e.key === 'Enter' && addRelatedQuestion()}
						/>
						<button class="btn" on:click={addRelatedQuestion}>添加</button>
					</div>
					{#if relatedQuestions.length > 0}
						<div class="related-list">
							{#each relatedQuestions as rqId}
								{@const rq = $questions.find(q => q.id === rqId)}
								{#if rq}
									<div class="related-item">
										<span class="related-stem">{rq.stem.substring(0, 30)}...</span>
										<button class="remove-tag" on:click={() => removeRelated(rqId)}>
											<iconify-icon icon="mdi:close" style="font-size: 12px;"></iconify-icon>
										</button>
									</div>
								{/if}
							{/each}
						</div>
					{/if}
				</div>

				<div class="form-group">
					<label class="form-label">命题人</label>
					<div class="creator-display">{$currentUser}</div>
				</div>
			{/if}
		</div>

		<div class="preview-section">
			<div class="preview-header">
				<h3>实时预览</h3>
				<div class="toggle-group">
					<button
						class:active={showAnswer}
						on:click={() => showAnswer = true}
						class="toggle-btn"
					>
						有答案版
					</button>
					<button
						class:active={!showAnswer}
						on:click={() => showAnswer = false}
						class="toggle-btn"
					>
						无答案版
					</button>
				</div>
			</div>
			<div class="preview-content">
				<QuestionPreview question={previewQuestion} {showAnswer} />
			</div>
		</div>
	</div>
</div>

<style>
	.edit-page {
		padding: 24px;
		height: 100%;
		overflow-y: auto;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
	}

	.page-header h1 {
		margin: 0;
		font-size: 22px;
	}

	.header-actions {
		display: flex;
		gap: 8px;
	}

	.duplicate-warning {
		background: rgba(245, 158, 11, 0.1);
		border: 1px solid rgba(245, 158, 11, 0.3);
		border-radius: var(--border-radius);
		padding: 14px 16px;
		margin-bottom: 20px;
	}

	.warning-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 10px;
		font-weight: 500;
	}

	.warning-header .btn {
		margin-left: auto;
	}

	.duplicate-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.duplicate-item {
		display: flex;
		align-items: center;
		gap: 12px;
		background: white;
		padding: 8px 12px;
		border-radius: 6px;
	}

	.dup-similarity {
		font-weight: 600;
		color: var(--color-warning);
		font-size: 14px;
		min-width: 50px;
	}

	.dup-stem {
		flex: 1;
		font-size: 13px;
		color: var(--color-gray-700);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.edit-container {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 24px;
		align-items: start;
	}

	.form-section {
		background: white;
		border-radius: var(--border-radius);
		padding: 24px;
		box-shadow: var(--shadow-sm);
		border: 1px solid var(--color-gray-200);
	}

	.tabs {
		display: flex;
		gap: 4px;
		margin-bottom: 20px;
		border-bottom: 1px solid var(--color-gray-200);
	}

	.tabs button {
		padding: 10px 16px;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		cursor: pointer;
		font-size: 14px;
		color: var(--color-gray-500);
		margin-bottom: -1px;
	}

	.tabs button.active {
		border-bottom-color: var(--color-primary);
		color: var(--color-primary);
		font-weight: 500;
	}

	.hint {
		font-weight: normal;
		font-size: 12px;
		color: var(--color-gray-400);
		margin-left: 8px;
	}

	.toolbar {
		display: flex;
		gap: 4px;
		padding: 6px;
		background: var(--color-gray-50);
		border: 1px solid var(--color-gray-200);
		border-bottom: none;
		border-radius: var(--border-radius) var(--border-radius) 0 0;
	}

	.tool-btn {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		color: var(--color-gray-600);
	}

	.tool-btn:hover {
		background: var(--color-gray-200);
	}

	.divider {
		width: 1px;
		background: var(--color-gray-300);
		margin: 4px 6px;
	}

	.stem-textarea {
		border-top-left-radius: 0;
		border-top-right-radius: 0;
		font-family: inherit;
		line-height: 1.8;
	}

	.image-preview {
		position: relative;
		display: inline-block;
		margin-bottom: 10px;
	}

	.image-preview img {
		max-width: 200px;
		max-height: 150px;
		border-radius: 6px;
		border: 1px solid var(--color-gray-200);
	}

	.remove-img {
		position: absolute;
		top: -8px;
		right: -8px;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: var(--color-danger);
		color: white;
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.upload-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		background: var(--color-gray-50);
		border: 1px dashed var(--color-gray-300);
		border-radius: 6px;
		cursor: pointer;
		font-size: 13px;
		color: var(--color-gray-600);
	}

	.upload-btn:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
		background: rgba(59, 130, 246, 0.05);
	}

	.options-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.option-row {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.option-letter {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: var(--color-primary);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 12px;
		font-weight: 600;
		flex-shrink: 0;
	}

	.option-row input {
		flex: 1;
	}

	.option-img-btn {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		color: var(--color-gray-400);
		border-radius: 4px;
	}

	.option-img-btn:hover {
		background: var(--color-gray-100);
		color: var(--color-primary);
	}

	.remove-img-sm {
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		background: none;
		border: none;
		color: var(--color-gray-400);
	}

	.remove-img-sm:hover {
		color: var(--color-danger);
	}

	.option-image-preview {
		margin-left: 34px;
		margin-top: -4px;
	}

	.option-image-preview img {
		max-width: 100px;
		max-height: 60px;
		border-radius: 4px;
	}

	.difficulty-selector {
		display: flex;
		gap: 8px;
	}

	.star-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 10px 16px;
		background: var(--color-gray-50);
		border: 1px solid var(--color-gray-200);
		border-radius: 6px;
		cursor: pointer;
		color: var(--color-gray-400);
		font-size: 12px;
		transition: all 0.15s;
	}

	.star-btn.active {
		color: var(--color-warning);
		border-color: var(--color-warning);
		background: rgba(245, 158, 11, 0.05);
	}

	.star-btn iconify-icon {
		font-size: 20px;
	}

	.star-label {
		font-size: 11px;
	}

	.kp-selector {
		min-height: 42px;
		padding: 8px 12px;
		border: 1px solid var(--color-gray-300);
		border-radius: var(--border-radius);
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 8px;
		position: relative;
		background: white;
	}

	.kp-placeholder {
		color: var(--color-gray-400);
	}

	.selected-kps {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		flex: 1;
	}

	.remove-tag {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		color: inherit;
		display: inline-flex;
		align-items: center;
	}

	.dropdown-icon {
		color: var(--color-gray-400);
		flex-shrink: 0;
	}

	.kp-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		margin-top: 4px;
		background: white;
		border: 1px solid var(--color-gray-200);
		border-radius: var(--border-radius);
		box-shadow: var(--shadow-md);
		z-index: 100;
		max-height: 300px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.kp-search {
		border: none;
		border-bottom: 1px solid var(--color-gray-200);
		border-radius: 0;
	}

	.kp-tree {
		overflow-y: auto;
		padding: 4px;
	}

	.kp-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 10px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 13px;
	}

	.kp-item:hover {
		background: var(--color-gray-50);
	}

	.kp-item.selected {
		background: rgba(59, 130, 246, 0.1);
	}

	.kp-item span:not(.kp-hint) {
		flex: 1;
	}

	.kp-hint {
		font-size: 11px;
		color: var(--color-gray-400);
	}

	.related-input-row {
		display: flex;
		gap: 8px;
		margin-bottom: 10px;
	}

	.related-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.related-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 10px;
		background: var(--color-gray-50);
		border-radius: 4px;
		font-size: 13px;
	}

	.related-stem {
		flex: 1;
		color: var(--color-gray-700);
	}

	.creator-display {
		padding: 8px 12px;
		background: var(--color-gray-50);
		border-radius: 6px;
		color: var(--color-gray-700);
	}

	.preview-section {
		position: sticky;
		top: 24px;
	}

	.preview-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
	}

	.preview-header h3 {
		margin: 0;
		font-size: 16px;
	}

	.toggle-group {
		display: flex;
		border: 1px solid var(--color-gray-300);
		border-radius: 6px;
		overflow: hidden;
	}

	.toggle-btn {
		padding: 6px 12px;
		border: none;
		background: white;
		cursor: pointer;
		font-size: 12px;
		color: var(--color-gray-600);
	}

	.toggle-btn.active {
		background: var(--color-primary);
		color: white;
	}

	.preview-content {
		background: white;
		border-radius: var(--border-radius);
		box-shadow: var(--shadow-sm);
		border: 1px solid var(--color-gray-200);
	}

	@media (max-width: 1024px) {
		.edit-container {
			grid-template-columns: 1fr;
		}
		.preview-section {
			position: static;
		}
	}
</style>
