<script lang="ts">
	import { page } from '$app/stores';
	import QuestionForm from '$lib/components/QuestionForm.svelte';
</script>

<QuestionForm questionId={$page.params.id} />
