<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { ImportReport, Question } from '$lib/types';
	import { parseCSV, parseJSON, exportSkippedCSV } from '$lib/utils/importExport';
	import { addQuestion } from '$lib/stores';
	import QuestionPreview from '$lib/components/QuestionPreview.svelte';

	let isDragging: boolean = false;
	let importType: 'json' | 'csv' | null = null;
	let report: (ImportReport & { questions: Question[] }) | null = null;
	let importCompleted: boolean = false;
	let previewIndex: number = 0;
	let currentFile: File | null = null;

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave() {
		isDragging = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		const files = e.dataTransfer?.files;
		if (files && files.length > 0) {
			processFile(files[0]);
		}
	}

	function handleFileInput(e: Event) {
		const input = e.target as HTMLInputElement;
		const files = input.files;
		if (files && files.length > 0) {
			processFile(files[0]);
		}
	}

	function processFile(file: File) {
		currentFile = file;
		const ext = file.name.split('.').pop()?.toLowerCase();

		if (ext === 'json') {
			importType = 'json';
		} else if (ext === 'csv') {
			importType = 'csv';
		} else {
			alert('仅支持 JSON 和 CSV 格式文件');
			return;
		}

		const reader = new FileReader();
		reader.onload = (e) => {
			const buffer = e.target?.result as ArrayBuffer;
			if (!buffer) return;

			if (importType === 'csv') {
				report = parseCSV(buffer);
			} else {
				report = parseJSON(buffer);
			}
			importCompleted = false;
			previewIndex = 0;
		};
		reader.readAsArrayBuffer(file);
	}

	function confirmImport() {
		if (!report) return;

		for (const q of report.questions) {
			addQuestion(q);
		}

		importCompleted = true;
		alert(`导入完成！成功 ${report.success} 条，跳过 ${report.skipped} 条`);
	}

	function downloadSkipped() {
		if (!report || report.skippedItems.length === 0) return;

		const csvContent = exportSkippedCSV(report.skippedItems);
		const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = '导入失败条目.csv';
		a.click();
		URL.revokeObjectURL(url);
	}

	function downloadTemplate() {
		const template = `type,stem,option_a,option_b,option_c,option_d,answer,analysis,knowledge_points,difficulty,creator
choice,已知二次函数 $y = x^2$ 的图像开口方向是？,向上,向下,向左,向右,A,二次函数的一般形式 $y = ax^2 + bx + c$，当 $a > 0$ 时开口向上。,二次函数;图像与性质,2,张老师
fill,等差数列首项为 1，公差为 2，第 10 项是 ____。,,,,,19,$a_{10} = a_1 + 9d = 1 + 18 = 19$,等差数列,1,李老师`;

		const blob = new Blob(['\uFEFF' + template], { type: 'text/csv;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = '题目导入模板.csv';
		a.click();
		URL.revokeObjectURL(url);
	}

	function resetImport() {
		report = null;
		importType = null;
		importCompleted = false;
		currentFile = null;
		previewIndex = 0;
	}
</script>

<div class="import-page">
	<div class="page-header">
		<h1>批量导入</h1>
		<div class="header-actions">
			<button class="btn" on:click={downloadTemplate}>
				<iconify-icon icon="mdi:download"></iconify-icon>
				下载 CSV 模板
			</button>
			<button class="btn btn-primary" on:click={() => goto('/questions')}>
				返回列表
			</button>
		</div>
	</div>

	<div class="import-content">
		{#if !report}
			<div class="upload-section">
				<div
					class="drop-zone"
					class:dragover={isDragging}
					on:dragover={handleDragOver}
					on:dragleave={handleDragLeave}
					on:drop={handleDrop}
				>
					<iconify-icon icon="mdi:cloud-upload" style="font-size: 48px; margin-bottom: 12px;"></iconify-icon>
					<p style="font-size: 16px; margin: 0 0 8px 0; color: var(--color-gray-700);">拖拽文件到此处，或点击选择文件</p>
					<p style="font-size: 13px; margin: 0; color: var(--color-gray-500);">支持 JSON 和 CSV 格式，CSV 支持 GBK 和 UTF-8 BOM 编码</p>
					<label class="browse-btn">
						选择文件
						<input type="file" accept=".json,.csv" on:change={handleFileInput} hidden />
					</label>
				</div>

				<div class="format-info">
					<div class="info-card">
						<h3><iconify-icon icon="mdi:code-json"></iconify-icon> JSON 格式</h3>
						<p>支持单个题目对象或题目数组。</p>
						<pre>{`[
  {
    "type": "choice",
    "stem": "题目题干",
    "options": [
      {"label": "A", "content": "选项A"},
      {"label": "B", "content": "选项B"}
    ],
    "answer": "A",
    "analysis": "解析",
    "knowledgePoints": ["知识点1"],
    "difficulty": 3,
    "creator": "张老师"
  }
]`}</pre>
					</div>

					<div class="info-card">
						<h3><iconify-icon icon="mdi:table"></iconify-icon> CSV 格式</h3>
						<p>第一行可选择是否包含表头，系统会自动探测。</p>
						<p><strong>支持字段：</strong>type, stem, option_a, option_b, option_c, option_d, answer, analysis, knowledge_points, difficulty, creator</p>
						<p style="color: var(--color-warning);">
							<iconify-icon icon="mdi:information"></iconify-icon>
							提示：CSV 支持 GBK 编码和 UTF-8 BOM 编码，系统自动识别
						</p>
					</div>
				</div>
			</div>
		{:else}
			<div class="result-section">
				<div class="result-summary">
					<div class="summary-card success">
						<div class="summary-number">{report.success}</div>
						<div class="summary-label">成功导入</div>
					</div>
					<div class="summary-card skipped">
						<div class="summary-number">{report.skipped}</div>
						<div class="summary-label">跳过</div>
					</div>
					<div class="summary-file">
						<iconify-icon icon="mdi:file-document"></iconify-icon>
						<span>{currentFile?.name}</span>
						<span class="file-type">{importType?.toUpperCase()}</span>
					</div>
				</div>

				{#if report.questions.length > 0}
					<div class="preview-section">
						<div class="preview-header">
							<h3>题目预览</h3>
							<div class="preview-nav">
								<button
									class="btn btn-sm"
									disabled={previewIndex === 0}
									on:click={() => previewIndex--}
								>
									<iconify-icon icon="mdi:chevron-left"></iconify-icon>
									上一条
								</button>
								<span class="preview-count">{previewIndex + 1} / {report.questions.length}</span>
								<button
									class="btn btn-sm"
									disabled={previewIndex >= report.questions.length - 1}
									on:click={() => previewIndex++}
								>
									下一条
									<iconify-icon icon="mdi:chevron-right"></iconify-icon>
								</button>
							</div>
						</div>
						<div class="preview-card">
							<QuestionPreview question={report.questions[previewIndex]} showAnswer={true} />
						</div>
					</div>
				{/if}

				{#if report.skippedItems.length > 0}
					<div class="skipped-section">
						<div class="skipped-header">
							<h3>跳过的条目 ({report.skippedItems.length})</h3>
							<button class="btn btn-sm" on:click={downloadSkipped}>
								<iconify-icon icon="mdi:download"></iconify-icon>
								下载失败列表
							</button>
						</div>
						<div class="skipped-list">
							{#each report.skippedItems.slice(0, 10) as item}
								<div class="skipped-item">
									<span class="skip-row">第 {item.row} 行</span>
									<span class="skip-reason">{item.reason}</span>
								</div>
							{/each}
							{#if report.skippedItems.length > 10}
								<div class="skipped-more">... 还有 {report.skippedItems.length - 10} 条</div>
							{/if}
						</div>
					</div>
				{/if}

				<div class="action-bar">
					<button class="btn" on:click={resetImport}>
						<iconify-icon icon="mdi:refresh"></iconify-icon>
						重新导入
					</button>
					{#if !importCompleted}
						<button class="btn btn-primary" on:click={confirmImport} disabled={report.success === 0}>
							<iconify-icon icon="mdi:check"></iconify-icon>
							确认导入 {report.success} 条题目
						</button>
					{:else}
						<button class="btn btn-success" disabled>
							<iconify-icon icon="mdi:check-circle"></iconify-icon>
							已导入
						</button>
						<button class="btn btn-primary" on:click={() => goto('/questions')}>
							去题目列表看看
						</button>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.import-page {
		padding: 24px;
		max-width: 960px;
		margin: 0 auto;
		height: 100%;
		overflow-y: auto;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 24px;
	}

	.page-header h1 {
		margin: 0;
		font-size: 22px;
	}

	.header-actions {
		display: flex;
		gap: 8px;
	}

	.upload-section {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.drop-zone {
		text-align: center;
		padding: 60px 20px;
	}

	.browse-btn {
		display: inline-block;
		margin-top: 16px;
		padding: 10px 24px;
		background: var(--color-primary);
		color: white;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 500;
	}

	.browse-btn:hover {
		background: var(--color-primary-dark);
	}

	.format-info {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}

	.info-card {
		background: white;
		border-radius: var(--border-radius);
		padding: 20px;
		border: 1px solid var(--color-gray-200);
	}

	.info-card h3 {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0 0 12px 0;
		font-size: 15px;
		color: var(--color-gray-800);
	}

	.info-card p {
		margin: 0 0 10px 0;
		font-size: 13px;
		color: var(--color-gray-600);
		line-height: 1.6;
	}

	.info-card pre {
		background: var(--color-gray-50);
		padding: 12px;
		border-radius: 6px;
		font-size: 12px;
		overflow-x: auto;
		margin: 0;
		line-height: 1.6;
		color: var(--color-gray-700);
	}

	.result-section {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.result-summary {
		display: flex;
		gap: 16px;
		align-items: center;
	}

	.summary-card {
		background: white;
		border-radius: var(--border-radius);
		padding: 20px 28px;
		text-align: center;
		min-width: 120px;
		border: 1px solid var(--color-gray-200);
	}

	.summary-card.success .summary-number {
		color: var(--color-success);
	}

	.summary-card.skipped .summary-number {
		color: var(--color-warning);
	}

	.summary-number {
		font-size: 36px;
		font-weight: 700;
		line-height: 1.2;
	}

	.summary-label {
		font-size: 13px;
		color: var(--color-gray-500);
		margin-top: 4px;
	}

	.summary-file {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 10px;
		color: var(--color-gray-600);
		font-size: 14px;
	}

	.file-type {
		background: var(--color-gray-100);
		padding: 2px 8px;
		border-radius: 4px;
		font-size: 12px;
	}

	.preview-section,
	.skipped-section {
		background: white;
		border-radius: var(--border-radius);
		padding: 20px;
		border: 1px solid var(--color-gray-200);
	}

	.preview-header,
	.skipped-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16px;
	}

	.preview-header h3,
	.skipped-header h3 {
		margin: 0;
		font-size: 15px;
	}

	.preview-nav {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.preview-count {
		font-size: 13px;
		color: var(--color-gray-500);
		min-width: 60px;
		text-align: center;
	}

	.preview-card {
		background: var(--color-gray-50);
		padding: 16px;
		border-radius: 6px;
	}

	.skipped-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.skipped-item {
		display: flex;
		gap: 12px;
		padding: 8px 12px;
		background: var(--color-gray-50);
		border-radius: 4px;
		font-size: 13px;
	}

	.skip-row {
		color: var(--color-gray-500);
		min-width: 60px;
	}

	.skip-reason {
		color: var(--color-danger);
		flex: 1;
	}

	.skipped-more {
		text-align: center;
		color: var(--color-gray-400);
		font-size: 12px;
		padding: 8px;
	}

	.action-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: 8px;
	}

	.action-bar .btn-primary {
		padding: 10px 24px;
	}

	.btn-success {
		background: var(--color-success);
		color: white;
		border-color: var(--color-success);
	}

	@media (max-width: 768px) {
		.format-info {
			grid-template-columns: 1fr;
		}
		.result-summary {
			flex-wrap: wrap;
		}
	}
</style>
