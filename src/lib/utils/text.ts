export function generateId(): string {
	return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function levenshteinDistance(s1: string, s2: string): number {
	const m = s1.length;
	const n = s2.length;
	const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

	for (let i = 0; i <= m; i++) dp[i][0] = i;
	for (let j = 0; j <= n; j++) dp[0][j] = j;

	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			if (s1[i - 1] === s2[j - 1]) {
				dp[i][j] = dp[i - 1][j - 1];
			} else {
				dp[i][j] = Math.min(
					dp[i - 1][j] + 1,
					dp[i][j - 1] + 1,
					dp[i - 1][j - 1] + 1
				);
			}
		}
	}
	return dp[m][n];
}

export function longestCommonSubstring(s1: string, s2: string): number {
	const m = s1.length;
	const n = s2.length;
	const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
	let maxLen = 0;

	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			if (s1[i - 1] === s2[j - 1]) {
				dp[i][j] = dp[i - 1][j - 1] + 1;
				maxLen = Math.max(maxLen, dp[i][j]);
			}
		}
	}
	return maxLen;
}

export function textSimilarity(s1: string, s2: string): number {
	const clean1 = s1.replace(/\s+/g, '').toLowerCase();
	const clean2 = s2.replace(/\s+/g, '').toLowerCase();

	if (clean1 === clean2) return 1;
	if (!clean1.length || !clean2.length) return 0;

	const lcsLen = longestCommonSubstring(clean1, clean2);
	const editDist = levenshteinDistance(clean1, clean2);
	const maxLen = Math.max(clean1.length, clean2.length);

	const lcsScore = lcsLen / maxLen;
	const editScore = 1 - editDist / maxLen;

	return lcsScore * 0.4 + editScore * 0.6;
}

export function keywordCount(text: string, keywords: string[]): number {
	let count = 0;
	const lowerText = text.toLowerCase();
	for (const kw of keywords) {
		if (!kw.trim()) continue;
		const re = new RegExp(kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
		const matches = lowerText.match(re);
		if (matches) count += matches.length;
	}
	return count;
}
