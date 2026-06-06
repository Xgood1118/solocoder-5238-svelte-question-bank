<script lang="ts">
	import { questions, knowledgeRoot, allCreators } from '$lib/stores';
	import { goto } from '$app/navigation';

	function countNodes(node: { children: unknown[] }): number {
		let count = 1;
		for (const child of node.children) {
			count += countNodes(child as { children: unknown[] });
		}
		return count;
	}
</script>

<div class="home-page">
	<div class="welcome-section">
		<h1>教研组题库管理系统</h1>
		<p class="subtitle">集中管理，高效组卷，让教研更轻松</p>
	</div>

	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-icon" style="background: rgba(59, 130, 246, 0.1);">
				<iconify-icon icon="mdi:format-list-bulleted" style="color: var(--color-primary); font-size: 28px;"></iconify-icon>
			</div>
			<div class="stat-info">
				<div class="stat-number">{$questions.length}</div>
				<div class="stat-label">题目总数</div>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon" style="background: rgba(16, 185, 129, 0.1);">
				<iconify-icon icon="mdi:tree" style="color: var(--color-success); font-size: 28px;"></iconify-icon>
			</div>
			<div class="stat-info">
				<div class="stat-number">{$knowledgeRoot.children.reduce((acc, c) => acc + countNodes(c), 0)}</div>
				<div class="stat-label">知识点数</div>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon" style="background: rgba(245, 158, 11, 0.1);">
				<iconify-icon icon="mdi:account-group" style="color: var(--color-warning); font-size: 28px;"></iconify-icon>
			</div>
			<div class="stat-info">
				<div class="stat-number">{$allCreators.length}</div>
				<div class="stat-label">命题教师</div>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon" style="background: rgba(239, 68, 68, 0.1);">
				<iconify-icon icon="mdi:lock" style="color: var(--color-danger); font-size: 28px;"></iconify-icon>
			</div>
			<div class="stat-info">
				<div class="stat-number">{$questions.filter(q => q.isLocked).length}</div>
				<div class="stat-label">已锁定题目</div>
			</div>
		</div>
	</div>

	<div class="quick-actions">
		<h2>快捷操作</h2>
		<div class="action-grid">
			<button class="action-card" on:click={() => goto('/questions/new')}>
				<iconify-icon icon="mdi:plus-circle" style="font-size: 36px; color: var(--color-primary);"></iconify-icon>
				<div class="action-title">录入题目</div>
				<div class="action-desc">添加新的题目到题库</div>
			</button>

			<button class="action-card" on:click={() => goto('/questions')}>
				<iconify-icon icon="mdi:magnify" style="font-size: 36px; color: var(--color-success);"></iconify-icon>
				<div class="action-title">浏览题目</div>
				<div class="action-desc">多维筛选，关键词搜索</div>
			</button>

			<button class="action-card" on:click={() => goto('/import')}>
				<iconify-icon icon="mdi:upload" style="font-size: 36px; color: var(--color-warning);"></iconify-icon>
				<div class="action-title">批量导入</div>
				<div class="action-desc">支持 JSON 和 CSV 格式</div>
			</button>

			<button class="action-card" on:click={() => goto('/knowledge')}>
				<iconify-icon icon="mdi:tree" style="font-size: 36px; color: #8b5cf6;"></iconify-icon>
				<div class="action-title">知识点管理</div>
				<div class="action-desc">树形结构，拖拽编辑</div>
			</button>
		</div>
	</div>

	<div class="feature-section">
		<h2>核心功能</h2>
		<div class="feature-grid">
			<div class="feature-item">
				<iconify-icon icon="mdi:eye" style="font-size: 24px; color: var(--color-primary);"></iconify-icon>
				<div>
					<h3>实时预览</h3>
					<p>录入时即可预览学生试卷效果，支持有答案/无答案切换</p>
				</div>
			</div>
			<div class="feature-item">
				<iconify-icon icon="mdi:sigma" style="font-size: 24px; color: var(--color-primary);"></iconify-icon>
				<div>
					<h3>公式渲染</h3>
					<p>KaTeX 数学公式渲染，支持行内公式和独立公式块</p>
				</div>
			</div>
			<div class="feature-item">
				<iconify-icon icon="mdi:content-duplicate" style="font-size: 24px; color: var(--color-primary);"></iconify-icon>
				<div>
					<h3>智能去重</h3>
					<p>基于编辑距离的文本相似度检测，避免重复录入</p>
				</div>
			</div>
			<div class="feature-item">
				<iconify-icon icon="mdi:filter-variant" style="font-size: 24px; color: var(--color-primary);"></iconify-icon>
				<div>
					<h3>多维筛选</h3>
					<p>知识点、难度、题型、命题人，支持级联筛选</p>
				</div>
			</div>
			<div class="feature-item">
				<iconify-icon icon="mdi:lock-clock" style="font-size: 24px; color: var(--color-primary);"></iconify-icon>
				<div>
					<h3>题目锁定</h3>
					<p>考试用过的题目自动锁定，防止重复使用</p>
				</div>
			</div>
			<div class="feature-item">
				<iconify-icon icon="mdi:history" style="font-size: 24px; color: var(--color-primary);"></iconify-icon>
				<div>
					<h3>版本历史</h3>
					<p>记录每次修改，支持回滚到历史版本</p>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.home-page {
		padding: 32px;
		max-width: 1200px;
		margin: 0 auto;
	}

	.welcome-section {
		text-align: center;
		margin-bottom: 40px;
	}

	.welcome-section h1 {
		font-size: 32px;
		margin: 0 0 8px 0;
		color: var(--color-gray-800);
	}

	.subtitle {
		font-size: 16px;
		color: var(--color-gray-500);
		margin: 0;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
		margin-bottom: 40px;
	}

	.stat-card {
		background: white;
		border-radius: var(--border-radius);
		padding: 20px;
		display: flex;
		align-items: center;
		gap: 16px;
		box-shadow: var(--shadow-sm);
		border: 1px solid var(--color-gray-100);
	}

	.stat-icon {
		width: 56px;
		height: 56px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.stat-number {
		font-size: 28px;
		font-weight: 700;
		color: var(--color-gray-800);
		line-height: 1.2;
	}

	.stat-label {
		font-size: 13px;
		color: var(--color-gray-500);
	}

	.quick-actions {
		margin-bottom: 40px;
	}

	.quick-actions h2,
	.feature-section h2 {
		font-size: 18px;
		margin: 0 0 16px 0;
		color: var(--color-gray-800);
	}

	.action-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
	}

	.action-card {
		background: white;
		border: 1px solid var(--color-gray-200);
		border-radius: var(--border-radius);
		padding: 24px;
		text-align: center;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}

	.action-card:hover {
		border-color: var(--color-primary);
		box-shadow: var(--shadow-md);
		transform: translateY(-2px);
	}

	.action-title {
		font-weight: 600;
		font-size: 15px;
		color: var(--color-gray-800);
	}

	.action-desc {
		font-size: 12px;
		color: var(--color-gray-500);
	}

	.feature-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 20px;
	}

	.feature-item {
		background: white;
		border-radius: var(--border-radius);
		padding: 20px;
		display: flex;
		gap: 14px;
		border: 1px solid var(--color-gray-100);
	}

	.feature-item h3 {
		margin: 0 0 4px 0;
		font-size: 15px;
		color: var(--color-gray-800);
	}

	.feature-item p {
		margin: 0;
		font-size: 13px;
		color: var(--color-gray-500);
		line-height: 1.6;
	}

	@media (max-width: 1024px) {
		.stats-grid,
		.action-grid {
			grid-template-columns: repeat(2, 1fr);
		}
		.feature-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
