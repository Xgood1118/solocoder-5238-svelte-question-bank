<script lang="ts">
	import '../app.css';
	import 'iconify-icon';
	import 'katex/dist/katex.min.css';
	import { page } from '$app/stores';
	import { currentUser, isGroupLeader } from '$lib/stores';
</script>

<div class="app-layout">
	<aside class="sidebar">
		<div class="logo">
			<iconify-icon icon="mdi:bookshelf" style="font-size: 24px; color: var(--color-primary);"></iconify-icon>
			<span>题库管理</span>
		</div>
		<nav class="nav">
			<a href="/" class:current={$page.url.pathname === '/'}>
				<iconify-icon icon="mdi:home"></iconify-icon>
				<span>首页</span>
			</a>
			<a href="/questions" class:current={$page.url.pathname === '/questions'}>
				<iconify-icon icon="mdi:format-list-bulleted"></iconify-icon>
				<span>题目列表</span>
			</a>
			<a href="/questions/new" class:current={$page.url.pathname === '/questions/new'}>
				<iconify-icon icon="mdi:plus-circle"></iconify-icon>
				<span>录入题目</span>
			</a>
			<a href="/import" class:current={$page.url.pathname === '/import'}>
				<iconify-icon icon="mdi:upload"></iconify-icon>
				<span>批量导入</span>
			</a>
			<a href="/knowledge" class:current={$page.url.pathname === '/knowledge'}>
				<iconify-icon icon="mdi:tree"></iconify-icon>
				<span>知识点管理</span>
			</a>
		</nav>
		<div class="sidebar-footer">
			<div class="user-info">
				<iconify-icon icon="mdi:account-circle" style="font-size: 20px;"></iconify-icon>
				<div>
					<div class="user-name">{$currentUser}</div>
					<div class="user-role">{#if $isGroupLeader}教研组长{:else}教师{/if}</div>
				</div>
			</div>
		</div>
	</aside>
	<main class="main">
		<slot />
	</main>
</div>

<style>
	.app-layout {
		display: flex;
		height: 100vh;
		overflow: hidden;
	}

	.sidebar {
		width: var(--sidebar-width);
		background: white;
		border-right: 1px solid var(--color-gray-200);
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 20px 20px;
		font-size: 18px;
		font-weight: 600;
		color: var(--color-gray-800);
		border-bottom: 1px solid var(--color-gray-100);
	}

	.nav {
		flex: 1;
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 2px;
		overflow-y: auto;
	}

	.nav a {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 14px;
		color: var(--color-gray-600);
		border-radius: 6px;
		transition: all 0.15s;
	}

	.nav a:hover {
		background: var(--color-gray-50);
		color: var(--color-gray-800);
		text-decoration: none;
	}

	.nav a.current {
		background: rgba(59, 130, 246, 0.1);
		color: var(--color-primary);
		font-weight: 500;
	}

	.nav iconify-icon {
		font-size: 18px;
	}

	.sidebar-footer {
		padding: 12px;
		border-top: 1px solid var(--color-gray-100);
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px;
	}

	.user-name {
		font-weight: 500;
		font-size: 13px;
	}

	.user-role {
		font-size: 11px;
		color: var(--color-gray-500);
	}

	.main {
		flex: 1;
		overflow-y: auto;
	}
</style>


